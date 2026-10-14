/**
 * ¿Se permiten las animaciones decorativas (confeti, fondos que flotan, mascota que salta)?
 * No cuando el equipo está en «modo ligero» (PC lenta, o la maestra lo pidió) ni cuando el sistema operativo pide
 * «reducir movimiento» (accesibilidad: el movimiento puede marear o distraer). El CSS hace lo mismo con
 * `[data-ligero]` y `@media (prefers-reduced-motion)`; esta función es para lo que se crea desde JavaScript.
 */
export function animacionesPermitidas({ ligero = false, matchMedia = globalThis.matchMedia } = {}) {
    if (ligero) return false;
    try {
        if (typeof matchMedia === 'function' && matchMedia.call(globalThis, '(prefers-reduced-motion: reduce)').matches) return false;
    } catch { /* un navegador sin matchMedia: se asume que sí se permite */ }
    return true;
}

/**
 * Heurística para activar el modo ligero solos en un equipo que parece lento: pocos núcleos o poca memoria.
 * Es una PISTA (no todos los navegadores lo informan): la maestra puede forzarlo desde el modo maestro.
 */
export function pareceEquipoLento(navegador = globalThis.navigator) {
    if (!navegador) return false;
    const nucleos = navegador.hardwareConcurrency;
    const memoria = navegador.deviceMemory; // GB, solo en navegadores basados en Chromium
    return (Number.isFinite(nucleos) && nucleos <= 2) || (Number.isFinite(memoria) && memoria <= 2);
}
