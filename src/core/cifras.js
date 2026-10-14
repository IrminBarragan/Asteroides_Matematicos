/**
 * Aritmética de CIFRAS (lógica pura): llevadas, préstamos y los errores típicos que salen de olvidarlos.
 * Las usan «Taller de Cálculo» y «Bloques de Valor».
 */

/** Cifras de n de las unidades hacia arriba, rellenas con ceros hasta `largo`. */
export function cifras(n, largo) {
    const lista = String(n).split('').reverse().map(Number);
    while (lista.length < largo) lista.push(0);
    return lista;
}

export const sumaDeCifras = (n) => cifras(n, 0).reduce((s, c) => s + c, 0);

/** ¿Alguna columna de a + b se pasa de 9 (hay que llevar)? */
export function hayLlevada(a, b) {
    const largo = Math.max(String(a).length, String(b).length);
    const x = cifras(a, largo);
    const y = cifras(b, largo);
    let lleva = 0;
    for (let i = 0; i < largo; i++) {
        const s = x[i] + y[i] + lleva;
        lleva = s >= 10 ? 1 : 0;
        if (lleva) return true;
    }
    return false;
}

/** ¿Alguna columna de a − b obliga a pedir prestado? (a ≥ b) */
export function hayPrestamo(a, b) {
    const largo = String(a).length;
    const x = cifras(a, largo);
    const y = cifras(b, largo);
    let presta = 0;
    for (let i = 0; i < largo; i++) {
        if (x[i] - presta < y[i]) return true;
        presta = 0;
    }
    return false;
}

/** Error típico: sumar cada columna e ignorar lo que se lleva (47 + 38 → 75). */
export function sumaSinLlevar(a, b) {
    const largo = Math.max(String(a).length, String(b).length);
    const x = cifras(a, largo);
    const y = cifras(b, largo);
    return x.reduce((total, _, i) => total + ((x[i] + y[i]) % 10) * 10 ** i, 0);
}

/** Error típico: en cada columna restar el menor del mayor (52 − 38 → 26, y no 14). */
export function restaAlReves(a, b) {
    const largo = String(a).length;
    const x = cifras(a, largo);
    const y = cifras(b, largo);
    return x.reduce((total, _, i) => total + Math.abs(x[i] - y[i]) * 10 ** i, 0);
}


/** Cuántas columnas de a + b se pasan de 9 (cuántas veces hay que «llevar», contando las que provoca otra llevada). */
export function contarLlevadas(a, b) {
    const largo = Math.max(String(a).length, String(b).length);
    const x = cifras(a, largo);
    const y = cifras(b, largo);
    let lleva = 0;
    let total = 0;
    for (let i = 0; i < largo; i++) {
        lleva = x[i] + y[i] + lleva >= 10 ? 1 : 0;
        total += lleva;
    }
    return total;
}

/** Cuántas columnas de a − b obligan a pedir prestado (a ≥ b). */
export function contarPrestamos(a, b) {
    const largo = String(a).length;
    const x = cifras(a, largo);
    const y = cifras(b, largo);
    let presta = 0;
    let total = 0;
    for (let i = 0; i < largo; i++) {
        presta = x[i] - presta < y[i] ? 1 : 0;
        total += presta;
    }
    return total;
}

/** 12345 → «12 345» (con espacio fino que no corta la línea); de 4 cifras o menos se escribe tal cual (como en los libros de texto). */
export const formatoNumero = (n) => (n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') : String(n));
