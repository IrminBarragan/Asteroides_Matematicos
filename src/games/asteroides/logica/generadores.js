/**
 * Generadores de preguntas de Asteroides Matemáticos, por HABILIDAD, GRADO (1.º–6.º) y NIVEL (1–3).
 *
 * Lógica pura (sin DOM, sin canvas): se prueba en Node con generadores aleatorios sembrados.
 * El NIVEL lo decide el motor adaptativo; el GRADO limita qué contenidos y qué tamaños de número
 * son apropiados. Cada generador devuelve la respuesta como ENTERO (los decimales se manejan
 * escalados, p. ej. 3.5 → 35 con una décima) para evitar errores de punto flotante (0.1 + 0.2).
 *
 * El piso es bajo a propósito: en 1.º el nivel 1 son sumas y restas hasta 5 (v0.2; antes hasta 10), porque
 * los niños que llegan sin la base necesitan un escalón desde donde empezar.
 *
 * Cobertura por grado (ver HABILIDADES_POR_GRADO):
 *   1.º-2.º suma y resta · 3.º + tablas de multiplicar · 4.º + división exacta
 *   5.º multiplicación, división, operaciones combinadas, múltiplos
 *   6.º combinadas, múltiplos, decimales, división
 */
import { entre, elegir, mezclar } from '../../../core/aleatorio.js';
import { generarDistractores, distractoresNoMultiplos } from './distractores.js';

export const HABILIDADES_POR_GRADO = {
    1: ['suma', 'resta'],
    2: ['suma', 'resta'],
    3: ['suma', 'resta', 'multiplicacion'],
    4: ['suma', 'resta', 'multiplicacion', 'division'],
    5: ['multiplicacion', 'division', 'combinadas', 'multiplos'],
    6: ['combinadas', 'multiplos', 'decimales', 'division']
};

export const NIVEL_MAX = 3;

/** Habilidades de un grado en el formato que espera el MotorAdaptativo. */
export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, 1, 6)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

// ---------- Tablas de tamaño por grado y nivel ----------

export const TOPE_SUMA = {
    1: [5, 10, 20], 2: [30, 60, 100], 3: [200, 500, 1000],
    4: [1000, 5000, 10000], 5: [10000, 25000, 50000], 6: [50000, 75000, 100000]
};
const GRUPOS_TABLA = { 1: [2, 5, 10], 2: [3, 4, 6], 3: [7, 8, 9] };

/** Factores [min,max] de a y b para la multiplicación a partir de 4.º. */
const MULT_RANGOS = {
    4: [[[11, 30], [2, 5]], [[12, 60], [2, 9]], [[25, 99], [3, 9]]],
    5: [[[25, 99], [3, 9]], [[100, 300], [2, 9]], [[11, 30], [11, 30]]],
    6: [[[100, 500], [3, 9]], [[12, 40], [12, 40]], [[101, 300], [11, 30]]]
};

/** Divisor y cociente [min,max] para la división exacta. */
const DIV_RANGOS = {
    5: [[[2, 9], [10, 30]], [[2, 9], [20, 99]], [[11, 15], [5, 20]]],
    6: [[[11, 15], [5, 20]], [[12, 25], [5, 30]], [[11, 40], [10, 50]]]
};

// ---------- Pistas ----------

function pistaSuma(a, b) {
    if (b >= 10 && b % 10 !== 0) {
        const decenas = b - (b % 10);
        return `Suma por partes: ${a} + ${decenas} = ${a + decenas}, y luego suma ${b % 10} más.`;
    }
    if (b >= 10) return 'Suma primero las decenas y después las unidades.';
    return `Empieza en ${a} y cuenta ${b} más.`;
}

function pistaMultiplicacion(a, b) {
    if (b <= 5) return `${a} × ${b} es sumar ${a} un total de ${b} veces: ${Array(b).fill(a).join(' + ')}.`;
    if (b < 10) return `Descompón el ${b}: ${a} × ${b} = ${a} × 5 + ${a} × ${b - 5}.`;
    if (b % 10 !== 0) {
        const decenas = b - (b % 10);
        return `Descompón el ${b}: ${a} × ${b} = ${a} × ${decenas} + ${a} × ${b % 10}.`;
    }
    return `Multiplica ${a} × ${b / 10} y agrega un cero.`;
}

// ---------- Generadores ----------
// Cada uno devuelve: { enunciado, respuesta, pista, preferidos?, fabricarDistractores?, formato? }

function suma(grado, nivel, az) {
    const max = TOPE_SUMA[grado][nivel - 1];
    const min = max >= 30 ? 10 : 1;
    const a = entre(az, min, max);
    const b = entre(az, min, max);
    const r = a + b;
    return { enunciado: `${a} + ${b} = ?`, respuesta: r, pista: pistaSuma(a, b), preferidos: [r + 1, r - 1, r + 10, r - 10] };
}

function resta(grado, nivel, az) {
    const max = TOPE_SUMA[grado][nivel - 1];
    const min = max >= 30 ? 10 : 2;
    const a = entre(az, min, max);
    const b = entre(az, 1, a - 1); // b < a: nunca da negativo ni cero
    const r = a - b;
    return {
        enunciado: `${a} − ${b} = ?`, respuesta: r,
        pista: `Piensa: ¿cuánto le falta a ${b} para llegar a ${a}?`,
        preferidos: [r + 1, r - 1, a + b, r + 10, r - 10] // a + b: usar la operación contraria
    };
}

function multiplicacion(grado, nivel, az) {
    let a;
    let b;
    if (grado <= 3) {
        a = elegir(az, GRUPOS_TABLA[nivel]);
        b = entre(az, 2, 10);
        if (az() < 0.5) [a, b] = [b, a];
    } else {
        const [[amin, amax], [bmin, bmax]] = MULT_RANGOS[grado][nivel - 1];
        a = entre(az, amin, amax);
        b = entre(az, bmin, bmax);
    }
    const r = a * b;
    return {
        enunciado: `${a} × ${b} = ?`, respuesta: r, pista: pistaMultiplicacion(a, b),
        // Errores típicos: equivocarse de fila de la tabla (una vez de más o de menos)
        preferidos: [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b]
    };
}

function division(grado, nivel, az) {
    let d;
    let q;
    if (grado <= 4) {
        d = elegir(az, GRUPOS_TABLA[nivel]);
        q = entre(az, 2, grado === 4 && nivel === 3 ? 12 : 10);
    } else {
        const [[dmin, dmax], [qmin, qmax]] = DIV_RANGOS[grado][nivel - 1];
        d = entre(az, dmin, dmax);
        q = entre(az, qmin, qmax);
    }
    const a = d * q;
    return {
        enunciado: `${a} ÷ ${d} = ?`, respuesta: q,
        pista: `Piensa en la tabla del ${d}: ¿qué número multiplicado por ${d} da ${a}?`,
        preferidos: [q + 1, q - 1, q + 2, q - 2]
    };
}

function combinadas(grado, nivel, az) {
    if (nivel === 1) { // a + b × c
        const a = entre(az, 2, 20);
        const b = entre(az, 2, 9);
        const c = entre(az, 2, 9);
        return {
            enunciado: `${a} + ${b} × ${c} = ?`, respuesta: a + b * c,
            pista: `Primero la multiplicación: ${b} × ${c} = ${b * c}. Después suma ${a}.`,
            preferidos: [(a + b) * c] // error típico: ir de izquierda a derecha
        };
    }
    if (nivel === 2) {
        if (az() < 0.5) { // a × b − c
            const a = entre(az, 2, 9);
            const b = entre(az, 2, 9);
            const c = entre(az, 1, a * b - 1);
            return {
                enunciado: `${a} × ${b} − ${c} = ?`, respuesta: a * b - c,
                pista: `Primero la multiplicación: ${a} × ${b} = ${a * b}. Después resta ${c}.`,
                preferidos: [a * b + c, a * (b - c)]
            };
        }
        const b = entre(az, 2, 5); // a − b × c
        const c = entre(az, 2, 5);
        const a = entre(az, b * c + 1, b * c + 30);
        return {
            enunciado: `${a} − ${b} × ${c} = ?`, respuesta: a - b * c,
            pista: `Primero la multiplicación: ${b} × ${c} = ${b * c}. Después resta de ${a}.`,
            preferidos: [(a - b) * c, a + b * c]
        };
    }
    if (az() < 0.5) { // (a + b) × c
        const a = entre(az, 2, 15);
        const b = entre(az, 2, 15);
        const c = entre(az, 2, 9);
        return {
            enunciado: `(${a} + ${b}) × ${c} = ?`, respuesta: (a + b) * c,
            pista: `Primero lo que está entre paréntesis: ${a} + ${b} = ${a + b}. Luego × ${c}.`,
            preferidos: [a + b * c, a * c + b]
        };
    }
    const b = entre(az, 4, 15); // a × (b − c)
    const c = entre(az, 1, b - 1);
    const a = entre(az, 2, 9);
    return {
        enunciado: `${a} × (${b} − ${c}) = ?`, respuesta: a * (b - c),
        pista: `Primero lo que está entre paréntesis: ${b} − ${c} = ${b - c}. Luego ${a} ×.`,
        preferidos: [a * b - c, a * b + a * c]
    };
}

const GRUPOS_MULTIPLOS = { 1: [2, 3, 4, 5], 2: [6, 7, 8, 9], 3: [11, 12, 13, 15] };

function multiplos(grado, nivel, az) {
    const n = elegir(az, GRUPOS_MULTIPLOS[nivel]);
    const k = grado <= 5 ? entre(az, 3, 12) : entre(az, 6, 25);
    const r = n * k;
    return {
        enunciado: `¿Cuál es múltiplo de ${n}?`, respuesta: r,
        pista: `Los múltiplos de ${n} están en su tabla: ${n}, ${2 * n}, ${3 * n}, ${4 * n}…`,
        fabricarDistractores: (cantidad) => distractoresNoMultiplos(r, n, az, cantidad)
    };
}

/** Decimales: se trabaja con enteros escalados (décimas o centésimas) para no usar punto flotante. */
function decimales(grado, nivel, az) {
    const decimalesDe = nivel === 3 ? 2 : 1;
    const [min, max] = nivel === 1 ? [11, 99] : nivel === 2 ? [100, 999] : [101, 999];
    const formato = (v) => (v / 10 ** decimalesDe).toFixed(decimalesDe);
    let a = entre(az, min, max);
    let b = entre(az, min, max);
    const esSuma = az() < 0.5;
    if (!esSuma && a < b) [a, b] = [b, a];
    if (!esSuma && a === b) a++; // evita resultado 0
    const r = esSuma ? a + b : a - b;
    const unidad = 10 ** decimalesDe;
    return {
        enunciado: `${formato(a)} ${esSuma ? '+' : '−'} ${formato(b)} = ?`, respuesta: r, formato,
        pista: `Alinea los puntos decimales y ${esSuma ? 'suma' : 'resta'} como si fueran números enteros.`,
        preferidos: [r + 1, r - 1, r + 10, r - 10, r + unidad, r - unidad]
    };
}

export const GENERADORES = { suma, resta, multiplicacion, division, combinadas, multiplos, decimales };

/**
 * Genera una pregunta completa con sus opciones (para los asteroides).
 *
 * @param {Object} p
 * @param {number} p.grado      1..6
 * @param {string} p.habilidad  clave de GENERADORES
 * @param {number} p.nivel      1..3 (lo decide el motor adaptativo)
 * @param {number} [p.cantidad] cuántas opciones/asteroides (la correcta incluida), 2..8
 * @param {Function} [p.aleatorio]
 * @returns {{habilidad:string, enunciado:string, respuesta:number, textoRespuesta:string,
 *            opciones:{id:number, texto:string}[], pista:string}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 4, aleatorio = Math.random }) {
    const generador = GENERADORES[habilidad];
    if (!generador) throw new Error(`Habilidad desconocida: ${habilidad}`);
    const g = acotar(grado, 1, 6);
    const n = acotar(nivel, 1, NIVEL_MAX);
    const total = acotar(cantidad, 2, 8);

    const base = generador(g, n, aleatorio);
    const formato = base.formato || String;
    const distractores = base.fabricarDistractores
        ? base.fabricarDistractores(total - 1)
        : generarDistractores(base.respuesta, aleatorio, total - 1, { preferidos: base.preferidos });

    const opciones = mezclar(aleatorio, [base.respuesta, ...distractores]).map((id) => ({ id, texto: formato(id) }));
    return {
        habilidad,
        enunciado: base.enunciado,
        respuesta: base.respuesta,
        textoRespuesta: formato(base.respuesta),
        opciones,
        pista: base.pista
    };
}
