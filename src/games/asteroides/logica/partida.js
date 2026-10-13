/**
 * Modelo de una partida de Asteroides Matemáticos (sin DOM ni canvas).
 *
 * Reglas pensadas para niños:
 *  - NO hay vidas ni "game over": cada partida tiene un número fijo de preguntas y siempre termina.
 *  - Equivocarse no acelera nada ni quita puntos: se muestra una pista y se puede reintentar.
 *  - Cada pregunta cuenta UNA vez: acierto (a la primera) o fallo (hubo error o se escapó la respuesta).
 *    Por eso aciertos + fallos = preguntas, y las estrellas reflejan la precisión.
 *  - Acertar después de equivocarse da la mitad de puntos: se premia no rendirse.
 */
import { MotorAdaptativo } from '../../../adaptativo/motor.js';
import { generarPregunta, habilidadesParaGrado } from './generadores.js';
import { cantidadAsteroides, velocidadBase } from './campo.js';

export const PREGUNTAS_POR_PARTIDA = 10;
export const PUNTOS_ACIERTO = 10;
export const PUNTOS_RECUPERADO = 5;
export const BONUS_RACHA = 5;
export const RACHA_PARA_BONUS = 3;

export class Partida {
    /**
     * @param {Object} p
     * @param {number} p.grado
     * @param {Object|null} [p.habilidadesGuardadas]  instantánea previa del motor (del perfil)
     * @param {Function} [p.aleatorio]
     * @param {number} [p.total]
     */
    constructor({ grado, habilidadesGuardadas = null, aleatorio = Math.random, total = PREGUNTAS_POR_PARTIDA }) {
        this.grado = Math.min(Math.max(grado, 1), 6);
        this.aleatorio = aleatorio;
        this.total = total;
        this.motor = new MotorAdaptativo(habilidadesParaGrado(this.grado));
        if (habilidadesGuardadas) this.motor.importar(habilidadesGuardadas);

        this.numero = 0;
        this.aciertos = 0;
        this.fallos = 0;
        this.puntaje = 0;
        this.racha = 0;
        this.rachaMaxima = 0;

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
     * @returns {{pregunta:Object, cantidad:number, velocidad:number, nivel:number}|null} null si ya no quedan
     */
    iniciarPregunta(ahoraMs = 0) {
        if (!this.hayMasPreguntas) return null;
        this.numero++;
        const habilidad = this.motor.elegirHabilidad(this.aleatorio);
        const nivel = this.motor.nivel(habilidad);
        const cantidad = cantidadAsteroides(this.grado, nivel);
        this.pregunta = generarPregunta({ grado: this.grado, habilidad, nivel, cantidad, aleatorio: this.aleatorio });
        this.huboError = false;
        this.resuelta = false;
        this.inicioPregunta = ahoraMs;
        return { pregunta: this.pregunta, cantidad, velocidad: velocidadBase(this.grado, nivel), nivel };
    }

    /**
     * El niño eligió el asteroide con el número `id`.
     * @param {number} id
     * @param {{ahoraMs?:number, multiplicador?:number}} [opciones]
     * @returns {{tipo:'correcta', primerIntento:boolean, puntos:number, cambioNivel:string|null, habilidad:string}
     *          |{tipo:'incorrecta', pista:string}|{tipo:'ignorada'}}
     */
    responder(id, { ahoraMs = 0, multiplicador = 1 } = {}) {
        if (this.resuelta || !this.pregunta) return { tipo: 'ignorada' };
        const { habilidad } = this.pregunta;
        const tiempo = ahoraMs - this.inicioPregunta;

        if (id !== this.pregunta.respuesta) {
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
            cambioNivel = this.motor.registrar(habilidad, true, tiempo).cambio;
            const bonus = this.racha >= RACHA_PARA_BONUS ? BONUS_RACHA : 0;
            puntos = (PUNTOS_ACIERTO + bonus) * multiplicador;
        } else {
            puntos = PUNTOS_RECUPERADO * multiplicador;
        }
        this.puntaje += puntos;
        return { tipo: 'correcta', primerIntento, puntos, cambioNivel, habilidad };
    }

    /** La respuesta correcta salió de la pantalla sin que el niño la eligiera. */
    escapo({ ahoraMs = 0 } = {}) {
        if (this.resuelta || !this.pregunta) return { tipo: 'ignorada' };
        this.resuelta = true;
        this.registrarErrorSiEsElPrimero(ahoraMs - this.inicioPregunta);
        return { tipo: 'escapo', textoRespuesta: this.pregunta.textoRespuesta, pista: this.pregunta.pista };
    }

    registrarErrorSiEsElPrimero(tiempo) {
        if (this.huboError) return;
        this.huboError = true;
        this.fallos++;
        this.racha = 0;
        this.motor.registrar(this.pregunta.habilidad, false, tiempo);
    }

    /** Resultado en el formato común de todos los juegos (ver core/resultado.js). */
    resultado(tiempoMs) {
        return {
            aciertos: this.aciertos,
            fallos: this.fallos,
            tiempoMs,
            puntaje: this.puntaje,
            rachaMaxima: this.rachaMaxima,
            habilidades: this.motor.exportar()
        };
    }
}
