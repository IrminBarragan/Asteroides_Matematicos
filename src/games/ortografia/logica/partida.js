/**
 * Partida de "Atrapa la Ortografía": las reglas generales viven en `core/partidaPreguntas.js`.
 */
import { PartidaPreguntas } from '../../../core/partidaPreguntas.js';
import { generarPregunta, habilidadesParaGrado, prepararRonda, GRADO_MIN, GRADO_MAX } from './generadores.js';

export {
    PREGUNTAS_POR_PARTIDA, PUNTOS_ACIERTO, PUNTOS_RECUPERADO, BONUS_RACHA, RACHA_PARA_BONUS
} from '../../../core/partidaPreguntas.js';

export class Partida extends PartidaPreguntas {
    constructor({ grado, habilidadesGuardadas = null, aleatorio = Math.random, total }) {
        const g = Math.min(Math.max(grado, GRADO_MIN), GRADO_MAX); // quien juega con otro grado usa el tablero de 3.º–6.º más cercano
        super({
            grado: g,
            habilidades: habilidadesParaGrado(g),
            generar: generarPregunta,
            preparar: prepararRonda,
            habilidadesGuardadas,
            aleatorio,
            total
        });
    }
}
