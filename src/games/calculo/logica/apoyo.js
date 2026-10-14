/**
 * Andamiaje que se retira: cuánta ayuda lleva cada pregunta de «Taller de Cálculo».
 *
 *   completo → hay que usar el material (marcos o recta) para llegar a la respuesta; no se ven opciones antes
 *   ligero   → el material está a la mano pero es opcional, y las opciones se ven desde el principio
 *   ninguno  → solo el problema y las opciones (cálculo mental o con lápiz)
 *
 * La idea (ver docs/PLAN-V2.md): se empieza con mucha ayuda, y cada acierto «a la primera» la baja un escalón; un
 * error la sube un escalón. Así el material se retira solo cuando el niño ya no lo necesita, y vuelve si lo necesita.
 * Lógica pura: no sabe nada de pantallas.
 */
export const APOYOS = ['completo', 'ligero', 'ninguno'];

/** Con la dificultad más baja se empieza con ayuda completa; si no, ligera. */
export function apoyoInicial(nivel) {
    return nivel <= 1 ? 'completo' : 'ligero';
}

/** @param {'completo'|'ligero'|'ninguno'} apoyo @param {{acerto:boolean}} resultado @returns {string} */
export function siguienteApoyo(apoyo, { acerto }) {
    const i = APOYOS.indexOf(apoyo);
    if (i === -1) throw new Error(`apoyo desconocido: ${apoyo}`);
    return APOYOS[acerto ? Math.min(i + 1, APOYOS.length - 1) : Math.max(i - 1, 0)];
}
