/**
 * Modelo de una partida de Memorama: varios tableros seguidos, con el motor adaptativo eligiendo
 * qué habilidad y qué dificultad (3, 4 o 6 parejas) toca en cada uno.
 *
 * Puntuación pensada para niños: no hay vidas ni tiempo límite; los errores evitables no restan puntos,
 * solo cuentan para las estrellas. Un tablero sin errores evitables da un bonus.
 */
import { MotorAdaptativo } from '../../../adaptativo/motor.js';
import { generarTablero, habilidadesParaGrado } from './generadores.js';
import { Tablero } from './tablero.js';

export const TABLEROS_POR_PARTIDA = 3;
export const PUNTOS_PAREJA = 10;
export const BONUS_TABLERO_PERFECTO = 20;

export class Partida {
    constructor({ grado, habilidadesGuardadas = null, aleatorio = Math.random, total = TABLEROS_POR_PARTIDA }) {
        this.grado = Math.min(Math.max(grado, 1), 3);
        this.aleatorio = aleatorio;
        this.total = total;
        this.motor = new MotorAdaptativo(habilidadesParaGrado(this.grado));
        if (habilidadesGuardadas) this.motor.importar(habilidadesGuardadas);

        this.numero = 0;
        this.aciertos = 0;        // parejas encontradas
        this.fallos = 0;          // errores evitables
        this.puntaje = 0;
        this.tablero = null;      // instancia de Tablero en juego
        this.datos = null;        // datos del tablero (cartas con contenido, instrucción...)
        this.erroresDelTablero = 0;
        this.inicioTablero = 0;
    }

    get hayMasTableros() {
        return this.numero < this.total;
    }

    /** @param {number} ahoraMs tiempo de JUEGO @returns {Object|null} datos del tablero, o null si ya no quedan */
    iniciarTablero(ahoraMs = 0) {
        if (!this.hayMasTableros) return null;
        this.numero++;
        const habilidad = this.motor.elegirHabilidad(this.aleatorio);
        const nivel = this.motor.nivel(habilidad);
        this.datos = generarTablero({ grado: this.grado, habilidad, nivel, aleatorio: this.aleatorio });
        this.datos.nivel = nivel;
        this.tablero = new Tablero(this.datos.cartas);
        this.erroresDelTablero = 0;
        this.inicioTablero = ahoraMs;
        return this.datos;
    }

    /**
     * Procesa lo que pasó al voltear una carta (resultado de `Tablero.voltear`) y actualiza puntos y motor.
     * @returns {{pareja?:Object, cambioNivel?:string|null, tableroCompleto?:boolean, bonus?:number, puntos?:number}}
     */
    procesar(evento, ahoraMs = 0) {
        const habilidad = this.datos.habilidad;
        const tiempo = ahoraMs - this.inicioTablero;

        if (evento.tipo === 'pareja') {
            this.aciertos++;
            this.puntaje += PUNTOS_PAREJA;
            const { cambio } = this.motor.registrar(habilidad, true, tiempo);
            const pareja = this.datos.parejas.find((p) => p.id === evento.parejaId);
            const salida = { pareja, cambioNivel: cambio, puntos: PUNTOS_PAREJA };
            if (this.tablero.completo) {
                salida.tableroCompleto = true;
                salida.bonus = this.erroresDelTablero === 0 ? BONUS_TABLERO_PERFECTO : 0;
                this.puntaje += salida.bonus;
            }
            return salida;
        }
        if (evento.tipo === 'fallo' && evento.evitable) {
            this.fallos++;
            this.erroresDelTablero++;
            this.motor.registrar(habilidad, false, tiempo);
        }
        return {};
    }

    /** Resultado en el formato común de los juegos (ver core/resultado.js). */
    resultado(tiempoMs) {
        return {
            aciertos: this.aciertos,
            fallos: this.fallos,
            tiempoMs,
            puntaje: this.puntaje,
            habilidades: this.motor.exportar()
        };
    }
}
