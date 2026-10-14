/**
 * Respuestas incorrectas "creíbles" para los asteroides.
 *
 * Un buen distractor no es un número al azar: es el resultado de un ERROR TÍPICO
 * (olvidar una llevada, equivocarse de fila en la tabla, usar la operación contraria).
 * Así, fallar le dice algo al maestro y acertar demuestra comprensión, no suerte.
 */
import { mezclar } from './aleatorio.js';

const SALTOS = [1, 2, 3, 10, 5, 4, 6, 7, 8, 9, 20];

/**
 * @param {number} respuesta
 * @param {Function} aleatorio
 * @param {number} cantidad  cuántos distractores se piden
 * @param {{preferidos?: number[], maximo?: number, excluir?: number[]}} [opciones]  errores típicos del generador (se usan primero); `maximo` acota todo lo que se ofrece y `excluir` son números que ya están entre las opciones
 * @returns {number[]} `cantidad` enteros únicos, >= 0 y distintos de la respuesta
 */
export function generarDistractores(respuesta, aleatorio, cantidad, { preferidos = [], maximo = Infinity, excluir = [] } = {}) {
    const resultado = [];
    const usados = new Set([respuesta, ...excluir]);
    const agregar = (n) => {
        if (resultado.length < cantidad && Number.isInteger(n) && n >= 0 && n <= maximo && !usados.has(n)) {
            usados.add(n);
            resultado.push(n);
        }
    };

    mezclar(aleatorio, preferidos).forEach(agregar);
    for (const salto of mezclar(aleatorio, SALTOS)) {
        mezclar(aleatorio, [respuesta + salto, respuesta - salto]).forEach(agregar);
    }
    // Garantía final (respuestas muy pequeñas con pocos vecinos válidos)
    for (let extra = respuesta + 1; resultado.length < cantidad && extra <= Math.min(maximo, respuesta + 1000); extra++) agregar(extra);
    for (let extra = respuesta - 1; resultado.length < cantidad && extra >= 0; extra--) agregar(extra);
    return resultado;
}

/**
 * Distractores para "¿cuál es múltiplo de n?": números cercanos que NO son múltiplos de n.
 */
export function distractoresNoMultiplos(respuesta, n, aleatorio, cantidad) {
    const candidatos = [];
    for (let d = 1; d <= 3 * n + 6; d++) {
        for (const valor of [respuesta + d, respuesta - d]) {
            if (valor > 0 && valor % n !== 0) candidatos.push(valor);
        }
    }
    // Se prefieren los más cercanos (los más engañosos), mezclando dentro de ese grupo
    const cercanos = mezclar(aleatorio, candidatos.slice(0, Math.max(cantidad * 3, 8)));
    return cercanos.slice(0, cantidad);
}
