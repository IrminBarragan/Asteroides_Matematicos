/**
 * Aritmética de fracciones con ENTEROS (sin punto flotante).
 *
 * En JavaScript 0.1 + 0.2 = 0.30000000000000004. Con fracciones enteras (1/10 + 2/10 = 3/10) eso no puede pasar:
 * todas las comparaciones y operaciones usan multiplicación cruzada y múltiplos comunes.
 *
 * Una fracción es { n, d } con n entero >= 0 y d entero >= 1. Un número mixto es { entero, n, d }.
 */

export function mcd(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x;
}

export const mcm = (a, b) => (a / mcd(a, b)) * b;

function validar({ n, d }) {
    if (!Number.isInteger(n) || !Number.isInteger(d) || n < 0 || d < 1) {
        throw new Error(`Fracción inválida: ${n}/${d}`);
    }
}

export function fraccion(n, d) {
    validar({ n, d });
    return { n, d };
}

/** Divide numerador y denominador entre su máximo común divisor. 0/5 → 0/1. */
export function simplificar(f) {
    validar(f);
    if (f.n === 0) return { n: 0, d: 1 };
    const g = mcd(f.n, f.d);
    return { n: f.n / g, d: f.d / g };
}

export const estaSimplificada = (f) => f.n === 0 ? f.d === 1 : mcd(f.n, f.d) === 1;

/** -1 si a < b, 0 si son iguales, 1 si a > b (multiplicación cruzada: sin decimales). */
export function comparar(a, b) {
    const izquierda = a.n * b.d;
    const derecha = b.n * a.d;
    return izquierda < derecha ? -1 : izquierda > derecha ? 1 : 0;
}

export const sonEquivalentes = (a, b) => comparar(a, b) === 0;

/** Lleva dos fracciones al denominador común más pequeño (el mcm): [a', b'] con el mismo d. */
export function aDenominadorComun(a, b) {
    const d = mcm(a.d, b.d);
    return [{ n: a.n * (d / a.d), d }, { n: b.n * (d / b.d), d }];
}

/** a + b, simplificada. */
export function sumar(a, b) {
    const [x, y] = aDenominadorComun(a, b);
    return simplificar({ n: x.n + y.n, d: x.d });
}

/** a − b, simplificada. Lanza si a < b (en primaria no hay fracciones negativas). */
export function restar(a, b) {
    if (comparar(a, b) < 0) throw new Error('La resta daría una fracción negativa');
    const [x, y] = aDenominadorComun(a, b);
    return simplificar({ n: x.n - y.n, d: x.d });
}

/** k × n / k × d: la fracción equivalente que se obtiene al multiplicar arriba y abajo por k. */
export const multiplicarPorFactor = (f, k) => ({ n: f.n * k, d: f.d * k });

/** 7/4 → { entero: 1, n: 3, d: 4 }. */
export function aMixta({ n, d }) {
    return { entero: Math.floor(n / d), n: n % d, d };
}

/** { entero: 1, n: 3, d: 4 } → 7/4. */
export function desdeMixta({ entero, n, d }) {
    return { n: entero * d + n, d };
}

/**
 * Valor en CENTÉSIMAS (entero) si la fracción es un decimal exacto de a lo más 2 cifras (d divide a 100); si no, null.
 * 3/4 → 75 (0.75) · 1/5 → 20 (0.20) · 1/3 → null.
 */
export function centesimas({ n, d }) {
    return 100 % d === 0 ? n * (100 / d) : null;
}

/** 75 → "0.75" · 50 → "0.5" · 4 → "0.04" · 150 → "1.5" · 200 → "2". */
export function formatoDecimal(centesimasDelValor) {
    const entero = Math.floor(centesimasDelValor / 100);
    const resto = centesimasDelValor % 100;
    if (resto === 0) return String(entero);
    return `${entero}.${String(resto).padStart(2, '0').replace(/0$/, '')}`;
}

/** Lo contrario de formatoDecimal para textos como "0.75" o "1.5" (entero de centésimas), o null si no es un decimal de ≤ 2 cifras. */
export function centesimasDeTexto(texto) {
    const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
    if (!m) return null;
    return Number(m[1]) * 100 + (m[2] ? Number(m[2].padEnd(2, '0')) : 0);
}

// ---------- Formatos y lectura ----------

export const formato = ({ n, d }) => `${n}/${d}`;
export const formatoMixto = ({ entero, n, d }) => (n === 0 ? String(entero) : entero === 0 ? `${n}/${d}` : `${entero} ${n}/${d}`);

const NOMBRES_DENOMINADOR = {
    2: ['medio', 'medios'], 3: ['tercio', 'tercios'], 4: ['cuarto', 'cuartos'], 5: ['quinto', 'quintos'],
    6: ['sexto', 'sextos'], 7: ['séptimo', 'séptimos'], 8: ['octavo', 'octavos'], 9: ['noveno', 'novenos'],
    10: ['décimo', 'décimos'], 100: ['centésimo', 'centésimos']
};

/** Cómo se lee en voz alta ("3 cuartos", "1 medio"); para denominadores sin nombre corto, "5 entre 12". */
export function fraccionEnPalabras({ n, d }) {
    const nombres = NOMBRES_DENOMINADOR[d];
    if (!nombres) return `${n} entre ${d}`;
    return `${n} ${n === 1 ? nombres[0] : nombres[1]}`;
}

export function mixtaEnPalabras({ entero, n, d }) {
    if (n === 0) return String(entero);
    return entero === 0 ? fraccionEnPalabras({ n, d }) : `${entero} y ${fraccionEnPalabras({ n, d })}`;
}
