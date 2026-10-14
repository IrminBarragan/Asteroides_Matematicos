/**
 * Generación de preguntas de «Cajas y Reparto» (lógica pura, sin DOM): multiplicar como GRUPOS IGUALES y ARREGLOS, y
 * dividir como REPARTIR (con residuo). Las dos operaciones comparten material porque son la misma idea vista al revés.
 *
 * Habilidades:
 *   grupos   → «3 cajas con 4 galletas cada una»: se pone cada grupo con objetos (cajas con +/−)
 *   arreglo  → «una cuadrícula de 4 filas y 6 columnas»: se arma con botones de filas y columnas
 *   tabla    → «7 × 8 = ?»: con ayuda se ve la cuadrícula de 7 × 8
 *   repartir → «reparte 13 galletas entre 4 platos»: se da de uno en uno; ¿cuántas le tocan?, ¿cuántas sobran?
 *   inversa  → «20 ÷ 4 = ?» o «? × 4 = 20»: se agregan columnas a una cuadrícula de 4 filas hasta llegar a 20
 *   grande   → ×10, ×100, 23 × 4, 84 ÷ 4…: números grandes, con lección (sin material)
 *
 * Contrato de la respuesta (igual que Taller de Cálculo y Bloques de Valor): `respuesta` es el NÚMERO correcto y el
 * `id` de cada opción es su propio valor.
 */
import { entre, elegir, mezclar } from '../../../core/aleatorio.js';
import { generarDistractores } from '../../../core/distractores.js';

export const NIVEL_MAX = 3;
export const GRADO_MIN = 1;
export const GRADO_MAX = 6;

export const HABILIDADES_POR_GRADO = {
    1: ['grupos', 'repartir'],
    2: ['grupos', 'arreglo', 'tabla', 'repartir'],
    3: ['arreglo', 'tabla', 'repartir', 'inversa'],
    4: ['tabla', 'repartir', 'inversa', 'grande'],
    5: ['tabla', 'repartir', 'inversa', 'grande'],
    6: ['tabla', 'repartir', 'inversa', 'grande']
};

export const NOMBRES_HABILIDAD = {
    grupos: 'grupos iguales', arreglo: 'filas y columnas', tabla: 'las tablas de multiplicar', repartir: 'repartir',
    inversa: 'multiplicar y dividir', grande: 'números grandes'
};

/** Con más objetos que esto, poner o repartir de uno en uno cansa: ahí la pregunta ya no lleva ese material. */
export const MAX_OBJETOS_MATERIAL = 24;

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, GRADO_MIN, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

export const cantidadOpciones = (nivel) => (nivel <= 1 ? 3 : 4);
export const prepararRonda = (grado, nivel) => ({ cantidad: cantidadOpciones(nivel) });

// ---------- Opciones ----------

/** Opciones {id: valor, texto}, mezcladas; `obligatorios` es el error más revelador (siempre se ofrece si es válido). */
function armarOpciones(respuesta, { preferidos, obligatorios = [], error = null }, cantidad, aleatorio) {
    const valido = (n) => Number.isInteger(n) && n >= 0 && n !== respuesta;
    const fijos = [...new Set(obligatorios.filter(valido))].slice(0, cantidad - 1);
    const errores = generarDistractores(respuesta, aleatorio, cantidad - 1 - fijos.length, {
        preferidos: preferidos.filter((p) => valido(p) && !fijos.includes(p)), excluir: fijos
    });
    return mezclar(aleatorio, [respuesta, ...fijos, ...errores].map((valor) => ({ id: valor, texto: String(valor), ...(error && fijos.includes(valor) ? { error } : {}) })));
}

// ---------- Palabras ----------

const COSAS = [
    { p: 'galletas', g: 'f' }, { p: 'canicas', g: 'f' }, { p: 'manzanas', g: 'f' }, { p: 'estampas', g: 'f' },
    { p: 'globos', g: 'm' }, { p: 'lápices', g: 'm' }, { p: 'dulces', g: 'm' }, { p: 'carritos', g: 'm' }
];
const CONTENEDORES = [{ s: 'caja', p: 'cajas' }, { s: 'bolsa', p: 'bolsas' }, { s: 'canasta', p: 'canastas' }, { s: 'charola', p: 'charolas' }];
const cuantas = (cosa) => (cosa.g === 'f' ? 'Cuántas' : 'Cuántos');

const PISTAS = {
    grupos: 'Multiplicar es sumar grupos iguales: cuenta cuántos hay en cada caja y suma lo mismo tantas veces como cajas haya.',
    arreglo: 'Una cuadrícula tiene filas (de lado a lado) y columnas (de arriba abajo). El total es lo que hay en una fila por el número de filas.',
    tabla: 'Piensa en una cuadrícula: un número es las filas y el otro las columnas. También puedes sumar el mismo número varias veces.',
    repartir: 'Repartir es dar de uno en uno a cada plato hasta que ya no alcance para dar a todos. Lo que toca a cada uno es el cociente; lo que no se pudo repartir es el residuo.',
    inversa: 'Dividir es lo contrario de multiplicar: ¿por qué número hay que multiplicar el divisor para llegar al total?',
    grande: 'Descompón el número grande en partes fáciles (decenas, centenas), opera con cada parte y junta los resultados.'
};

// ---------- Tablas por grado y nivel ----------

/** Qué tablas se trabajan en cada grado de contenido y nivel (la tabla del 2, la del 5…). */
export const TABLAS = {
    2: [[2, 10], [5], [3, 4]],
    3: [[2, 5, 10], [3, 4, 6], [7, 8, 9]],
    4: [[6, 7], [8, 9], [6, 7, 8, 9]],
    5: [[6, 7, 8, 9], [11, 12], [7, 8, 9, 11, 12]],
    6: [[6, 7, 8, 9], [11, 12], [7, 8, 9, 11, 12]]
};

/** Factor y tabla para multiplicar (el factor va de 2 a 10, salvo en 2.º que llega a 6). */
function parDeTabla(grado, nivel, aleatorio) {
    const tabla = elegir(aleatorio, TABLAS[grado][nivel - 1]);
    const factor = entre(aleatorio, 2, grado === 2 ? 6 : 10);
    return aleatorio() < 0.5 ? [tabla, factor] : [factor, tabla];
}

// ---------- Preguntas ----------

function grupos({ grado, nivel, cantidad, aleatorio }) {
    // Tablas pequeñas (para poner de uno en uno): 1.º del 2, 5, 10; 2.º con más; nunca más de 24 objetos
    const tablas = grado === 1 ? [[2], [5, 10], [3, 4]][nivel - 1] : [[2, 5, 10], [3, 4], [6, 8]][nivel - 1];
    const b = elegir(aleatorio, tablas);
    const a = entre(aleatorio, 2, Math.min(grado === 1 ? 5 : 6, Math.floor(24 / b)));
    const total = a * b;
    const cosa = elegir(aleatorio, COSAS);
    const cont = elegir(aleatorio, CONTENEDORES);
    return {
        habilidad: 'grupos',
        enunciado: `${a} ${cont.p} con ${b} ${cosa.p} cada una. ¿${cuantas(cosa)} ${cosa.p} hay en total?`,
        material: { tipo: 'grupos', modo: 'construir', grupos: a, objetivo: b, contenedor: cont.s, cosa: cosa.p },
        respuesta: total,
        textoRespuesta: String(total),
        opciones: armarOpciones(total, { preferidos: [a * (b + 1), (a + 1) * b, a * (b - 1), (a - 1) * b], obligatorios: [a + b], error: 'sumó en vez de multiplicar' }, cantidad, aleatorio),
        pista: PISTAS.grupos,
        explicacion: `${a} grupos de ${b} son ${total}: ${Array(a).fill(b).join(' + ')} = ${total}.`,
        datos: { a, b }
    };
}

function arreglo({ grado, nivel, cantidad, aleatorio }) {
    const [maxF, maxC] = grado === 2 ? [[2, 5], [4, 5], [5, 6]][nivel - 1] : [[5, 5], [6, 6], [10, 10]][nivel - 1];
    const f = entre(aleatorio, 2, maxF);
    const c = entre(aleatorio, 2, maxC);
    const total = f * c;
    return {
        habilidad: 'arreglo',
        enunciado: `Una cuadrícula tiene ${f} filas y ${c} columnas. ¿Cuántos cuadros tiene en total?`,
        material: { tipo: 'cuadricula', modo: 'construir', filas: f, columnas: c },
        respuesta: total,
        textoRespuesta: String(total),
        opciones: armarOpciones(total, { preferidos: [f * (c + 1), (f + 1) * c, f * (c - 1), (f - 1) * c], obligatorios: [f + c], error: 'sumó en vez de multiplicar' }, cantidad, aleatorio),
        pista: PISTAS.arreglo,
        explicacion: `${f} filas de ${c} cuadros: ${f} × ${c} = ${total}.`,
        datos: { a: f, b: c }
    };
}

function tabla({ grado, nivel, cantidad, aleatorio, apoyo }) {
    const [a, b] = parDeTabla(grado, nivel, aleatorio);
    const total = a * b;
    return {
        habilidad: 'tabla',
        enunciado: `${a} × ${b} = ?`,
        // La cuadrícula de a × b ayuda a ver la tabla; no regala la respuesta (hay que contar o saber filas × columnas)
        material: apoyo === 'ninguno' || a > 10 || b > 10 ? null : { tipo: 'cuadricula', modo: 'ver', filas: a, columnas: b },
        respuesta: total,
        textoRespuesta: String(total),
        opciones: armarOpciones(total, { preferidos: [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, total + 10, total - 10], obligatorios: [a + b], error: 'sumó en vez de multiplicar' }, cantidad, aleatorio),
        pista: PISTAS.tabla,
        explicacion: `${a} × ${b} = ${total}.`,
        datos: { a, b }
    };
}

/** Cuántos platos y cuánto toca a cada uno, por grado y nivel. `sobra` dice si el reparto deja residuo. */
function datosDeReparto(grado, nivel, aleatorio) {
    if (grado <= 3) {
        const [divisores, maxQ, residuo] = {
            1: [[[2], 4, false], [[3], 4, false], [[2, 3], 4, false]],
            2: [[[2, 5], 4, false], [[3, 4], 5, false], [[2, 3, 4, 5], 5, false]],
            3: [[[2, 3, 4, 5], 6, false], [[3, 4, 5], 6, true], [[3, 4, 5, 6], 6, true]]
        }[grado][nivel - 1];
        const d = elegir(aleatorio, divisores);
        const q = entre(aleatorio, 1, maxQ);
        const r = residuo ? entre(aleatorio, 1, d - 1) : 0;
        return { d, q, r };
    }
    // 4.º a 6.º: números más grandes, sin material (no caben de uno en uno)
    const topeN = { 4: 99, 5: 200, 6: 500 }[grado];
    const d = entre(aleatorio, 2, 9);
    const q = entre(aleatorio, 5, Math.floor((topeN - (d - 1)) / d));
    const r = nivel === 1 ? 0 : entre(aleatorio, 1, d - 1);
    return { d, q, r };
}

function repartir({ grado, nivel, cantidad, aleatorio }) {
    const { d, q, r } = datosDeReparto(grado, nivel, aleatorio);
    const N = d * q + r;
    const cosa = elegir(aleatorio, COSAS);
    // ¿Qué se pregunta? Con residuo: a veces cuántas le tocan a cada uno y a veces cuántas sobran
    const pide = r > 0 && (nivel === 2 || (nivel === 3 && aleatorio() < 0.5)) ? 'sobran' : 'cada';
    const respuesta = pide === 'sobran' ? r : q;
    const material = N <= MAX_OBJETOS_MATERIAL && d <= 6
        ? { tipo: 'reparto', modo: 'repartir', pool: N, grupos: d, pide, cosa: cosa.p, d, q, r }
        : null;
    return {
        habilidad: 'repartir',
        enunciado: `Se reparten ${N} ${cosa.p} en partes iguales entre ${d} platos. ¿${cuantas(cosa)} ${cosa.p} ${pide === 'sobran' ? 'sobran' : 'le tocan a cada plato'}?`,
        material,
        respuesta,
        textoRespuesta: String(respuesta),
        opciones: armarOpciones(respuesta, pide === 'sobran'
            ? { preferidos: [r + 1, r - 1, d - r, d, r + 2], obligatorios: [q], error: 'dio el cociente en vez del residuo' }
            : { preferidos: [q + 1, q - 1, q + 2, N - d, d], obligatorios: r > 0 ? [r] : [d], error: r > 0 ? 'dio el residuo en vez del cociente' : 'dio el divisor en vez del cociente' }, cantidad, aleatorio),
        pista: PISTAS.repartir,
        explicacion: r === 0
            ? `${N} ÷ ${d} = ${q}: a cada plato le tocan ${q}. Para comprobar: ${d} × ${q} = ${N}.`
            : `${N} ÷ ${d}: a cada plato le tocan ${q} y sobran ${r}. Para comprobar: ${d} × ${q} + ${r} = ${N}.`,
        datos: { N, d, q, r, pide }
    };
}

function inversa({ grado, nivel, cantidad, aleatorio }) {
    const tabla = elegir(aleatorio, TABLAS[grado][nivel - 1]);
    const q = entre(aleatorio, 2, grado === 3 ? 10 : 12);
    const d = tabla;
    const N = d * q;
    const forma = elegir(aleatorio, ['dividir', 'factor', 'factor']);
    const enunciado = forma === 'dividir' ? `${N} ÷ ${d} = ?` : aleatorio() < 0.5 ? `? × ${d} = ${N}` : `${d} × ? = ${N}`;
    return {
        habilidad: 'inversa',
        enunciado,
        material: d <= 10 && q <= 12 ? { tipo: 'cuadricula', modo: 'completar', filas: d, objetivoTotal: N } : null,
        respuesta: q,
        textoRespuesta: String(q),
        opciones: armarOpciones(q, { preferidos: [q + 1, q - 1, q + 2, d, N - d], obligatorios: [N - d], error: 'restó en vez de dividir' }, cantidad, aleatorio),
        pista: PISTAS.inversa,
        explicacion: `${d} × ${q} = ${N}, por eso ${N} ÷ ${d} = ${q}.`,
        datos: { N, d, q }
    };
}

/** Las seis clases de operación con números grandes y en qué grado y nivel aparece cada una. */
const GRANDES = {
    4: ['por-potencia', 'dos-por-uno', 'dividir-dos'],
    5: ['dos-por-uno', 'tres-por-uno', 'dividir-tres'],
    6: ['dos-por-decenas', 'dos-por-dos', 'dividir-cuatro']
};

function grande({ grado, nivel, cantidad, aleatorio }) {
    const clase = GRANDES[grado][nivel - 1];
    let enunciado;
    let respuesta;
    let datos;
    let errores;
    let obligatorios = [];
    let nombreError = 'se equivocó en una cifra';
    const sinLlevar = (n, k) => [...String(n)].reverse().reduce((s, c, i) => s + ((Number(c) * k) % 10) * 10 ** i, 0);
    if (clase === 'por-potencia') {
        const a = entre(aleatorio, 12, 99);
        const k = elegir(aleatorio, [10, 100, 1000]);
        respuesta = a * k;
        enunciado = `${a} × ${k} = ?`;
        datos = { tipo: 'mult', a, b: k };
        obligatorios = [a * (k / 10)];
        nombreError = 'puso un cero de menos';
        errores = [a * k * 10, a * (k / 10), a + k, a * k + a];
    } else if (clase === 'dos-por-uno' || clase === 'tres-por-uno') {
        const a = clase === 'dos-por-uno' ? entre(aleatorio, 12, 99) : entre(aleatorio, 101, 999);
        const b = entre(aleatorio, 3, 9);
        respuesta = a * b;
        enunciado = `${a} × ${b} = ?`;
        datos = { tipo: 'mult', a, b };
        obligatorios = [sinLlevar(a, b)];
        nombreError = 'no llevó al multiplicar';
        errores = [respuesta + 10, respuesta - 10, respuesta + 100, respuesta - 100];
    } else if (clase === 'dos-por-decenas') {
        const a = entre(aleatorio, 12, 99);
        const b = entre(aleatorio, 2, 9) * 10;
        respuesta = a * b;
        enunciado = `${a} × ${b} = ?`;
        datos = { tipo: 'mult', a, b };
        obligatorios = [(a * b) / 10];
        nombreError = 'puso un cero de menos';
        errores = [(a * b) * 10, respuesta + 100, respuesta - 100];
    } else if (clase === 'dos-por-dos') {
        const a = entre(aleatorio, 12, 99);
        const b = entre(aleatorio, 11, 29);
        respuesta = a * b;
        enunciado = `${a} × ${b} = ?`;
        datos = { tipo: 'mult', a, b };
        obligatorios = [a * (b - (b % 10)) + (a % 10) * (b % 10)];
        nombreError = 'olvidó parte de los productos parciales';
        errores = [respuesta + 10, respuesta - 10, respuesta + 100, respuesta - 100];
    } else {
        const d = entre(aleatorio, 2, 9);
        const [minQ, maxQ] = { 'dividir-dos': [11, 99], 'dividir-tres': [101, 999], 'dividir-cuatro': [1001, 9999] }[clase];
        const q = entre(aleatorio, minQ, Math.floor(maxQ / d) >= minQ ? Math.floor(maxQ / d) : maxQ);
        const a = d * q;
        respuesta = q;
        enunciado = `${a} ÷ ${d} = ?`;
        datos = { tipo: 'div', a, d };
        obligatorios = [Number(String(q).slice(0, -1) + String((Number(String(q).slice(-1)) + 1) % 10))];
        errores = [q + 1, q - 1, q + 10, q - 10, q * 10];
    }
    return {
        habilidad: 'grande',
        enunciado,
        material: null,
        respuesta,
        textoRespuesta: String(respuesta),
        opciones: armarOpciones(respuesta, { preferidos: errores, obligatorios, error: nombreError }, cantidad, aleatorio),
        pista: PISTAS.grande,
        explicacion: `${enunciado.replace('?', String(respuesta))}.`,
        datos
    };
}

const GENERADORES = { grupos, arreglo, tabla, repartir, inversa, grande };

/**
 * @param {Object} p
 * @param {number} p.grado       grado de CONTENIDO (1–6)
 * @param {string} p.habilidad   grupos | arreglo | tabla | repartir | inversa | grande
 * @param {number} p.nivel       1–3
 * @param {string} [p.apoyo]     'completo' | 'ligero' | 'ninguno'
 * @returns {{habilidad:string, tipo:'material'|'opciones', apoyo:string, enunciado:string, material:Object|null, respuesta:number,
 *            textoRespuesta:string, opciones:{id:number,texto:string}[], pista:string, explicacion:string, datos:Object}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 3, aleatorio = Math.random, apoyo = 'ninguno' }) {
    const generador = GENERADORES[habilidad];
    if (!generador) throw new Error(`Habilidad desconocida: ${habilidad}`);
    const g = acotar(grado, GRADO_MIN, GRADO_MAX);
    if (!HABILIDADES_POR_GRADO[g].includes(habilidad)) throw new Error(`«${habilidad}» no existe en el grado de contenido ${g}`);
    const base = generador({ grado: g, nivel: acotar(nivel, 1, NIVEL_MAX), cantidad: acotar(cantidad, 2, 4), aleatorio, apoyo });
    // En «ninguno» no hay material, salvo en los casos donde el material ES la pregunta (aquí no hay ninguno)
    const material = apoyo === 'ninguno' ? null : base.material;
    return { ...base, material, apoyo, tipo: material ? 'material' : 'opciones' };
}
