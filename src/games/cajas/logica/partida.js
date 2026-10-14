/**
 * Partida de «Cajas y Reparto»: las reglas generales viven en `core/partidaPreguntas.js` y el andamiaje que se retira
 * en `core/partidaConApoyo.js`; aquí solo se dice qué se pregunta y cómo se enseña.
 */
import { PartidaConApoyo } from '../../../core/partidaConApoyo.js';
import { leccionCajas } from '../../../lecciones/cajas.js';
import { generarPregunta, habilidadesParaGrado, prepararRonda, NOMBRES_HABILIDAD, GRADO_MIN, GRADO_MAX } from './generadores.js';

export {
    PREGUNTAS_POR_PARTIDA, PUNTOS_ACIERTO, PUNTOS_RECUPERADO, BONUS_RACHA, RACHA_PARA_BONUS
} from '../../../core/partidaPreguntas.js';

export class Partida extends PartidaConApoyo {
    constructor({ grado, habilidadesGuardadas = null, aleatorio = Math.random, total, colocacion = null }) {
        super({
            grado: Math.min(Math.max(grado, GRADO_MIN), GRADO_MAX),
            generarPregunta, habilidadesParaGrado, prepararRonda,
            habilidadesGuardadas, aleatorio, total, colocacion,
            nombresHabilidad: NOMBRES_HABILIDAD,
            leccion: (gemela) => leccionCajas(gemela.habilidad, gemela.datos)
        });
    }
}
