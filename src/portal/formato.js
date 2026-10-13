/** Funciones puras de formato para mostrar datos. */

/** 65000 ms → "1:05". */
export function formatearTiempo(ms) {
    const segundos = Math.max(0, Math.round(ms / 1000));
    const minutos = Math.floor(segundos / 60);
    const resto = String(segundos % 60).padStart(2, '0');
    return `${minutos}:${resto}`;
}

/** Mensaje de felicitación según estrellas (sin castigar: incluso con 0 se anima). */
export function mensajeResultado(estrellas) {
    switch (estrellas) {
        case 3: return '¡Increíble! ¡Lo hiciste genial!';
        case 2: return '¡Muy bien! Casi perfecto.';
        case 1: return '¡Buen intento! Sigue practicando.';
        default: return 'No te rindas, ¡inténtalo otra vez!';
    }
}

export function textoGrado(grado) {
    return `${grado}.º grado`;
}

export function textoEstrellas(n, max = 3) {
    return `${n} de ${max} estrellas`;
}
