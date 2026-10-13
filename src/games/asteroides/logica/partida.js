/**
 * Partida de Asteroides Matemáticos: las reglas generales viven en `core/partidaPreguntas.js`;
 * aquí solo se indica qué habilidades hay por grado, cómo se genera una pregunta y cuántos asteroides y
 * a qué velocidad aparecen en cada ronda.
 */
import { PartidaPreguntas } from '../../../core/partidaPreguntas.js';
import { generarPregunta, habilidadesParaGrado } from './generadores.js';
import { cantidadAsteroides, velocidadBase } from './campo.js';

export {
    PREGUNTAS_POR_PARTIDA, PUNTOS_ACIERTO, PUNTOS_RECUPERADO, BONUS_RACHA, RACHA_PARA_BONUS
} from '../../../core/partidaPreguntas.js';

export class Partida extends PartidaPreguntas {
    constructor({ grado, habilidadesGuardadas = null, aleatorio = Math.random, total }) {
        const g = Math.min(Math.max(grado, 1), 6);
        super({
            grado: g,
            habilidades: habilidadesParaGrado(g),
            generar: generarPregunta,
            preparar: (grado, nivel) => ({ cantidad: cantidadAsteroides(grado, nivel), velocidad: velocidadBase(grado, nivel) }),
            habilidadesGuardadas,
            aleatorio,
            total
        });
    }
}
