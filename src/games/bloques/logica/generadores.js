/**
 * Generación de preguntas de «Bloques de Valor» (lógica pura, sin DOM): valor posicional y llevadas con bloques.
 *
 * Habilidades:
 *   leer      → los bloques muestran un número y se dice cuál es
 *   armar     → «¿qué número tiene 3 centenas, 4 decenas y 7 unidades?» (con ayuda, primero se construye con bloques)
 *   posicion  → el valor de una cifra, una descomposición («5 000 + 300 + 2») y «4 centenas y 15 decenas»
 *   llevada   → suma con bloques: 10 unidades SE CAMBIAN por 1 decena
 *   prestamo  → resta con bloques: 1 decena SE CAMBIA por 10 unidades para poder quitar
 *
 * Grado de CONTENIDO (no escolar) → cuántas cifras:
 *   1.º  2 cifras (leer, armar)             4.º  posición con 5 cifras; llevada y préstamo con 4
 *   2.º  3 cifras; llevada y préstamo con 2 5.º y 6.º  posición con 6 cifras; llevada y préstamo con 4
 *   3.º  4 cifras; llevada y préstamo con 3
 *
 * Contrato de la respuesta (igual que Taller de Cálculo): `respuesta` es el NÚMERO correcto y el `id` de cada opción es
 * su propio valor. Eso permite comprobar la respuesta sin saber en qué orden salieron los botones.
 *
 * Los niveles suben de dificultad CONCEPTUAL: sin ceros → con un cero → con varios ceros (leer/armar); una llevada
 * con un número de una cifra → con uno de dos cifras → varias llevadas seguidas (llevada y préstamo).
 */
import { entre, elegir, mezclar } from '../../../core/aleatorio.js';
import { generarDistractores } from '../../../core/distractores.js';
import { cifras, contarLlevadas, contarPrestamos, sumaSinLlevar, restaAlReves } from '../../../core/cifras.js';

export const NIVEL_MAX = 3;
export const GRADO_MIN = 1;
export const GRADO_MAX = 6;

export const HABILIDADES_POR_GRADO = {
    1: ['leer', 'armar'],
    2: ['leer', 'armar', 'llevada', 'prestamo'],
    3: ['leer', 'armar', 'posicion', 'llevada', 'prestamo'],
    4: ['posicion', 'llevada', 'prestamo'],
    5: ['posicion', 'llevada', 'prestamo'],
    6: ['posicion', 'llevada', 'prestamo']
};

export const NOMBRES_HABILIDAD = {
    leer: 'leer números con bloques', armar: 'armar números', posicion: 'el valor de las cifras',
    llevada: 'sumar con llevadas', prestamo: 'restar con préstamo'
};

/** `cifras`: de cuántas cifras son los números de leer/armar/posición; `cifrasOp`: los de llevada y préstamo. */
export const ESCALAS = {
    1: { cifras: 2, cifrasOp: null },
    2: { cifras: 3, cifrasOp: 2 },
    3: { cifras: 4, cifrasOp: 3 },
    4: { cifras: 5, cifrasOp: 4 },
    5: { cifras: 6, cifrasOp: 4 },
    6: { cifras: 6, cifrasOp: 4 }
};

/** Más de 4 columnas no caben en pantalla: ahí no se dibujan bloques. */
export const MAX_COLUMNAS_BLOQUES = 4;

export const NOMBRES_COLUMNA = {
    singular: ['unidad', 'decena', 'centena', 'unidad de millar', 'decena de millar', 'centena de millar'],
    plural: ['unidades', 'decenas', 'centenas', 'unidades de millar', 'decenas de millar', 'centenas de millar']
};

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, GRADO_MIN, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

export const cantidadOpciones = (nivel) => (nivel <= 1 ? 3 : 4);
export const prepararRonda = (grado, nivel) => ({ cantidad: cantidadOpciones(nivel) });

/** 12345 → «12 345» (con espacio fino que no corta la línea); de 4 cifras o menos se escribe tal cual. */
export const formatoNumero = (n) => (n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n));

/** «3 centenas», «1 decena», «0 unidades»: el nombre concuerda con la cantidad. */
export const cantidadDeColumna = (cantidad, columna) => `${cantidad} ${(cantidad === 1 ? NOMBRES_COLUMNA.singular : NOMBRES_COLUMNA.plural)[columna]}`;

function sortear(propone, cumple, intentos = 8000) {
    for (let i = 0; i < intentos; i++) {
        const candidato = propone();
        if (cumple(candidato)) return candidato;
    }
    throw new Error('No se pudo generar un número válido');
}

const ceros = (n) => [...String(n)].filter((c) => c === '0').length;

// ---------- Números ----------

/** Número de `D` cifras para leer/armar: cuántos ceros lleva depende del nivel (ver la cabecera). */
export function numeroDeCifras(D, nivel, aleatorio) {
    const min = 10 ** (D - 1);
    const max = 10 ** D - 1;
    const cumple = D === 2
        ? [(n) => ceros(n) === 0 && n < 50, (n) => ceros(n) === 0 && n >= 50, (n) => ceros(n) === 1][nivel - 1]
        : [(n) => ceros(n) === 0, (n) => ceros(n) === 1, (n) => ceros(n) >= 2][nivel - 1];
    return sortear(() => entre(aleatorio, min, max), cumple);
}

/** Dos números para sumar con llevadas, con `D` cifras como máximo. */
export function parLlevada(D, nivel, aleatorio) {
    const tope = 10 ** D;
    const reglas = {
        1: ({ a, b }) => b < 10 && contarLlevadas(a, b) === 1,
        2: ({ a, b }) => b >= 10 && contarLlevadas(a, b) === 1,
        3: ({ a, b }) => (D >= 3 ? contarLlevadas(a, b) >= 2 : contarLlevadas(a, b) === 1 && b >= 10 && Math.floor(a / 10) + Math.floor(b / 10) >= 7)
    };
    return sortear(
        () => ({ a: entre(aleatorio, 10 ** (D - 1), tope - 1), b: nivel === 1 ? entre(aleatorio, 1, 9) : entre(aleatorio, 10, tope - 1) }),
        (par) => par.a + par.b < tope && reglas[nivel](par)
    );
}

/** Dos números para restar con préstamo, con `D` cifras. */
export function parPrestamo(D, nivel, aleatorio) {
    const tope = 10 ** D;
    const reglas = {
        1: ({ a, b }) => b < 10 && contarPrestamos(a, b) === 1,
        2: ({ a, b }) => b >= 10 && contarPrestamos(a, b) === 1,
        3: ({ a, b }) => (D >= 3 ? contarPrestamos(a, b) >= 2 : contarPrestamos(a, b) === 1 && b >= 10 && a >= 50 && b >= 30)
    };
    return sortear(
        () => {
            const a = entre(aleatorio, 10 ** (D - 1), tope - 1);
            return { a, b: nivel === 1 ? entre(aleatorio, 1, 9) : entre(aleatorio, 10, a - 1) };
        },
        (par) => par.a > par.b && reglas[nivel](par)
    );
}

// ---------- Opciones ----------

/**
 * Opciones {id: valor, texto}, mezcladas. `obligatorios` es el error MÁS revelador (siempre se ofrece, si es válido);
 * los demás errores salen de `preferidos` y, si no alcanzan, de números cercanos.
 */
function armarOpciones(respuesta, { preferidos, obligatorios = [] }, cantidad, aleatorio) {
    const valido = (n) => Number.isInteger(n) && n >= 0 && n !== respuesta;
    const fijos = [...new Set(obligatorios.filter(valido))].slice(0, cantidad - 1);
    const errores = generarDistractores(respuesta, aleatorio, cantidad - 1 - fijos.length, {
        preferidos: preferidos.filter((p) => valido(p) && !fijos.includes(p)), excluir: fijos
    });
    return mezclar(aleatorio, [respuesta, ...fijos, ...errores].map((valor) => ({ id: valor, texto: formatoNumero(valor) })));
}

/** Errores al leer un número con bloques: invertir el orden, olvidar un cero o sumar las cifras. */
function erroresDeLectura(n) {
    const D = String(n).length;
    const invertido = Number([...String(n)].reverse().join(''));
    const sinCeros = Number(String(n).replace(/0/g, '') || '0');
    return {
        obligatorios: [sinCeros !== n ? sinCeros : invertido],
        preferidos: [invertido, cifras(n, D).reduce((s, c) => s + c, 0), n + 10, n - 10, n + 100, n - 100, n * 10]
    };
}

const PISTAS = {
    leer: 'Cada columna vale diez veces más que la de su derecha. Cuenta los bloques de cada columna y escribe ese número en su lugar; si una columna no tiene bloques, va un 0.',
    armar: 'Cada cantidad va en su columna: las unidades a la derecha, luego las decenas, las centenas… Si una columna no tiene nada, escribe 0 en ese lugar.',
    posicion: 'Cada cifra vale según el lugar donde está: un 4 en las decenas vale 40, en las centenas vale 400. Fíjate en cuántos lugares hay a su derecha.',
    llevada: 'Cuando en una columna hay 10 o más, se cambian 10 por 1 de la columna de la izquierda: 10 unidades = 1 decena, 10 decenas = 1 centena.',
    prestamo: 'Si en una columna no hay bloques para quitar, cambia 1 de la columna de la izquierda por 10 de esta (1 decena = 10 unidades) y sigue quitando.'
};

// ---------- Preguntas ----------

function materialVer(n) {
    const D = String(n).length;
    return { tipo: 'bloques', modo: 'ver', columnas: D, cuenta: cifras(n, D) };
}

function leer({ grado, nivel, cantidad, aleatorio }) {
    const n = numeroDeCifras(ESCALAS[grado].cifras, nivel, aleatorio);
    const errores = erroresDeLectura(n);
    return {
        habilidad: 'leer',
        enunciado: '¿Qué número muestran los bloques?',
        material: materialVer(n),
        respuesta: n,
        textoRespuesta: formatoNumero(n),
        opciones: armarOpciones(n, errores, cantidad, aleatorio),
        pista: PISTAS.leer,
        explicacion: `${cifras(n, String(n).length).map((c, i) => cantidadDeColumna(c, i)).reverse().join(', ')} forman el ${formatoNumero(n)}.`,
        datos: { n }
    };
}

/** «3 centenas, 4 decenas y 7 unidades» (de la columna más alta a las unidades; los ceros se dicen). */
export function descomposicionEnPalabras(n) {
    const D = String(n).length;
    const partes = cifras(n, D).map((c, i) => cantidadDeColumna(c, i)).reverse();
    return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

function armar({ grado, nivel, cantidad, aleatorio, apoyo }) {
    const D = ESCALAS[grado].cifras;
    const n = numeroDeCifras(D, nivel, aleatorio);
    const material = apoyo === 'ninguno' || D > MAX_COLUMNAS_BLOQUES ? null : { tipo: 'bloques', modo: 'construir', columnas: D, cuenta: Array(D).fill(0), objetivo: cifras(n, D) };
    return {
        habilidad: 'armar',
        enunciado: `¿Qué número tiene ${descomposicionEnPalabras(n)}?`,
        material,
        respuesta: n,
        textoRespuesta: formatoNumero(n),
        opciones: armarOpciones(n, erroresDeLectura(n), cantidad, aleatorio),
        pista: PISTAS.armar,
        explicacion: `${descomposicionEnPalabras(n)} forman el ${formatoNumero(n)}.`,
        datos: { n }
    };
}

/** Cifra repetida no sirve para «¿qué valor tiene el 4?»: la pregunta tendría dos respuestas. */
const cifrasUnicas = (n) => new Set(String(n)).size === String(n).length;

function posicion({ grado, nivel, cantidad, aleatorio, apoyo }) {
    const D = ESCALAS[grado].cifras;
    const verBloques = apoyo !== 'ninguno' && D <= MAX_COLUMNAS_BLOQUES;
    if (nivel === 1) {
        const n = sortear(() => entre(aleatorio, 10 ** (D - 1), 10 ** D - 1), (x) => cifrasUnicas(x) && ceros(x) === 0);
        const lugar = entre(aleatorio, 0, D - 1);
        const c = cifras(n, D)[lugar];
        const valor = c * 10 ** lugar;
        return {
            habilidad: 'posicion',
            enunciado: `En el número ${formatoNumero(n)}, ¿qué valor tiene la cifra ${c}?`,
            material: verBloques ? materialVer(n) : null,
            respuesta: valor,
            textoRespuesta: formatoNumero(valor),
            opciones: armarOpciones(valor, { preferidos: [c * 10 ** (lugar + 1), c * 10 ** Math.max(0, lugar - 1), c * 10 ** (lugar + 2), n], obligatorios: [lugar > 0 ? c : c * 10] }, cantidad, aleatorio),
            pista: PISTAS.posicion,
            explicacion: `El ${c} está en el lugar de las ${NOMBRES_COLUMNA.plural[lugar]}, así que vale ${formatoNumero(valor)}.`,
            datos: { n, c, lugar }
        };
    }
    if (nivel === 2) {
        const n = sortear(() => entre(aleatorio, 10 ** (D - 1), 10 ** D - 1), (x) => ceros(x) >= 1);
        const partes = cifras(n, D).map((c, i) => c * 10 ** i).filter((v) => v > 0).reverse();
        return {
            habilidad: 'posicion',
            enunciado: `¿Qué número es ${partes.map(formatoNumero).join(' + ')}?`,
            material: null, // los bloques regalarían la respuesta: aquí se trata de pasar de la suma al número
            respuesta: n,
            textoRespuesta: formatoNumero(n),
            opciones: armarOpciones(n, { preferidos: [Number(partes.map((p) => String(p)[0]).join('')), n + 10, n - 10, n * 10, Math.floor(n / 10)], obligatorios: [Number(partes.map((p) => String(p)[0]).join(''))] }, cantidad, aleatorio),
            pista: PISTAS.posicion,
            explicacion: `${partes.map(formatoNumero).join(' + ')} = ${formatoNumero(n)}. Donde falta un lugar, va un 0.`,
            datos: { n, partes }
        };
    }
    // Nivel 3: «4 centenas y 15 decenas»: la columna de abajo se pasa de 9 y hay que reagrupar
    const alto = entre(aleatorio, 1, D - 1);
    const bajo = entre(aleatorio, 0, alto - 1);
    const a = entre(aleatorio, 1, 9);
    const b = entre(aleatorio, 10, 19);
    const valor = a * 10 ** alto + b * 10 ** bajo;
    return {
        habilidad: 'posicion',
        enunciado: `¿Qué número es ${cantidadDeColumna(a, alto)} y ${cantidadDeColumna(b, bajo)}?`,
        material: null,
        respuesta: valor,
        textoRespuesta: formatoNumero(valor),
        opciones: armarOpciones(valor, { preferidos: [Number(`${a}${b}`), a * 10 ** alto + b, a * 10 ** alto + (b % 10) * 10 ** bajo, valor + 10 ** bajo, valor - 10 ** bajo], obligatorios: [a * 10 ** alto + (b % 10) * 10 ** bajo] }, cantidad, aleatorio),
        pista: PISTAS.posicion,
        explicacion: `${cantidadDeColumna(b, bajo)} son ${formatoNumero(b * 10 ** bajo)}; con ${formatoNumero(a * 10 ** alto)} forman el ${formatoNumero(valor)}.`,
        datos: { a, b, alto, bajo }
    };
}

function llevada({ grado, nivel, cantidad, aleatorio, apoyo }) {
    const D = ESCALAS[grado].cifrasOp;
    const { a, b } = parLlevada(D, nivel, aleatorio);
    const r = a + b;
    const da = cifras(a, D);
    const db = cifras(b, D);
    const columnasConLlevada = da.map((x, i) => i).filter((i) => (da[i] + db[i] + (i > 0 && da[i - 1] + db[i - 1] >= 10 ? 1 : 0)) >= 10);
    return {
        habilidad: 'llevada',
        enunciado: `${a} + ${b} = ?`,
        material: apoyo === 'ninguno' ? null : { tipo: 'bloques', modo: 'juntar', columnas: D, cuenta: da.map((x, i) => x + db[i]), a, b },
        respuesta: r,
        textoRespuesta: String(r),
        opciones: armarOpciones(r, {
            preferidos: [r + 10, r - 10, r + 1, r - 1, ...columnasConLlevada.flatMap((i) => [r - 10 ** (i + 1), r + 10 ** (i + 1)])],
            obligatorios: [sumaSinLlevar(a, b)]
        }, cantidad, aleatorio),
        pista: PISTAS.llevada,
        explicacion: `${a} + ${b} = ${r}. Se cambiaron 10 por 1 en ${columnasConLlevada.length === 1 ? 'una columna' : `${columnasConLlevada.length} columnas`}.`,
        datos: { a, b }
    };
}

function prestamo({ grado, nivel, cantidad, aleatorio, apoyo }) {
    const D = ESCALAS[grado].cifrasOp;
    const { a, b } = parPrestamo(D, nivel, aleatorio);
    const r = a - b;
    const da = cifras(a, D);
    const db = cifras(b, D);
    const columnasConPrestamo = [];
    let presta = 0;
    for (let i = 0; i < D; i++) {
        if (da[i] - presta < db[i]) { columnasConPrestamo.push(i); presta = 1; } else presta = 0;
    }
    return {
        habilidad: 'prestamo',
        enunciado: `${a} − ${b} = ?`,
        material: apoyo === 'ninguno' ? null : { tipo: 'bloques', modo: 'quitar', columnas: D, cuenta: da, quitar: db, a, b },
        respuesta: r,
        textoRespuesta: String(r),
        opciones: armarOpciones(r, {
            preferidos: [r + 10, r - 10, a + b, r + 1, r - 1, ...columnasConPrestamo.flatMap((i) => [r + 10 ** (i + 1), r - 10 ** (i + 1)])],
            obligatorios: [restaAlReves(a, b)]
        }, cantidad, aleatorio),
        pista: PISTAS.prestamo,
        explicacion: `${a} − ${b} = ${r}. Para comprobar: ${r} + ${b} = ${a}.`,
        datos: { a, b }
    };
}

const GENERADORES = { leer, armar, posicion, llevada, prestamo };

/**
 * @param {Object} p
 * @param {number} p.grado       grado de CONTENIDO (1–6)
 * @param {string} p.habilidad   leer | armar | posicion | llevada | prestamo
 * @param {number} p.nivel       1–3
 * @param {string} [p.apoyo]     'completo' | 'ligero' | 'ninguno'
 * @returns {{habilidad:string, tipo:'bloques'|'opciones', apoyo:string, enunciado:string, material:Object|null, respuesta:number,
 *            textoRespuesta:string, opciones:{id:number,texto:string}[], pista:string, explicacion:string, datos:Object}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 3, aleatorio = Math.random, apoyo = 'ninguno' }) {
    const generador = GENERADORES[habilidad];
    if (!generador) throw new Error(`Habilidad desconocida: ${habilidad}`);
    const g = acotar(grado, GRADO_MIN, GRADO_MAX);
    if (!HABILIDADES_POR_GRADO[g].includes(habilidad)) throw new Error(`«${habilidad}» no existe en el grado de contenido ${g}`);
    const base = generador({ grado: g, nivel: acotar(nivel, 1, NIVEL_MAX), cantidad: acotar(cantidad, 2, 4), aleatorio, apoyo });
    return { ...base, apoyo, tipo: base.material ? 'bloques' : 'opciones' };
}
