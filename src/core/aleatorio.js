/**
 * Ayudas de aleatoriedad. Todas reciben el generador `aleatorio` (por defecto Math.random)
 * para poder fijarlo en las pruebas y obtener resultados reproducibles.
 */

/** Entero entre min y max, ambos incluidos. */
export function entre(aleatorio, min, max) {
    return Math.floor(aleatorio() * (max - min + 1)) + min;
}

export function elegir(aleatorio, lista) {
    return lista[Math.floor(aleatorio() * lista.length)];
}

/** Fisher–Yates: devuelve una copia mezclada (no modifica la original). */
export function mezclar(aleatorio, lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(aleatorio() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Generador pseudoaleatorio con semilla (mulberry32): misma semilla → misma secuencia.
 * Solo para pruebas y para reproducir un caso; NO es criptográfico.
 */
export function crearAleatorioSembrado(semilla) {
    let estado = semilla >>> 0;
    return () => {
        estado = (estado + 0x6d2b79f5) >>> 0;
        let t = estado;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
