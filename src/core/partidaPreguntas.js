/**
 * Modelo común de las partidas "una pregunta tras otra" (Asteroides, Atrapa la Ortografía…).
 * Sin DOM ni canvas. Cada juego aporta solo lo que cambia: sus habilidades, cómo se genera una pregunta
 * y los ajustes de cada ronda (cuántas opciones, qué tan rápido).
 *
 * Reglas pensadas para niños:
 *  - NO hay vidas ni "game over": cada partida tiene un número fijo de preguntas y siempre termina.
 *  - Equivocarse no resta ni acelera nada: se muestra una pista y se puede reintentar.
 *  - Cada pregunta cuenta UNA vez: acierto (a la primera) o fallo (hubo error o se escapó la respuesta).
 *    Por eso aciertos + fallos = preguntas, y las estrellas reflejan la precisión.
 *  - Acertar después de equivocarse da la mitad de puntos: se premia no rendirse.
 *  - Una pregunta fallada que el niño después resuelve es «recuperada»: cuenta para las estrellas (ver resultado.js).
 *  - ALIVIO: tras 2 preguntas falladas seguidas, la siguiente baja un nivel (y el juego puede ir más despacio):
 *    no se sigue insistiendo con algo que el niño no puede.
 *  - MISIÓN DE INICIO (`colocacion`): en vez de preguntas del grado, sube y baja de grado de contenido para hallar
 *    dónde empezar (ver adaptativo/colocacion.js). No toca el motor adaptativo: solo mide.
 *
 * Contrato de una pregunta (lo que devuelve `generar`):
 *   { habilidad, respuesta, textoRespuesta, pista, opciones:[{id, texto}], explicacion? , ...lo que quiera el juego }
 *   `respuesta` es el `id` de la opción correcta.
 */
import { MotorAdaptativo } from '../adaptativo/motor.js';
import { avanzarEscalon, gradoInicialColocacion, PREGUNTAS_COLOCACION } from '../adaptativo/colocacion.js';
import { construirLeccion } from '../lecciones/index.js';
import { crearAleatorioSembrado } from './aleatorio.js';

export const PREGUNTAS_POR_PARTIDA = 10;
export const PUNTOS_ACIERTO = 10;
export const PUNTOS_RECUPERADO = 5;
export const BONUS_RACHA = 5;
export const RACHA_PARA_BONUS = 3;
export const ERRORES_PARA_ALIVIO = 2;
export const OTRA_EQUIVOCACION = 'otra equivocación';
export const SE_ESCAPO = 'se le escapó el asteroide o la palabra';

export class PartidaPreguntas {
    /**
     * @param {Object} p
     * @param {number} p.grado                          ya acotado por el juego
     * @param {Object<string,{nivelMax:number}>} p.habilidades   habilidades de ese grado (para el motor)
     * @param {Function} p.generar                      ({grado, habilidad, nivel, aleatorio, ...ajustes}) → pregunta
     * @param {Function} [p.preparar]                   (grado, nivel) → ajustes de la ronda (se pasan a `generar` y se devuelven)
     * @param {Object|null} [p.habilidadesGuardadas]    instantánea previa del motor (del perfil)
     * @param {Function} [p.aleatorio]
     * @param {number} [p.total]
     * @param {Object|null} [p.colocacion]  misión de inicio: {gradoMin, gradoMax, gradoInicial?, habilidadesDeGrado(g)}
     * @param {Function|null} [p.leccion]   (gemela) => Leccion|null: lección PROPIA de la habilidad (si no, se usa el ejemplo resuelto)
     * @param {Object} [p.nombresHabilidad] { habilidad: 'nombre legible' } para los títulos de las lecciones
     */
    constructor({
        grado, habilidades, generar, preparar = () => ({}), habilidadesGuardadas = null, aleatorio = Math.random,
        total, colocacion = null, leccion = null, nombresHabilidad = {}
    }) {
        this.grado = grado;
        this.aleatorio = aleatorio;
        this.colocacion = colocacion;
        this.leccionPropia = leccion;
        this.nombresHabilidad = nombresHabilidad;
        this.total = total ?? (colocacion ? PREGUNTAS_COLOCACION : PREGUNTAS_POR_PARTIDA);
        if (colocacion) {
            this.escalon = {
                grado: colocacion.gradoInicial ?? gradoInicialColocacion(colocacion.gradoMin, colocacion.gradoMax),
                aciertosSeguidos: 0, erroresSeguidos: 0
            };
        }
        this.generar = generar;
        this.preparar = preparar;
        this.motor = new MotorAdaptativo(habilidades);
        if (habilidadesGuardadas) this.motor.importar(habilidadesGuardadas);

        this.numero = 0;
        this.aciertos = 0;
        this.fallos = 0;
        this.recuperadas = 0;
        this.erroresSeguidos = 0;  // preguntas falladas (a la primera) una tras otra: activa el alivio
        this.puntaje = 0;
        this.racha = 0;
        this.rachaMaxima = 0;

        this.errores = new Map(); // «habilidad\u0000tipo» → veces: qué confunde el niño (ver resultado.js → limpiarErrores)

        this.pregunta = null;
        this.huboError = false;
        this.resuelta = true;      // true = no hay pregunta en juego
        this.inicioPregunta = 0;
    }

    get hayMasPreguntas() {
        return this.numero < this.total;
    }

    /**
     * Empieza la siguiente pregunta. @param {number} ahoraMs tiempo de JUEGO (no de reloj: respeta la pausa).
     * @returns {{pregunta:Object, nivel:number}|null}  (más los ajustes de `preparar`); null si ya no quedan
     */
    iniciarPregunta(ahoraMs = 0) {
        if (!this.hayMasPreguntas) return null;
        this.numero++;

        let grado = this.grado;
        let habilidad;
        let nivel;
        let alivio = false;
        if (this.colocacion) {
            // Misión de inicio: el grado de contenido lo marca la escalera y el nivel es el intermedio
            grado = this.escalon.grado;
            const nombres = Object.keys(this.colocacion.habilidadesDeGrado(grado));
            habilidad = nombres[Math.floor(this.aleatorio() * nombres.length)];
            nivel = 2;
        } else {
            habilidad = this.motor.elegirHabilidad(this.aleatorio);
            nivel = this.motor.nivel(habilidad);
            alivio = this.erroresSeguidos >= ERRORES_PARA_ALIVIO;
            if (alivio) nivel = Math.max(1, nivel - 1);
        }
        const ajustes = this.preparar(grado, nivel, { alivio });
        this.pregunta = this.generar({ grado, habilidad, nivel, aleatorio: this.aleatorio, ...ajustes });
        this.contextoPregunta = { grado, nivel };
        this.huboError = false;
        this.resuelta = false;
        this.inicioPregunta = ahoraMs;
        return { pregunta: this.pregunta, nivel, alivio, ...ajustes };
    }

    // ---------- Lecciones ----------

    /**
     * Pregunta GEMELA: misma habilidad, un nivel más fácil (mínimo 1) y otros datos. Sirve de ejemplo resuelto
     * sin regalar la respuesta de la pregunta que el niño tiene delante.
     */
    gemela(pregunta = this.pregunta, aleatorio = this.aleatorio) {
        const { grado, nivel } = this.contextoPregunta || { grado: this.grado, nivel: 1 };
        const ajustes = this.preparar(grado, Math.max(1, nivel - 1), { alivio: false });
        const clave = (q) => `${q.enunciado}|${q.textoRespuesta}`;
        let candidata = null;
        for (let intento = 0; intento < 8; intento++) {
            candidata = this.generar({ grado, habilidad: pregunta.habilidad, nivel: Math.max(1, nivel - 1), aleatorio, ...ajustes });
            if (clave(candidata) !== clave(pregunta)) return candidata;
        }
        return candidata;
    }

    /** Lección para «Ver cómo se hace» (tras equivocarse): ejemplo resuelto de otra pregunta de la misma habilidad. */
    leccionPara(pregunta = this.pregunta) {
        return construirLeccion({
            gemela: this.gemela(pregunta),
            propia: this.leccionPropia,
            titulo: this.nombresHabilidad[pregunta.habilidad] ? `Un ejemplo de ${this.nombresHabilidad[pregunta.habilidad]}` : undefined
        });
    }

    /**
     * Lección de introducción de una habilidad (la primera vez que aparece). Siempre usa el mismo ejemplo para una
     * habilidad dada (aleatorio sembrado con su nombre): así la explicación es estable.
     */
    leccionIntro(habilidad) {
        const semilla = [...habilidad].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
        const nivel = 1;
        const grado = this.contextoPregunta ? this.contextoPregunta.grado : this.grado;
        const az = crearAleatorioSembrado(semilla);
        const gemela = this.generar({ grado, habilidad, nivel, aleatorio: az, ...this.preparar(grado, nivel, { alivio: false }) });
        return construirLeccion({
            gemela,
            propia: this.leccionPropia,
            titulo: this.nombresHabilidad[habilidad] ? `Un ejemplo de ${this.nombresHabilidad[habilidad]}` : undefined,
            prefijoTitulo: 'Antes de empezar: '
        });
    }

    /**
     * El niño eligió la opción con ese `id`.
     * @param {number} id
     * @param {{ahoraMs?:number, multiplicador?:number}} [opciones]
     * @returns {{tipo:'correcta', primerIntento:boolean, puntos:number, cambioNivel:string|null, habilidad:string, explicacion:string|null}
     *          |{tipo:'incorrecta', pista:string}|{tipo:'ignorada'}}
     */
    responder(id, { ahoraMs = 0, multiplicador = 1 } = {}) {
        if (this.resuelta || !this.pregunta) return { tipo: 'ignorada' };
        const { habilidad } = this.pregunta;
        const tiempo = ahoraMs - this.inicioPregunta;

        if (id !== this.pregunta.respuesta) {
            const elegida = (this.pregunta.opciones || []).find((o) => o.id === id);
            this.contarEquivocacion(habilidad, elegida && elegida.error ? elegida.error : OTRA_EQUIVOCACION);
            this.registrarErrorSiEsElPrimero(tiempo);
            return { tipo: 'incorrecta', pista: this.pregunta.pista };
        }

        this.resuelta = true;
        const primerIntento = !this.huboError;
        let cambioNivel = null;
        let puntos;
        if (primerIntento) {
            this.aciertos++;
            this.racha++;
            this.rachaMaxima = Math.max(this.rachaMaxima, this.racha);
            this.erroresSeguidos = 0;
            if (this.colocacion) this.subirOBajarEscalon(true);
            else cambioNivel = this.motor.registrar(habilidad, true, tiempo).cambio;
            const bonus = this.racha >= RACHA_PARA_BONUS ? BONUS_RACHA : 0;
            puntos = (PUNTOS_ACIERTO + bonus) * multiplicador;
        } else {
            this.recuperadas++;
            puntos = PUNTOS_RECUPERADO * multiplicador;
        }
        this.puntaje += puntos;
        return { tipo: 'correcta', primerIntento, puntos, cambioNivel, habilidad, explicacion: this.pregunta.explicacion ?? null };
    }

    /** La respuesta correcta salió de la pantalla sin que el niño la eligiera. */
    escapo({ ahoraMs = 0 } = {}) {
        if (this.resuelta || !this.pregunta) return { tipo: 'ignorada' };
        this.resuelta = true;
        this.contarEquivocacion(this.pregunta.habilidad, SE_ESCAPO);
        this.registrarErrorSiEsElPrimero(ahoraMs - this.inicioPregunta);
        return {
            tipo: 'escapo',
            textoRespuesta: this.pregunta.textoRespuesta,
            pista: this.pregunta.pista,
            explicacion: this.pregunta.explicacion ?? null
        };
    }

    /** Cuenta CADA respuesta equivocada que elige el niño, con el nombre del error que representa (si lo tiene). */
    contarEquivocacion(habilidad, tipo) {
        const clave = `${habilidad}\u0000${tipo}`;
        this.errores.set(clave, (this.errores.get(clave) ?? 0) + 1);
    }

    registrarErrorSiEsElPrimero(tiempo) {
        if (this.huboError) return;
        this.huboError = true;
        this.fallos++;
        this.racha = 0;
        this.erroresSeguidos++;
        if (this.colocacion) this.subirOBajarEscalon(false);
        else this.motor.registrar(this.pregunta.habilidad, false, tiempo);
    }

    subirOBajarEscalon(acerto) {
        this.escalon = avanzarEscalon(this.escalon, acerto, this.colocacion.gradoMin, this.colocacion.gradoMax);
    }

    /** Resultado en el formato común de todos los juegos (ver core/resultado.js). */
    resultado(tiempoMs) {
        const base = {
            errores: [...this.errores].map(([clave, veces]) => { const [habilidad, tipo] = clave.split('\u0000'); return { habilidad, tipo, veces }; }),
            aciertos: this.aciertos,
            fallos: this.fallos,
            recuperadas: this.recuperadas,
            tiempoMs,
            puntaje: this.puntaje,
            rachaMaxima: this.rachaMaxima
        };
        if (this.colocacion) {
            // La misión no toca las habilidades guardadas: solo informa dónde empezar
            return { ...base, habilidades: null, colocacion: true, gradoContenido: this.escalon.grado };
        }
        return { ...base, habilidades: this.motor.exportar() };
    }
}
