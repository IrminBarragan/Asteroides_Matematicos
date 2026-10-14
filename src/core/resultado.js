/**
 * Resultado de una partida: forma común para TODOS los juegos.
 *
 * @typedef {Object} Resultado
 * @property {number} aciertos
 * @property {number} fallos
 * @property {number} tiempoMs
 * @property {number} [puntaje]
 * @property {number} [recuperadas]  preguntas falladas que luego resolvió (0 ≤ recuperadas ≤ fallos)
 * @property {number} [estrellas]  0..3; si el juego no la da, se calcula
 */

/**
 * Estrellas pensadas para que TODO niño que se esfuerza gane algo (la v1 solo premiaba acertar a la primera,
 * y un niño que terminaba reintentando cada pregunta se iba con 0 estrellas).
 *
 * Cada pregunta cuenta una vez: «acierto» (a la primera) o «fallo» (hubo error). Una pregunta fallada que el niño
 * después resolvió es «recuperada» (subconjunto de los fallos). El crédito es:
 *     crédito = (aciertos + ½ · recuperadas) / (aciertos + fallos)
 *
 *   ★★★  crédito ≥ 90 %      (casi todo a la primera)
 *   ★★   crédito ≥ 60 %      (buena precisión, o mucha perseverancia)
 *   ★    resolvió al menos una pregunta (terminar y esforzarse ya cuenta)
 *   —    no resolvió ninguna (p. ej. dejó escapar todo sin intentar)
 *
 * La exactitud real (aciertos a la primera) NO se pierde: el modo maestro la sigue mostrando por habilidad.
 */
export function calcularEstrellas({ aciertos, fallos, recuperadas = 0 }) {
    if (aciertos + recuperadas <= 0) return 0;
    const credito = (aciertos + recuperadas / 2) / (aciertos + fallos);
    if (credito >= 0.9) return 3;
    if (credito >= 0.6) return 2;
    return 1;
}

const esEnteroNoNegativo = (n) => Number.isInteger(n) && n >= 0;

export const MAX_LARGO_TIPO_ERROR = 40;
export const MAX_ERRORES_POR_PARTIDA = 60;

/**
 * Lista de equivocaciones de una partida: [{ habilidad, tipo, veces }], donde `tipo` es el nombre de la equivocación
 * («olvidó la llevada», «usó la operación contraria») o «otra equivocación» si no tiene nombre. No lanza: una lista
 * dañada se limpia (los datos de enseñanza nunca deben impedir guardar el resultado de la partida).
 */
export function limpiarErrores(errores) {
    if (!Array.isArray(errores)) return [];
    const limpio = (t) => String(t ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, MAX_LARGO_TIPO_ERROR);
    return errores
        .filter((e) => e && typeof e === 'object' && Number.isInteger(e.veces) && e.veces > 0)
        .map((e) => ({ habilidad: limpio(e.habilidad), tipo: limpio(e.tipo) || 'otra equivocación', veces: e.veces }))
        .filter((e) => e.habilidad !== '')
        .slice(0, MAX_ERRORES_POR_PARTIDA);
}

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
    const recuperadas = resultado.recuperadas ?? 0;
    if (!esEnteroNoNegativo(recuperadas) || recuperadas > fallos) {
        throw new Error('recuperadas debe ser un entero entre 0 y fallos');
    }
    const estrellas = resultado.estrellas === undefined
        ? calcularEstrellas({ aciertos, fallos, recuperadas })
        : resultado.estrellas;
    if (![0, 1, 2, 3].includes(estrellas)) {
        throw new Error('estrellas debe ser 0, 1, 2 o 3');
    }
    return {
        ...resultado,
        ...(resultado.errores === undefined ? {} : { errores: limpiarErrores(resultado.errores) }),
        estrellas,
        puntaje: resultado.puntaje === undefined ? aciertos * 10 : resultado.puntaje
    };
}
