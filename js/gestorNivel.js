/**
 * Gestor de niveles y dificultad
 * Principio SOLID: Single Responsibility - Solo maneja progresión de niveles
 */

class GestorNivel {
    constructor() {
        this.nivel = 1;
        this.puntos = 0;
        this.aciertos = 0;
        this.fallos = 0;
        this.fallosConsecutivos = 0; // Contador de fallos consecutivos
        this.vidas = CONFIG.VIDAS.INICIAL;
        this.velocidadAsteroides = CONFIG.ASTEROIDE.VELOCIDAD_INICIAL;
        this.cantidadAsteroides = CONFIG.ASTEROIDE.CANTIDAD_INICIAL;
        this.multiplicadorPuntos = 1;
        this.tiempoMultiplicador = 0;
    }

    /**
     * Suma puntos y verifica si sube de nivel
     */
    sumarPuntos(cantidad) {
        const puntosReales = Math.floor(cantidad * this.multiplicadorPuntos);
        this.puntos += puntosReales;
        
        const nuevoNivel = Math.floor(this.puntos / CONFIG.NIVELES.PUNTOS_POR_NIVEL) + 1;
        
        if (nuevoNivel > this.nivel && this.nivel < CONFIG.NIVELES.NIVEL_MAX) {
            this.nivel = nuevoNivel;
            this.actualizarDificultad();
            return true; // Indica que subió de nivel
        }
        
        return false;
    }

    /**
     * Registra un fallo y aumenta dificultad
     */
    registrarFallo() {
        this.fallos++;
        this.fallosConsecutivos++;
        
        // Cada 2 fallos, se pierde una vida
        if (this.fallosConsecutivos >= 2) {
            this.perderVida();
            this.fallosConsecutivos = 0; // Reiniciar contador
        }
        
        this.aumentarVelocidad();
    }

    /**
     * Registra un acierto
     */
    registrarAcierto() {
        this.aciertos++;
        // Reiniciar contador de fallos consecutivos al acertar
        this.fallosConsecutivos = 0;
    }

    /**
     * Pierde una vida
     */
    perderVida() {
        if (this.vidas > 0) {
            this.vidas--;
        }
        return this.vidas;
    }

    /**
     * Gana una vida
     */
    ganarVida() {
        if (this.vidas < CONFIG.VIDAS.MAXIMA) {
            this.vidas++;
        }
    }

    /**
     * Verifica si el juego ha terminado
     */
    juegoTerminado() {
        return this.vidas <= 0;
    }

    /**
     * Aumenta la velocidad de los asteroides
     */
    aumentarVelocidad() {
        this.velocidadAsteroides = Math.min(
            this.velocidadAsteroides + CONFIG.ASTEROIDE.INCREMENTO_VELOCIDAD,
            CONFIG.ASTEROIDE.VELOCIDAD_MAX
        );
    }

    /**
     * Actualiza la dificultad según el nivel
     */
    actualizarDificultad() {
        // Aumentar velocidad base
        this.velocidadAsteroides = Math.min(
            CONFIG.ASTEROIDE.VELOCIDAD_INICIAL + (this.nivel - 1) * 0.5,
            CONFIG.ASTEROIDE.VELOCIDAD_MAX
        );

        // Aumentar cantidad de asteroides
        this.cantidadAsteroides = Math.min(
            CONFIG.ASTEROIDE.CANTIDAD_INICIAL + Math.floor((this.nivel - 1) / 2),
            CONFIG.ASTEROIDE.CANTIDAD_MAXIMA
        );
    }

    /**
     * Activa multiplicador de puntos
     */
    activarMultiplicador(multiplicador = 2, duracion = 600) {
        this.multiplicadorPuntos = multiplicador;
        this.tiempoMultiplicador = duracion;
    }

    /**
     * Actualiza el multiplicador de puntos
     */
    actualizarMultiplicador() {
        if (this.tiempoMultiplicador > 0) {
            this.tiempoMultiplicador--;
            if (this.tiempoMultiplicador <= 0) {
                this.multiplicadorPuntos = 1;
            }
        }
    }

    /**
     * Ralentiza los asteroides temporalmente
     */
    ralentizarAsteroides(duracion = 600) {
        const velocidadOriginal = this.velocidadAsteroides;
        this.velocidadAsteroides *= 0.5;
        
        setTimeout(() => {
            this.velocidadAsteroides = velocidadOriginal;
        }, duracion * 16.67); // Convertir frames a ms
    }

    /**
     * Obtiene estadísticas del jugador
     */
    obtenerEstadisticas() {
        const total = this.aciertos + this.fallos;
        const precision = total > 0 ? Math.round((this.aciertos / total) * 100) : 0;
        
        return {
            nivel: this.nivel,
            puntos: this.puntos,
            aciertos: this.aciertos,
            fallos: this.fallos,
            vidas: this.vidas,
            precision: precision,
            velocidad: this.obtenerNombreVelocidad()
        };
    }

    /**
     * Obtiene el nombre descriptivo de la velocidad
     */
    obtenerNombreVelocidad() {
        if (this.velocidadAsteroides < 2) return 'Normal';
        if (this.velocidadAsteroides < 3) return 'Rápida';
        if (this.velocidadAsteroides < 4) return 'Muy Rápida';
        return 'Extrema';
    }

    /**
     * Reinicia el gestor de nivel
     */
    reiniciar() {
        this.nivel = 1;
        this.puntos = 0;
        this.aciertos = 0;
        this.fallos = 0;
        this.fallosConsecutivos = 0;
        this.vidas = CONFIG.VIDAS.INICIAL;
        this.velocidadAsteroides = CONFIG.ASTEROIDE.VELOCIDAD_INICIAL;
        this.cantidadAsteroides = CONFIG.ASTEROIDE.CANTIDAD_INICIAL;
        this.multiplicadorPuntos = 1;
        this.tiempoMultiplicador = 0;
    }
}
