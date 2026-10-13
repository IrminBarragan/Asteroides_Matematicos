/**
 * Resultado de una partida: forma común para TODOS los juegos.
 *
 * @typedef {Object} Resultado
 * @property {number} aciertos
 * @property {number} fallos
 * @property {number} tiempoMs
 * @property {number} [puntaje]
 * @property {number} [estrellas]  0..3; si el juego no la da, se calcula
 */

/**
 * Estrellas según precisión. Criterio pensado para niños: terminar con al menos
 * un acierto siempre da 1 estrella (no se premia solo la perfección).
 *   >= 90% → 3   ·   >= 70% → 2   ·   resto con algún acierto → 1   ·   sin aciertos → 0
 */
export function calcularEstrellas({ aciertos, fallos }) {
    if (aciertos <= 0) return 0;
    const precision = aciertos / (aciertos + fallos);
    if (precision >= 0.9) return 3;
    if (precision >= 0.7) return 2;
    return 1;
}

const esEnteroNoNegativo = (n) => Number.isInteger(n) && n >= 0;

/**
 * Valida y normaliza un resultado. Lanza Error si es inválido.
 * @returns {Resultado} copia con `estrellas` y `puntaje` garantizados
 */
export function normalizarResultado(resultado) {
    if (!resultado || typeof resultado !== 'object') {
        throw new Error('El resultado debe ser un objeto');
    }
    const { aciertos, fallos, tiempoMs } = resultado;
    if (!esEnteroNoNegativo(aciertos) || !esEnteroNoNegativo(fallos)) {
        throw new Error('aciertos y fallos deben ser enteros >= 0');
    }
    if (typeof tiempoMs !== 'number' || !Number.isFinite(tiempoMs) || tiempoMs < 0) {
        throw new Error('tiempoMs debe ser un número >= 0');
    }
    const estrellas = resultado.estrellas === undefined
        ? calcularEstrellas({ aciertos, fallos })
        : resultado.estrellas;
    if (![0, 1, 2, 3].includes(estrellas)) {
        throw new Error('estrellas debe ser 0, 1, 2 o 3');
    }
    return {
        ...resultado,
        estrellas,
        puntaje: resultado.puntaje === undefined ? aciertos * 10 : resultado.puntaje
    };
}
