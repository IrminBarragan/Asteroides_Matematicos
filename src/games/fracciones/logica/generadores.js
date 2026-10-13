/**
 * Generación de preguntas de "Tren de Fracciones" (lógica pura, sin DOM).
 *
 * Habilidades por grado:
 *   3.º identificar (qué fracción está pintada), pintar (pinta la fracción), comparar-visual (barras)
 *   4.º identificar, equivalentes, comparar
 *   5.º equivalentes, simplificar, suma-resta (denominadores iguales o múltiplos), comparar
 *   6.º suma-resta (cualquier denominador), mixtas, decimales, simplificar
 *
 * Tipos de pregunta:
 *   'opciones' → se elige entre botones (ids 0..n-1; la correcta es la 0 antes de mezclar)
 *   'pintar'   → el niño toca partes de una figura; `respuesta` es CUÁNTAS partes hay que pintar
 *
 * Toda la aritmética usa `core/fracciones.js` (enteros): nunca decimales de punto flotante.
 *
 * Regla de calidad de los distractores: ningún error puede ser TAMBIÉN una respuesta correcta. Por eso, salvo en
 * "simplificar" (donde 6/8 sí es un error válido: es equivalente pero no está simplificada), se descartan los
 * errores equivalentes a la respuesta (`elegirFracciones`).
 */
import { entre, elegir, mezclar } from '../../../core/aleatorio.js';
import {
    mcd, simplificar, estaSimplificada, comparar as compararFracciones, sonEquivalentes, aDenominadorComun,
    sumar, restar, multiplicarPorFactor, desdeMixta, centesimas, formatoDecimal, formato, formatoMixto,
    fraccionEnPalabras
} from '../../../core/fracciones.js';

export const NIVEL_MAX = 3;
export const GRADO_MIN = 3;
export const GRADO_MAX = 6;

export const HABILIDADES_POR_GRADO = {
    3: ['identificar', 'pintar', 'comparar-visual'],
    4: ['identificar', 'equivalentes', 'comparar'],
    5: ['equivalentes', 'simplificar', 'suma-resta', 'comparar'],
    6: ['suma-resta', 'mixtas', 'decimales', 'simplificar']
};

export const NOMBRES_HABILIDAD = {
    identificar: 'leer fracciones', pintar: 'pintar fracciones', 'comparar-visual': 'comparar con dibujos',
    equivalentes: 'fracciones equivalentes', comparar: 'comparar fracciones', simplificar: 'simplificar fracciones',
    'suma-resta': 'sumar y restar fracciones', mixtas: 'números mixtos', decimales: 'fracciones y decimales'
};

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);
const frac = (n, d) => ({ n, d });
/** Texto de una fracción; un entero se escribe sin «/1» (el resultado de 1/3 + 2/3 es 1, no 1/1). */
const fmt = (f) => (f.d === 1 ? String(f.n) : formato(f));

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, GRADO_MIN, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

/** Cuántos botones: 3 en el nivel fácil y 4 después. */
export function cantidadOpciones(nivel) {
    return nivel <= 1 ? 3 : 4;
}

export function prepararRonda(grado, nivel) {
    return { cantidad: cantidadOpciones(nivel) };
}

// ---------- Ayudas comunes ----------

const esFraccionValida = (f) => Number.isInteger(f.n) && Number.isInteger(f.d) && f.n >= 1 && f.d >= 1;

/**
 * Elige `cantidad` errores DISTINTOS de la respuesta: primero los típicos (`candidatos`, mezclados) y, si no alcanzan,
 * los completa con `relleno()`. `clave` decide cuándo dos opciones son "la misma"; `admitido` filtra los inválidos.
 */
function elegirErrores({ correcta, candidatos, cantidad, aleatorio, relleno, clave, admitido = () => true }) {
    const usadas = new Set([clave(correcta)]);
    const errores = [];
    const agregar = (c) => {
        if (errores.length >= cantidad || c === null || c === undefined) return;
        const k = clave(c);
        if (usadas.has(k) || !admitido(c)) return;
        usadas.add(k);
        errores.push(c);
    };
    mezclar(aleatorio, candidatos).forEach(agregar);
    for (let intentos = 0; errores.length < cantidad && intentos < 500; intentos++) agregar(relleno());
    if (errores.length < cantidad) throw new Error(`No se pudieron generar ${cantidad} errores distintos de «${clave(correcta)}»`);
    return errores;
}

/** Errores que son fracciones: válidos, distintos y (salvo `permitirEquivalentes`) NO equivalentes a la correcta. */
function elegirFracciones({ correcta, candidatos, cantidad, aleatorio, relleno, permitirEquivalentes = false }) {
    return elegirErrores({
        correcta, candidatos, cantidad, aleatorio, relleno, clave: formato,
        admitido: (f) => esFraccionValida(f) && (permitirEquivalentes || !sonEquivalentes(f, correcta))
    });
}

/** `items` = [correcta, ...errores] (cada uno con `texto`); asigna ids con la correcta = 0 y mezcla el orden. */
function armarOpciones(items, aleatorio) {
    return mezclar(aleatorio, items.map((item, id) => ({ ...item, id })));
}

const opcionFraccion = (f) => (f.d === 1 ? { texto: String(f.n) } : { texto: fmt(f), fraccion: f });
const opcionMixta = (m) => ({ texto: formatoMixto(m), mixta: m });
const opcionTexto = (texto) => ({ texto });

const propia = (aleatorio, d) => frac(entre(aleatorio, 1, d - 1), d);

const PISTAS = {
    identificar: 'El número de ABAJO (denominador) dice en cuántas partes iguales está dividida la figura; el de ARRIBA (numerador), cuántas están pintadas.',
    pintar: 'El número de ABAJO dice en cuántas partes iguales está dividida la figura; el de ARRIBA, cuántas hay que pintar.',
    'comparar-visual': 'Mira cuánto está pintado de cada figura. Si las partes son del mismo tamaño, gana la que tiene más pintadas.',
    equivalentes: 'Dos fracciones son equivalentes si valen lo mismo: se obtienen multiplicando (o dividiendo) el numerador y el denominador por el MISMO número.',
    comparar: 'Con el mismo denominador, gana el numerador mayor. Con el mismo numerador, gana la de denominador MENOR. Si no, multiplica en cruz.',
    simplificar: 'Divide el numerador y el denominador entre el mismo número, el más grande que puedas. Termina cuando ya no haya un número que divida a los dos.',
    'suma-resta': 'Primero busca un denominador común (el mcm). Luego suma o resta solo los numeradores; el denominador NO se suma.',
    mixtas: 'Un número mixto es enteros más una fracción propia. Para pasar a impropia: entero × denominador + numerador, sobre el mismo denominador.',
    decimales: 'Las cifras después del punto son décimas, centésimas… Busca una fracción equivalente con denominador 10 o 100 (multiplica arriba y abajo por el mismo número).'
};

// ---------- Identificar y pintar ----------

const DENOMINADORES = {
    3: [[2, 3, 4], [2, 3, 4, 5, 6], [2, 3, 4, 5, 6, 8, 10]],
    4: [[3, 4, 5, 6], [2, 3, 4, 5, 6, 7, 8], [5, 6, 7, 8, 9, 10, 12]]
};

export function denominadoresVisuales(grado, nivel) {
    return DENOMINADORES[acotar(grado, 3, 4)][acotar(nivel, 1, NIVEL_MAX) - 1];
}

const FORMAS = ['barra', 'pastel'];

function identificar({ grado, nivel, cantidad, aleatorio }) {
    const d = elegir(aleatorio, denominadoresVisuales(grado, nivel));
    const n = entre(aleatorio, 1, d - 1);
    const correcta = frac(n, d);
    const errores = elegirFracciones({
        correcta, cantidad: cantidad - 1, aleatorio,
        // lo no pintado, "partes pintadas contra no pintadas", fracción al revés, contar mal por una parte
        candidatos: [frac(d - n, d), frac(n, d - n), frac(d, n), frac(n, d + 1), frac(n + 1, d), frac(n - 1, d)],
        relleno: () => frac(entre(aleatorio, 1, d + 1), d)
    });
    return {
        tipo: 'opciones', enunciado: '¿Qué fracción de la figura está pintada?',
        visuales: [{ forma: elegir(aleatorio, FORMAS), n, d }],
        textoRespuesta: fmt(correcta),
        opciones: armarOpciones([correcta, ...errores].map(opcionFraccion), aleatorio),
        pista: PISTAS.identificar,
        explicacion: `La figura tiene ${d} partes iguales (denominador) y ${n} están pintadas (numerador): ${fmt(correcta)}, que se lee «${fraccionEnPalabras(correcta)}».`
    };
}

function pintar({ grado, nivel, aleatorio }) {
    const d = elegir(aleatorio, denominadoresVisuales(grado, nivel));
    const n = entre(aleatorio, 1, d - 1);
    const f = frac(n, d);
    return {
        tipo: 'pintar', enunciado: `Pinta ${fmt(f)} de la figura (${fraccionEnPalabras(f)}).`,
        expresion: [{ fraccion: f }], visuales: [], figura: { forma: elegir(aleatorio, FORMAS), d },
        respuesta: n, textoRespuesta: `${n} de ${d} partes`, opciones: [],
        pista: PISTAS.pintar,
        explicacion: `${fmt(f)} significa ${n} de ${d} partes iguales: hay que pintar ${n}.`
    };
}

// ---------- Comparar ----------

const MODOS_COMPARAR = {
    3: [['mismo-d'], ['mismo-n', 'mismo-d'], ['general', 'mismo-n']],
    4: [['mismo-d', 'mismo-n'], ['general'], ['general', 'equivalentes']],
    5: [['general'], ['general', 'equivalentes'], ['general', 'equivalentes']],
    6: [['general'], ['general', 'equivalentes'], ['general', 'equivalentes']]
};
const DMAX_COMPARAR = { 3: [8, 8, 8], 4: [6, 10, 12], 5: [8, 12, 12], 6: [8, 12, 12] };

export function modosComparar(grado, nivel) {
    return MODOS_COMPARAR[acotar(grado, GRADO_MIN, GRADO_MAX)][acotar(nivel, 1, NIVEL_MAX) - 1];
}

function parComparar(grado, nivel, aleatorio) {
    const modo = elegir(aleatorio, modosComparar(grado, nivel));
    const dMax = DMAX_COMPARAR[acotar(grado, GRADO_MIN, GRADO_MAX)][acotar(nivel, 1, NIVEL_MAX) - 1];
    for (let i = 0; i < 200; i++) {
        let a;
        let b;
        if (modo === 'mismo-d') {
            const d = entre(aleatorio, 3, dMax);
            a = propia(aleatorio, d); b = propia(aleatorio, d);
        } else if (modo === 'mismo-n') {
            const n = entre(aleatorio, 1, 3);
            a = frac(n, entre(aleatorio, n + 1, dMax)); b = frac(n, entre(aleatorio, n + 1, dMax));
        } else if (modo === 'equivalentes') {
            const k = elegir(aleatorio, [2, 3]);
            a = propia(aleatorio, entre(aleatorio, 2, Math.floor(dMax / k)));
            b = multiplicarPorFactor(a, k);
        } else {
            a = propia(aleatorio, entre(aleatorio, 2, dMax)); b = propia(aleatorio, entre(aleatorio, 2, dMax));
        }
        if (fmt(a) === fmt(b)) continue;
        if (modo !== 'equivalentes' && sonEquivalentes(a, b)) continue;
        return aleatorio() < 0.5 ? [a, b] : [b, a];
    }
    return [frac(1, 2), frac(1, 3)]; // inalcanzable en la práctica; evita un bucle infinito
}

function explicacionComparar(a, b, mayor) {
    const cmp = compararFracciones(a, b);
    if (cmp === 0) return `${fmt(a)} y ${fmt(b)} son equivalentes: valen lo mismo (una se obtiene de la otra multiplicando arriba y abajo por el mismo número).`;
    const gana = cmp > 0 ? a : b;
    const pierde = cmp > 0 ? b : a;
    const elegida = mayor ? gana : pierde;
    const adjetivo = mayor ? 'mayor' : 'menor';
    if (a.d === b.d) return `Con el mismo denominador se compara el numerador: ${gana.n} > ${pierde.n}, así que ${fmt(elegida)} es ${adjetivo}.`;
    if (a.n === b.n) return `Con el mismo numerador, las partes más pequeñas son las del denominador mayor: ${fmt(gana)} > ${fmt(pierde)}, así que ${fmt(elegida)} es ${adjetivo}.`;
    return `Multiplicando en cruz: ${a.n}×${b.d} = ${a.n * b.d} y ${b.n}×${a.d} = ${b.n * a.d}. ${fmt(gana)} > ${fmt(pierde)}, así que ${fmt(elegida)} es ${adjetivo}.`;
}

function compararFraccionesPregunta({ grado, nivel, aleatorio }, visual) {
    const [a, b] = parComparar(grado, nivel, aleatorio);
    const mayor = nivel < 2 || aleatorio() < 0.5;
    const cmp = compararFracciones(a, b);
    const items = [opcionFraccion(a), opcionFraccion(b), opcionTexto('Son iguales')];
    const indiceCorrecta = cmp === 0 ? 2 : (cmp > 0) === mayor ? 0 : 1;
    const ordenadas = [items[indiceCorrecta], ...items.filter((_, i) => i !== indiceCorrecta)];
    return {
        tipo: 'opciones',
        enunciado: `¿Cuál fracción es ${mayor ? 'mayor' : 'menor'}: ${fmt(a)} o ${fmt(b)}?`,
        visuales: visual ? [a, b].map((f) => ({ forma: 'barra', n: f.n, d: f.d, etiqueta: fmt(f) })) : [],
        expresion: visual ? [] : [{ fraccion: a }, { texto: '?' }, { fraccion: b }],
        textoRespuesta: ordenadas[0].texto,
        opciones: armarOpciones(ordenadas, aleatorio),
        pista: PISTAS[visual ? 'comparar-visual' : 'comparar'],
        explicacion: explicacionComparar(a, b, mayor)
    };
}

// ---------- Equivalentes ----------

const FACTORES = { 1: [2, 3], 2: [2, 3, 4, 5], 3: [2, 3, 4, 5, 6, 8] };

export function factoresEquivalencia(nivel) {
    return FACTORES[acotar(nivel, 1, NIVEL_MAX)];
}

function equivalentes({ nivel, cantidad, aleatorio }) {
    const k = elegir(aleatorio, factoresEquivalencia(nivel));
    const dBase = entre(aleatorio, 2, Math.min(6, Math.floor(36 / k)));
    const base = propia(aleatorio, dBase);
    const objetivo = multiplicarPorFactor(base, k);
    const regla = `${fmt(base)} = ${fmt(objetivo)}: se multiplicó arriba y abajo por ${k} (${base.n}×${k} = ${objetivo.n} y ${base.d}×${k} = ${objetivo.d}). Lo que se hace abajo se hace también arriba.`;

    const variante = nivel === 1 ? 'elige' : elegir(aleatorio, ['elige', 'falta-numerador', 'falta-denominador']);
    if (variante === 'elige') {
        const errores = elegirFracciones({
            correcta: objetivo, cantidad: cantidad - 1, aleatorio,
            // error clásico: SUMAR el mismo número arriba y abajo en vez de multiplicar
            candidatos: [frac(base.n + k, base.d + k), frac(objetivo.n, base.d), frac(base.n, objetivo.d),
                frac(objetivo.n, objetivo.d + 1), frac(objetivo.n + 1, objetivo.d), frac(base.n * (k + 1), base.d * k)],
            relleno: () => frac(entre(aleatorio, 1, 20), entre(aleatorio, 2, 24))
        });
        return {
            tipo: 'opciones', enunciado: `¿Cuál fracción es equivalente a ${fmt(base)}?`,
            visuales: [{ forma: 'barra', n: base.n, d: base.d }], expresion: [{ fraccion: base }],
            textoRespuesta: fmt(objetivo), opciones: armarOpciones([objetivo, ...errores].map(opcionFraccion), aleatorio),
            pista: PISTAS.equivalentes, explicacion: regla
        };
    }

    const faltaNumerador = variante === 'falta-numerador';
    const correcta = faltaNumerador ? objetivo.n : objetivo.d;
    const candidatos = faltaNumerador
        ? [base.n + (objetivo.d - base.d), base.n + k, objetivo.n + 1, objetivo.n - 1, objetivo.n + 2, objetivo.n - 2, objetivo.d - base.n]
        : [base.d + (objetivo.n - base.n), base.d + k, objetivo.d + 1, objetivo.d - 1, objetivo.d + 2, objetivo.d - 2, objetivo.n + base.d];
    const errores = elegirErrores({
        correcta, candidatos, cantidad: cantidad - 1, aleatorio, clave: String,
        admitido: (x) => Number.isInteger(x) && x >= 1,
        relleno: () => Math.max(1, correcta + entre(aleatorio, -6, 6))
    });
    return {
        tipo: 'opciones', enunciado: `¿Qué número falta para que las fracciones sean equivalentes?`,
        visuales: [],
        expresion: [{ fraccion: base }, { texto: '=' }, { fraccion: faltaNumerador ? { n: '?', d: objetivo.d } : { n: objetivo.n, d: '?' } }],
        textoRespuesta: String(correcta), opciones: armarOpciones([correcta, ...errores].map((x) => opcionTexto(String(x))), aleatorio),
        pista: PISTAS.equivalentes, explicacion: regla
    };
}

// ---------- Simplificar ----------

const SIMPLIFICAR = {
    1: { factores: [2, 3, 5], dBase: [2, 3, 4, 5] },
    2: { factores: [2, 3, 4, 5, 6], dBase: [2, 3, 4, 5, 7, 8] },
    3: { factores: [2, 3, 4, 5, 6, 8, 9, 10, 12], dBase: [3, 4, 5, 7, 8, 9, 10] }
};

export function configuracionSimplificar(nivel) {
    return SIMPLIFICAR[acotar(nivel, 1, NIVEL_MAX)];
}

function divisoresPropios(g) {
    const lista = [];
    for (let k = 2; k < g; k++) if (g % k === 0) lista.push(k);
    return lista;
}

function simplificarPregunta({ nivel, cantidad, aleatorio }) {
    const c = configuracionSimplificar(nivel);
    let irreducible;
    do {
        const d0 = elegir(aleatorio, c.dBase);
        irreducible = frac(entre(aleatorio, 1, d0 - 1), d0);
    } while (!estaSimplificada(irreducible));
    const g = elegir(aleatorio, c.factores);
    const grande = multiplicarPorFactor(irreducible, g);

    // Errores valiosos: simplificar "a medias" (equivalente pero NO irreducible) o no simplificar nada
    const aMedias = divisoresPropios(g).map((k) => multiplicarPorFactor(irreducible, g / k));
    const errores = elegirFracciones({
        correcta: irreducible, cantidad: cantidad - 1, aleatorio, permitirEquivalentes: true,
        candidatos: [...aMedias, grande, frac(irreducible.n, grande.d), frac(grande.n, irreducible.d),
            frac(irreducible.d, irreducible.n), frac(irreducible.n + 1, irreducible.d), frac(irreducible.n, irreducible.d + 1)],
        relleno: () => frac(entre(aleatorio, 1, 12), entre(aleatorio, 2, 14))
    });
    const divisor = mcd(grande.n, grande.d);
    return {
        tipo: 'opciones', enunciado: `Simplifica ${fmt(grande)} hasta que ya no se pueda más.`,
        visuales: [], expresion: [{ fraccion: grande }],
        textoRespuesta: fmt(irreducible), opciones: armarOpciones([irreducible, ...errores].map(opcionFraccion), aleatorio),
        pista: PISTAS.simplificar,
        explicacion: `El mayor número que divide a ${grande.n} y a ${grande.d} es ${divisor}. ${grande.n}÷${divisor} = ${irreducible.n} y ${grande.d}÷${divisor} = ${irreducible.d}, así que ${fmt(grande)} = ${fmt(irreducible)}.`
    };
}

// ---------- Suma y resta ----------

const MODOS_SUMA = { 5: ['mismo', 'mismo', 'multiplo'], 6: ['multiplo', 'cualquiera', 'cualquiera'] };
const DMAX_SUMA = { 5: [8, 12, 6], 6: [6, 8, 12] };

export function modoSumaResta(grado, nivel) {
    return MODOS_SUMA[acotar(grado, 5, 6)][acotar(nivel, 1, NIVEL_MAX) - 1];
}

function sumaResta({ grado, nivel, cantidad, aleatorio }) {
    const g = acotar(grado, 5, 6);
    const n = acotar(nivel, 1, NIVEL_MAX);
    const modo = modoSumaResta(g, n);
    const dMax = DMAX_SUMA[g][n - 1];
    const esResta = aleatorio() < 0.5;
    let a = esResta ? frac(3, 4) : frac(1, 4); // valores de respaldo si el sorteo no encontrara nada (no ocurre en la práctica)
    let b = frac(1, 4);
    for (let i = 0; i < 300; i++) {
        let d1;
        let d2;
        if (modo === 'mismo') { d1 = entre(aleatorio, 3, dMax); d2 = d1; }
        else if (modo === 'multiplo') { d1 = entre(aleatorio, 2, Math.min(6, dMax)); d2 = d1 * elegir(aleatorio, [2, 3]); if (aleatorio() < 0.5) [d1, d2] = [d2, d1]; }
        else { d1 = entre(aleatorio, 2, dMax); d2 = entre(aleatorio, 2, dMax); if (d1 === d2 || d1 % d2 === 0 || d2 % d1 === 0) continue; }
        let x = propia(aleatorio, d1);
        let y = propia(aleatorio, d2);
        if (esResta) {
            if (compararFracciones(x, y) < 0) [x, y] = [y, x];
            if (sonEquivalentes(x, y)) continue; // la resta daría 0
        } else if (g === 5 && compararFracciones(sumar(x, y), frac(1, 1)) > 0) {
            continue; // en 5.º la suma no pasa de un entero
        }
        a = x; b = y;
        break;
    }
    const resultado = esResta ? restar(a, b) : sumar(a, b);
    const simbolo = esResta ? '−' : '+';
    const [x, y] = aDenominadorComun(a, b);
    const D = x.d;
    const errores = elegirFracciones({
        correcta: resultado, cantidad: cantidad - 1, aleatorio,
        candidatos: esResta
            ? [frac(a.n - b.n, a.d), frac(a.n - b.n, Math.abs(a.d - b.d) || a.d + b.d), sumar(a, b), frac(a.n - b.n, a.d * b.d),
                frac(resultado.n + 1, resultado.d), frac(resultado.n, resultado.d + 1), frac(resultado.n + 2, resultado.d)]
            : [frac(a.n + b.n, a.d + b.d), frac(a.n + b.n, a.d), frac(a.n + b.n, a.d * b.d),
                frac(resultado.n + 1, resultado.d), frac(resultado.n, resultado.d + 1), frac(resultado.n + 2, resultado.d)],
        relleno: () => frac(entre(aleatorio, 1, 14), elegir(aleatorio, [a.d, b.d, D, resultado.d]))
    });

    const operacion = `${fmt(a)} ${simbolo} ${fmt(b)}`;
    const pasoNumeradores = `${x.n} ${simbolo} ${y.n} = ${esResta ? x.n - y.n : x.n + y.n}`;
    const crudo = frac(esResta ? x.n - y.n : x.n + y.n, D);
    const simplif = fmt(crudo) === fmt(resultado) ? '' : `, que se simplifica a ${fmt(resultado)}`;
    const explicacion = a.d === b.d
        ? `${operacion}: el denominador no cambia (${D}) y se ${esResta ? 'restan' : 'suman'} los numeradores: ${pasoNumeradores}. Resultado: ${fmt(crudo)}${simplif}.`
        : `${operacion}: el denominador común es mcm(${a.d}, ${b.d}) = ${D}. ${fmt(a)} = ${fmt(x)} y ${fmt(b)} = ${fmt(y)}. Luego ${pasoNumeradores}: ${fmt(crudo)}${simplif}.`;
    return {
        tipo: 'opciones', enunciado: `¿Cuánto es ${operacion}?`, visuales: [],
        expresion: [{ fraccion: a }, { texto: simbolo }, { fraccion: b }, { texto: '=' }, { texto: '?' }],
        textoRespuesta: fmt(resultado), opciones: armarOpciones([resultado, ...errores].map(opcionFraccion), aleatorio),
        pista: PISTAS['suma-resta'], explicacion
    };
}

// ---------- Números mixtos ----------

const MIXTAS = { 1: { dMax: 4, enteroMax: 2 }, 2: { dMax: 6, enteroMax: 3 }, 3: { dMax: 10, enteroMax: 5 } };

export function configuracionMixtas(nivel) {
    return MIXTAS[acotar(nivel, 1, NIVEL_MAX)];
}

function mixtas({ nivel, cantidad, aleatorio }) {
    const c = configuracionMixtas(nivel);
    const d = entre(aleatorio, 2, c.dMax);
    const m = { entero: entre(aleatorio, 1, c.enteroMax), n: entre(aleatorio, 1, d - 1), d };
    const impropia = desdeMixta(m);
    const valida = (x) => x.n >= 1 && x.n < x.d && x.entero >= 1;

    if (aleatorio() < 0.5) { // impropia → mixta
        const errores = elegirErrores({
            correcta: m, cantidad: cantidad - 1, aleatorio, clave: formatoMixto,
            candidatos: [{ ...m, entero: m.entero + 1 }, { ...m, entero: m.entero - 1 }, { ...m, n: m.d - m.n }, { ...m, n: m.n + 1 },
                { ...m, n: m.n - 1 }, { entero: m.n, n: m.entero, d }],
            admitido: (x) => valida(x) && compararFracciones(desdeMixta(x), impropia) !== 0,
            relleno: () => ({ entero: entre(aleatorio, 1, c.enteroMax + 3), n: entre(aleatorio, 1, d - 1), d })
        });
        return {
            tipo: 'opciones', enunciado: `¿Cómo se escribe ${fmt(impropia)} como número mixto?`, visuales: [],
            expresion: [{ fraccion: impropia }],
            textoRespuesta: formatoMixto(m), opciones: armarOpciones([m, ...errores].map(opcionMixta), aleatorio),
            pista: PISTAS.mixtas,
            explicacion: `${impropia.n} ÷ ${d} = ${m.entero} y sobran ${m.n}. Entonces ${fmt(impropia)} = ${formatoMixto(m)}: ${m.entero} enteros y ${m.n}/${d}.`
        };
    }
    const errores = elegirFracciones({
        correcta: impropia, cantidad: cantidad - 1, aleatorio,
        // olvidar multiplicar el entero por el denominador, o sumar de más
        candidatos: [frac(m.entero + m.n, d), frac(m.entero * d, d), frac(m.entero * m.n + d, d), frac(m.n * d + m.entero, d),
            frac(impropia.n + 1, d), frac(impropia.n - 1, d), frac(m.entero * d + m.n, d + 1)],
        relleno: () => frac(entre(aleatorio, 2, 40), d)
    });
    return {
        tipo: 'opciones', enunciado: `¿Cómo se escribe ${formatoMixto(m)} como fracción impropia?`, visuales: [],
        expresion: [{ mixta: m }],
        textoRespuesta: fmt(impropia), opciones: armarOpciones([impropia, ...errores].map(opcionFraccion), aleatorio),
        pista: PISTAS.mixtas,
        explicacion: `${m.entero} × ${d} + ${m.n} = ${impropia.n}, sobre el mismo denominador: ${formatoMixto(m)} = ${fmt(impropia)}.`
    };
}

// ---------- Decimales ----------

const DEN_DECIMALES = { 1: [2, 4, 5, 10], 2: [2, 4, 5, 10, 20, 25], 3: [2, 4, 5, 10, 20, 25, 50, 100] };

export function denominadoresDecimales(nivel) {
    return DEN_DECIMALES[acotar(nivel, 1, NIVEL_MAX)];
}

function decimales({ nivel, cantidad, aleatorio }) {
    const d = elegir(aleatorio, denominadoresDecimales(nivel));
    const f = frac(entre(aleatorio, 1, d - 1), d);
    const c = centesimas(f);
    const texto = formatoDecimal(c);
    const factor = 100 / d;
    const puente = `${fmt(f)} = ${f.n * factor}/100 (se multiplica arriba y abajo por ${factor}) = ${texto}`;

    if (aleatorio() < 0.5) { // fracción → decimal
        const errores = elegirErrores({
            correcta: c, cantidad: cantidad - 1, aleatorio, clave: String, admitido: (x) => Number.isInteger(x) && x >= 1,
            // 100 − c (lo que falta), "pegar" numerador y denominador (3/4 → 3.4), correr el punto, sumar o restar 10
            candidatos: [100 - c, Number(`${f.n}${d}`), c * 10, c + 10, c - 10, c + 5, f.n * 10 + d],
            relleno: () => entre(aleatorio, 1, 199)
        });
        return {
            tipo: 'opciones', enunciado: `¿Cuál es el decimal que equivale a ${fmt(f)}?`, visuales: [], expresion: [{ fraccion: f }],
            textoRespuesta: texto, opciones: armarOpciones([c, ...errores].map((x) => opcionTexto(formatoDecimal(x))), aleatorio),
            pista: PISTAS.decimales, explicacion: `${puente}.`
        };
    }
    const correcta = simplificar(f);
    const errores = elegirFracciones({
        correcta, cantidad: cantidad - 1, aleatorio,
        candidatos: [frac(c, 10), frac(1, c), frac(c, 1000), frac(100 - c, 100), frac(f.d, f.n),
            frac(entre(aleatorio, 1, 9), 10), frac(c + 1, 100)].map((x) => (esFraccionValida(x) ? simplificar(x) : x)),
        relleno: () => frac(entre(aleatorio, 1, 20), elegir(aleatorio, [2, 4, 5, 10, 20, 25, 100]))
    });
    return {
        tipo: 'opciones', enunciado: `¿Cuál fracción (simplificada) equivale a ${texto}?`, visuales: [], expresion: [],
        textoRespuesta: fmt(correcta), opciones: armarOpciones([correcta, ...errores].map(opcionFraccion), aleatorio),
        pista: PISTAS.decimales,
        explicacion: `${texto} = ${c}/100, y al simplificar (÷${mcd(c, 100)}) queda ${fmt(correcta)}.`
    };
}

// ---------- Punto de entrada ----------

const GENERADORES = {
    identificar,
    pintar,
    'comparar-visual': (p) => compararFraccionesPregunta(p, true),
    comparar: (p) => compararFraccionesPregunta(p, false),
    equivalentes,
    simplificar: simplificarPregunta,
    'suma-resta': sumaResta,
    mixtas,
    decimales
};

/**
 * @returns {{habilidad:string, tipo:'opciones'|'pintar', enunciado:string, visuales:{forma:string,n:number,d:number,etiqueta?:string}[],
 *            expresion:Object[], respuesta:number, textoRespuesta:string, opciones:Object[], pista:string, explicacion:string,
 *            figura?:{forma:string,d:number}}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 3, aleatorio = Math.random }) {
    const generador = GENERADORES[habilidad];
    if (!generador) throw new Error(`Habilidad desconocida: ${habilidad}`);
    const g = acotar(grado, GRADO_MIN, GRADO_MAX);
    const n = acotar(nivel, 1, NIVEL_MAX);
    const base = generador({ grado: g, nivel: n, cantidad: acotar(cantidad, 2, 4), aleatorio });
    return { habilidad, respuesta: 0, visuales: [], expresion: [], ...base };
}
