import { CONFIG } from '../games/asteroides/configuracion.js';

/**
 * Sistema de Inteligencia Artificial Adaptativa
 * Analiza el desempeño del jugador y ajusta la dificultad dinámicamente
 */

export class SistemaIA {
    constructor() {
        // Historial de desempeño
        this.historialRespuestas = [];
        this.tiemposRespuesta = [];
        this.patronesError = {
            suma: 0,
            resta: 0,
            multiplicacion: 0,
            division: 0
        };

        // Métricas actuales
        this.metricas = {
            precisionActual: 1.0,
            tiempoPromedioRespuesta: 0,
            velocidadAprendizaje: 0,
            operacionMasDificil: null,
            racha: 0,
            rachaMaxima: 0
        };

        // Estado del jugador
        this.perfilJugador = {
            nivelHabilidad: 'principiante', // principiante, intermedio, avanzado
            estiloJuego: 'equilibrado', // rapido, preciso, equilibrado
            necesitaAyuda: false,
            motivacion: 'alta' // alta, media, baja
        };

        // Recomendaciones activas
        this.recomendaciones = [];
        this.ultimaEvaluacion = 0;

    }

    /**
     * Registra una respuesta del jugador
     */
    registrarRespuesta(esCorrecta, tipoOperacion, tiempoRespuesta) {
        const registro = {
            correcta: esCorrecta,
            operacion: tipoOperacion,
            tiempo: tiempoRespuesta,
            timestamp: Date.now()
        };

        this.historialRespuestas.push(registro);
        this.tiemposRespuesta.push(tiempoRespuesta);

        // Mantener solo las últimas 20 respuestas
        if (this.historialRespuestas.length > 20) {
            this.historialRespuestas.shift();
            this.tiemposRespuesta.shift();
        }

        // Actualizar patrones de error
        if (!esCorrecta) {
            this.patronesError[tipoOperacion]++;
            this.metricas.racha = 0;
        } else {
            this.metricas.racha++;
            this.metricas.rachaMaxima = Math.max(this.metricas.racha, this.metricas.rachaMaxima);
        }

        // Evaluar cada cierto número de respuestas
        if (this.historialRespuestas.length >= CONFIG.IA.INTERVALO_EVALUACION) {
            this.evaluarDesempeno();
        }
    }

    /**
     * Evalua el desempeño del jugador y genera recomendaciones
     */
    evaluarDesempeno() {
        this.calcularMetricas();
        this.identificarPerfilJugador();
        this.generarRecomendaciones();
        this.ultimaEvaluacion = this.historialRespuestas.length;
    }

    /**
     * Calcula métricas de desempeño
     */
    calcularMetricas() {
        if (this.historialRespuestas.length === 0) return;

        // Calcular precisión reciente (últimas 10 respuestas)
        const respuestasRecientes = this.historialRespuestas.slice(-10);
        const aciertos = respuestasRecientes.filter(r => r.correcta).length;
        this.metricas.precisionActual = aciertos / respuestasRecientes.length;

        // Calcular tiempo promedio de respuesta
        const tiemposRecientes = this.tiemposRespuesta.slice(-10);
        this.metricas.tiempoPromedioRespuesta =
            tiemposRecientes.reduce((a, b) => a + b, 0) / tiemposRecientes.length;

        // Identificar operación más difícil
        let maxErrores = 0;
        let operacionDificil = null;
        for (const [operacion, errores] of Object.entries(this.patronesError)) {
            if (errores > maxErrores) {
                maxErrores = errores;
                operacionDificil = operacion;
            }
        }
        this.metricas.operacionMasDificil = maxErrores >= CONFIG.IA.UMBRAL_OPERACION_DIFICIL ?
            operacionDificil : null;

        // Calcular velocidad de aprendizaje (mejora en precisión)
        if (this.historialRespuestas.length >= 10) {
            const primerasMitad = this.historialRespuestas.slice(0, Math.floor(this.historialRespuestas.length / 2));
            const segundaMitad = this.historialRespuestas.slice(Math.floor(this.historialRespuestas.length / 2));

            const precisionInicial = primerasMitad.filter(r => r.correcta).length / primerasMitad.length;
            const precisionFinal = segundaMitad.filter(r => r.correcta).length / segundaMitad.length;

            this.metricas.velocidadAprendizaje = precisionFinal - precisionInicial;
        }
    }

    /**
     * Identifica el perfil del jugador
     */
    identificarPerfilJugador() {
        // Determinar nivel de habilidad
        if (this.metricas.precisionActual >= CONFIG.IA.PRECISION_ALTA) {
            this.perfilJugador.nivelHabilidad = 'avanzado';
        } else if (this.metricas.precisionActual >= CONFIG.IA.PRECISION_BAJA) {
            this.perfilJugador.nivelHabilidad = 'intermedio';
        } else {
            this.perfilJugador.nivelHabilidad = 'principiante';
        }

        // Determinar estilo de juego
        if (this.metricas.tiempoPromedioRespuesta < CONFIG.IA.TIEMPO_RAPIDO &&
            this.metricas.precisionActual >= 0.7) {
            this.perfilJugador.estiloJuego = 'rapido';
        } else if (this.metricas.precisionActual >= CONFIG.IA.PRECISION_ALTA &&
            this.metricas.tiempoPromedioRespuesta > CONFIG.IA.TIEMPO_RAPIDO) {
            this.perfilJugador.estiloJuego = 'preciso';
        } else {
            this.perfilJugador.estiloJuego = 'equilibrado';
        }

        // Determinar si necesita ayuda
        this.perfilJugador.necesitaAyuda = this.metricas.precisionActual < CONFIG.IA.PRECISION_BAJA;

        // Determinar motivación
        if (this.metricas.velocidadAprendizaje > 0.1) {
            this.perfilJugador.motivacion = 'alta';
        } else if (this.metricas.velocidadAprendizaje < -0.1) {
            this.perfilJugador.motivacion = 'baja';
        } else {
            this.perfilJugador.motivacion = 'media';
        }
    }

    /**
     * Genera recomendaciones personalizadas
     */
    generarRecomendaciones() {
        this.recomendaciones = [];

        // Recomendación por nivel de habilidad
        if (this.perfilJugador.nivelHabilidad === 'avanzado') {
            this.recomendaciones.push({
                tipo: 'dificultad',
                accion: 'aumentar',
                mensaje: '¡Excelente desempeño! La dificultad aumentará.',
                prioridad: 'alta'
            });
        } else if (this.perfilJugador.nivelHabilidad === 'principiante') {
            this.recomendaciones.push({
                tipo: 'dificultad',
                accion: 'reducir',
                mensaje: 'Reduciendo dificultad para mejor experiencia.',
                prioridad: 'alta'
            });
        }

        // Recomendación por operación difícil
        if (this.metricas.operacionMasDificil) {
            this.recomendaciones.push({
                tipo: 'practica',
                operacion: this.metricas.operacionMasDificil,
                mensaje: `Considera practicar más ${this.obtenerNombreOperacion(this.metricas.operacionMasDificil)}.`,
                prioridad: 'media'
            });
        }

        // Recomendación por estilo de juego
        if (this.perfilJugador.estiloJuego === 'rapido' && this.metricas.precisionActual < 0.8) {
            this.recomendaciones.push({
                tipo: 'estrategia',
                mensaje: '¡Tómate tu tiempo! La precisión es más importante que la velocidad.',
                prioridad: 'media'
            });
        }

        // Mensajes motivacionales
        if (this.metricas.racha >= CONFIG.IA.MOSTRAR_MOTIVACION_TRAS_ACIERTOS) {
            this.recomendaciones.push({
                tipo: 'motivacion',
                mensaje: `¡Increíble racha de ${this.metricas.racha}! ¡Sigue así!`,
                prioridad: 'baja'
            });
        }

        // Ayuda si tiene dificultades
        if (this.perfilJugador.necesitaAyuda && this.perfilJugador.motivacion === 'baja') {
            this.recomendaciones.push({
                tipo: 'ayuda',
                mensaje: '¡No te rindas! Cada error es una oportunidad de aprender.',
                prioridad: 'alta'
            });
        }
    }

    /**
     * Obtiene ajustes de dificultad basados en el análisis
     */
    obtenerAjustesDificultad() {
        const ajustes = {
            velocidad: 1.0,
            cantidadAsteroides: 0,
            rangoNumerico: 1.0,
            aplicarCambio: false
        };

        // Ajustar según precisión
        if (this.metricas.precisionActual >= CONFIG.IA.PRECISION_ALTA) {
            ajustes.velocidad = CONFIG.IA.AJUSTE_VELOCIDAD_DIFICIL;
            ajustes.cantidadAsteroides = CONFIG.IA.AJUSTE_ASTEROIDES_DIFICIL;
            ajustes.aplicarCambio = true;
        } else if (this.metricas.precisionActual < CONFIG.IA.PRECISION_BAJA) {
            ajustes.velocidad = CONFIG.IA.AJUSTE_VELOCIDAD_FACIL;
            ajustes.cantidadAsteroides = CONFIG.IA.AJUSTE_ASTEROIDES_FACIL;
            ajustes.aplicarCambio = true;
        }

        // Ajustar según tiempo de respuesta
        if (this.metricas.tiempoPromedioRespuesta < CONFIG.IA.TIEMPO_RAPIDO &&
            this.metricas.precisionActual >= 0.8) {
            ajustes.rangoNumerico = 1.2; // Números más grandes
            ajustes.aplicarCambio = true;
        }

        return ajustes;
    }

    /**
     * Obtiene una recomendación prioritaria para mostrar
     */
    obtenerRecomendacionActual() {
        // Ordenar por prioridad
        const prioridades = { alta: 3, media: 2, baja: 1 };
        const recomendacionesOrdenadas = [...this.recomendaciones].sort((a, b) => {
            return prioridades[b.prioridad] - prioridades[a.prioridad];
        });

        return recomendacionesOrdenadas[0] || null;
    }

    /**
     * Obtiene estadísticas detalladas para visualización
     */
    obtenerEstadisticasIA() {
        return {
            precision: Math.round(this.metricas.precisionActual * 100),
            tiempoPromedio: Math.round(this.metricas.tiempoPromedioRespuesta / 1000),
            nivelHabilidad: this.perfilJugador.nivelHabilidad,
            estiloJuego: this.perfilJugador.estiloJuego,
            rachaActual: this.metricas.racha,
            rachaMaxima: this.metricas.rachaMaxima,
            operacionDificil: this.metricas.operacionMasDificil,
            totalRespuestas: this.historialRespuestas.length,
            mejorando: this.metricas.velocidadAprendizaje > 0
        };
    }

    /**
     * Predice el siguiente nivel de dificultad apropiado
     */
    predecirNivelApropiado(nivelActual) {
        if (this.perfilJugador.nivelHabilidad === 'avanzado' &&
            this.metricas.precisionActual >= CONFIG.IA.PRECISION_ALTA) {
            return Math.min(nivelActual + 1, CONFIG.NIVELES.NIVEL_MAX);
        } else if (this.perfilJugador.nivelHabilidad === 'principiante' &&
            this.metricas.precisionActual < CONFIG.IA.PRECISION_BAJA) {
            return Math.max(nivelActual, 1);
        }
        return nivelActual;
    }

    /**
     * Obtiene nombre descriptivo de una operación
     */
    obtenerNombreOperacion(tipo) {
        const nombres = {
            suma: 'sumas',
            resta: 'restas',
            multiplicacion: 'multiplicaciones',
            division: 'divisiones'
        };
        return nombres[tipo] || tipo;
    }

    /**
     * Reinicia el sistema IA
     */
    reiniciar() {
        this.historialRespuestas = [];
        this.tiemposRespuesta = [];
        this.patronesError = {
            suma: 0,
            resta: 0,
            multiplicacion: 0,
            division: 0
        };
        this.metricas = {
            precisionActual: 1.0,
            tiempoPromedioRespuesta: 0,
            velocidadAprendizaje: 0,
            operacionMasDificil: null,
            racha: 0,
            rachaMaxima: 0
        };
        this.perfilJugador = {
            nivelHabilidad: 'principiante',
            estiloJuego: 'equilibrado',
            necesitaAyuda: false,
            motivacion: 'alta'
        };
        this.recomendaciones = [];
        this.ultimaEvaluacion = 0;
    }
}
