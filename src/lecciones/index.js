/**
 * Punto de entrada de las lecciones: elige la lección PROPIA de la habilidad si existe y, si no (o si falla), la
 * genérica de «ejemplo resuelto». Nunca lanza: una lección rota no debe romper la partida de un niño.
 */
import { leccionDeEjemplo } from './ejemplo.js';
import { validarLeccion } from './leccion.js';

export { validarLeccion } from './leccion.js';
export { leccionDeEjemplo } from './ejemplo.js';

/**
 * @param {Object} p
 * @param {Object} p.gemela                 pregunta gemela (otros datos, misma habilidad)
 * @param {Function} [p.propia]             (gemela) => Leccion | null; la lección específica del juego
 * @param {string} [p.titulo]               título de la lección genérica
 * @param {string} [p.prefijoTitulo]        p. ej. «Antes de empezar: » para la lección de introducción
 */
export function construirLeccion({ gemela, propia = null, titulo, prefijoTitulo = '' }) {
    let leccion = null;
    if (propia) {
        try {
            const candidata = propia(gemela);
            leccion = candidata ? validarLeccion(candidata) : null; // una lección rota se descarta, no se muestra
        } catch (error) {
            console.warn('Lección propia inválida, se usa el ejemplo:', error);
        }
    }
    if (!leccion) leccion = leccionDeEjemplo(gemela, { titulo });
    leccion = validarLeccion({ ...leccion, titulo: `${prefijoTitulo}${leccion.titulo}` });
    return leccion;
}
