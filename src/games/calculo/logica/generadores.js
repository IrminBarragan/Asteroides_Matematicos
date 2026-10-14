/**
 * Generación de preguntas de «Taller de Cálculo» (lógica pura, sin DOM): sumas, restas y problemas con ayuda de material.
 *
 * Grado de CONTENIDO (no escolar): decide con qué números se trabaja y con qué material.
 *   1.º  hasta 10         → marcos de diez
 *   2.º  hasta 20         → marcos de diez (dos marcos)
 *   3.º  hasta 999        → recta de saltos de 1 y 10
 *   4.º  hasta 9 999      → recta de saltos de 1, 10 y 100
 *   5.º  hasta 99 999     → recta de saltos de 1, 10, 100 y 1 000
 *   6.º  hasta 999 999    → recta de saltos de 1, 10, 100 y 1 000
 *
 * Los tres niveles de cada grado suben en dificultad CONCEPTUAL, no solo en tamaño:
 *   1.º y 2.º: sumas cortas → sumas más largas → (2.º) cruzar la decena (completar 10)
 *   3.º a 6.º: múltiplos de 10^k (solo se mueve una cifra) → sin llevada/préstamo → CON llevada/préstamo
 *
 * Contrato de la respuesta: `respuesta` es el NÚMERO correcto y cada opción lleva por `id` su propio valor. Así el
 * material (recta, marcos) puede responder con el número al que llegó el niño sin pasar por ninguna opción.
 *
 * Cada error ofrecido es un error real de los niños: olvidar la llevada, restar «al revés» cada columna, usar la
 * operación contraria en un problema (ver `docs/AUDITORIA-FASE-13.md`).
 */
import { entre, elegir, mezclar } from '../../../core/aleatorio.js';
import { generarDistractores } from '../../../core/distractores.js';
import { cifras, sumaDeCifras, hayLlevada, hayPrestamo, sumaSinLlevar, restaAlReves } from '../../../core/cifras.js';

export const NIVEL_MAX = 3;
export const GRADO_MIN = 1;
export const GRADO_MAX = 6;

export const HABILIDADES_POR_GRADO = {
    1: ['suma', 'resta'],
    2: ['suma', 'resta', 'problemas'],
    3: ['suma', 'resta', 'problemas'],
    4: ['suma', 'resta', 'problemas'],
    5: ['suma', 'resta', 'problemas'],
    6: ['suma', 'resta', 'problemas']
};

export const NOMBRES_HABILIDAD = { suma: 'sumar', resta: 'restar', problemas: 'resolver problemas' };

/** Material y tamaño de los números por grado de contenido. `cifras` = cifras del primer número; `saltos` = tamaños de salto. */
export const ESCALAS = {
    1: { material: 'marcos', capacidad: 10 },
    2: { material: 'marcos', capacidad: 20 },
    3: { material: 'recta', cifras: 3, saltos: [1, 10] },
    4: { material: 'recta', cifras: 4, saltos: [1, 10, 100] },
    5: { material: 'recta', cifras: 5, saltos: [1, 10, 100, 1000] },
    6: { material: 'recta', cifras: 6, saltos: [1, 10, 100, 1000] }
};

/** Un salto de la recta nunca pasa de este número de saltos útiles: la suma de cifras del segundo número. */
export const MAX_SUMA_CIFRAS = 12;

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, GRADO_MIN, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

/** Cuántos botones: 3 en el nivel fácil y 4 después. */
export const cantidadOpciones = (nivel) => (nivel <= 1 ? 3 : 4);

export const prepararRonda = (grado, nivel) => ({ cantidad: cantidadOpciones(nivel) });

// ---------- Aritmética de cifras (ahora en core/cifras.js; se reexporta para no cambiar las pruebas) ----------

export { cifras, sumaDeCifras, hayLlevada, hayPrestamo, sumaSinLlevar, restaAlReves };

// ---------- Pares de números ----------

function sortear(propone, cumple, intentos = 5000) {
    for (let i = 0; i < intentos; i++) {
        const candidato = propone();
        if (cumple(candidato)) return candidato;
    }
    throw new Error('No se pudo generar un par de números válido');
}

/** Unidad en que se mueve el nivel 1 de 3.º a 6.º: el valor del salto más grande del segundo número. */
const unidadNivel1 = (esc) => 10 ** (esc.saltos.length - 1);

function parSumaMarcos(esc, nivel, az) {
    if (esc.capacidad === 10) {
        const [min, max] = [[2, 5], [6, 8], [9, 10]][nivel - 1];
        const total = entre(az, min, max);
        const a = entre(az, 1, total - 1);
        return { a, b: total - a };
    }
    const sinCruzar = () => { const u = entre(az, 0, 8); return { a: 10 + u, b: entre(az, 1, 9 - u) }; };
    const cruzando = () => { const a = entre(az, 2, 9); return { a, b: entre(az, 11 - a, 9) }; };
    if (nivel === 1) return sinCruzar();
    if (nivel === 2) return cruzando();
    return az() < 0.5 ? sinCruzar() : cruzando();
}

function parRestaMarcos(esc, nivel, az) {
    if (esc.capacidad === 10) {
        const [min, max] = [[2, 5], [6, 8], [9, 10]][nivel - 1];
        const a = entre(az, min, max);
        return { a, b: entre(az, 1, a - 1) };
    }
    const sinCruzar = () => { const a = entre(az, 11, 19); return { a, b: entre(az, 1, a - 10) }; };
    const cruzando = () => { const a = entre(az, 11, 18); return { a, b: entre(az, (a % 10) + 1, 9) }; };
    if (nivel === 1) return sinCruzar();
    if (nivel === 2) return cruzando();
    return az() < 0.5 ? sinCruzar() : cruzando();
}

const rangoA = (esc) => [10 ** (esc.cifras - 1), 10 ** esc.cifras - 1];
const maxB = (esc) => 10 ** esc.saltos.length - 1;

function parSumaGrande(esc, nivel, az) {
    const [minA, maxA] = rangoA(esc);
    const tope = 10 ** esc.cifras;
    if (nivel === 1) {
        const unidad = unidadNivel1(esc);
        return sortear(
            () => ({ a: entre(az, Math.ceil(minA / unidad), Math.floor(maxA / unidad)) * unidad, b: entre(az, 1, 9) * unidad }),
            ({ a, b }) => a + b < tope
        );
    }
    return sortear(
        () => ({ a: entre(az, minA, maxA), b: entre(az, 1, maxB(esc)) }),
        ({ a, b }) => a + b < tope && b % 10 !== 0 && sumaDeCifras(b) <= MAX_SUMA_CIFRAS && (nivel === 2 ? !hayLlevada(a, b) : hayLlevada(a, b))
    );
}

function parRestaGrande(esc, nivel, az) {
    const [minA, maxA] = rangoA(esc);
    if (nivel === 1) {
        const unidad = unidadNivel1(esc);
        return sortear(
            () => ({ a: entre(az, Math.ceil(minA / unidad), Math.floor(maxA / unidad)) * unidad, b: entre(az, 1, 9) * unidad }),
            ({ a, b }) => a > b
        );
    }
    return sortear(
        () => ({ a: entre(az, minA, maxA), b: entre(az, 1, maxB(esc)) }),
        ({ a, b }) => a > b && b % 10 !== 0 && sumaDeCifras(b) <= MAX_SUMA_CIFRAS && (nivel === 2 ? !hayPrestamo(a, b) : hayPrestamo(a, b))
    );
}

/** Los dos números de una suma o una resta para ese grado de contenido y nivel. */
export function parNumeros(operacion, grado, nivel, aleatorio) {
    const esc = ESCALAS[acotar(grado, GRADO_MIN, GRADO_MAX)];
    const n = acotar(nivel, 1, NIVEL_MAX);
    if (esc.material === 'marcos') return operacion === 'suma' ? parSumaMarcos(esc, n, aleatorio) : parRestaMarcos(esc, n, aleatorio);
    return operacion === 'suma' ? parSumaGrande(esc, n, aleatorio) : parRestaGrande(esc, n, aleatorio);
}

// ---------- Opciones, pistas y material ----------

const PISTAS = {
    sumaMarcos: 'Sumar es juntar. Cuenta todas las fichas: puedes empezar en el número mayor y seguir contando lo que falta.',
    sumaCruzar: 'Completa el 10 primero: ve cuánto le falta al primer número para llegar a 10, quítaselo al segundo y suma lo que sobre.',
    sumaColumnas: 'Suma por columnas, de derecha a izquierda. Si una columna pasa de 9, escribe la unidad y lleva 1 a la columna siguiente.',
    sumaRecta: 'Empieza en el primer número y avanza el segundo en saltos: primero los de las centenas, decenas y unidades que tenga.',
    restaMarcos: 'Restar es quitar. Pon las fichas del primer número y quita las del segundo: las que quedan son la respuesta.',
    restaCruzar: 'Si no te alcanzan las unidades, quita primero hasta llegar a 10 y luego quita lo que falta.',
    restaColumnas: 'Resta por columnas, de derecha a izquierda. Si arriba hay menos que abajo, pide prestado 1 al vecino de la izquierda (vale 10).',
    restaRecta: 'Empieza en el primer número y retrocede el segundo en saltos. Para comprobar: la respuesta más el segundo número debe dar el primero.',
    problemas: 'Lee otra vez despacio: ¿qué datos tienes y qué te preguntan? Si se junta o se completa, suma; si se quita o se compara, resta.'
};

function pistaSuma(esc, nivel, a, b) {
    if (esc.material === 'marcos') {
        if (a < 10 && a + b > 10) return PISTAS.sumaCruzar; // pasa de 10: conviene completar la decena
        return PISTAS.sumaMarcos;
    }
    return nivel <= 1 ? PISTAS.sumaRecta : PISTAS.sumaColumnas;
}

function pistaResta(esc, nivel, a, b) {
    if (esc.material === 'marcos') return esc.capacidad === 20 && (a % 10) < b ? PISTAS.restaCruzar : PISTAS.restaMarcos;
    return nivel <= 1 ? PISTAS.restaRecta : PISTAS.restaColumnas;
}

/**
 * Opciones {id: valor, texto}, mezcladas. `obligatorios` es el error MÁS revelador (siempre se ofrece, si es válido);
 * los demás errores salen de `preferidos` (típicos) y, si no alcanzan, de números cercanos.
 */
function armarOpciones(respuesta, { preferidos, obligatorios = [] }, cantidad, aleatorio, maximo = Infinity) {
    const valido = (n) => Number.isInteger(n) && n >= 0 && n <= maximo && n !== respuesta;
    const fijos = [...new Set(obligatorios.filter(valido))].slice(0, cantidad - 1);
    const errores = generarDistractores(respuesta, aleatorio, cantidad - 1 - fijos.length, {
        preferidos: preferidos.filter((p) => valido(p) && !fijos.includes(p)), maximo, excluir: fijos
    });
    return mezclar(aleatorio, [respuesta, ...fijos, ...errores].map((valor) => ({ id: valor, texto: String(valor) })));
}

function materialPara(esc, operacion, a, b) {
    if (esc.material === 'marcos') return { tipo: 'marcos', capacidad: esc.capacidad, operacion, a, b };
    return { tipo: 'recta', operacion, a, b, desde: a, saltos: esc.saltos, maximo: 10 ** esc.cifras - 1 };
}

// ---------- Sumas y restas ----------

function sumaRestaPregunta({ operacion, grado, nivel, cantidad, aleatorio, apoyo }) {
    const esc = ESCALAS[grado];
    const { a, b } = parNumeros(operacion, grado, nivel, aleatorio);
    const esSuma = operacion === 'suma';
    const r = esSuma ? a + b : a - b;
    const signo = esSuma ? '+' : '−';
    const grande = esc.material === 'recta';
    // El error que más dice del niño: olvidar la llevada, restar «al revés» cada columna
    const opcionesDe = esSuma
        ? { preferidos: [r + 1, r - 1, r + 10, r - 10, Math.max(a, b)], obligatorios: grande && nivel >= 2 ? [sumaSinLlevar(a, b)] : [] }
        : { preferidos: [r + 1, r - 1, r + 10, r - 10, a + b], obligatorios: grande && nivel >= 2 ? [restaAlReves(a, b)] : [] };
    const material = apoyo === 'ninguno' ? null : materialPara(esc, operacion, a, b);
    return {
        habilidad: operacion,
        tipo: material ? material.tipo : 'opciones',
        apoyo,
        enunciado: `${a} ${signo} ${b} = ?`,
        material,
        respuesta: r,
        textoRespuesta: String(r),
        opciones: armarOpciones(r, opcionesDe, cantidad, aleatorio, esc.material === 'marcos' ? esc.capacidad : Infinity),
        pista: esSuma ? pistaSuma(esc, nivel, a, b) : pistaResta(esc, nivel, a, b),
        explicacion: `${a} ${signo} ${b} = ${r}.${esSuma ? '' : ` Para comprobar: ${r} + ${b} = ${a}.`}`,
        datos: { a, b }
    };
}

// ---------- Problemas ----------

const COSAS = [
    { s: 'canica', p: 'canicas', g: 'f' }, { s: 'galleta', p: 'galletas', g: 'f' }, { s: 'estampa', p: 'estampas', g: 'f' },
    { s: 'manzana', p: 'manzanas', g: 'f' }, { s: 'pegatina', p: 'pegatinas', g: 'f' }, { s: 'libro', p: 'libros', g: 'm' },
    { s: 'lápiz', p: 'lápices', g: 'm' }, { s: 'globo', p: 'globos', g: 'm' }, { s: 'carrito', p: 'carritos', g: 'm' },
    { s: 'dulce', p: 'dulces', g: 'm' }
];
const NOMBRES = ['Ana', 'Luis', 'Sofía', 'Mateo', 'Valeria', 'Diego', 'Camila', 'Emiliano'];

/** «1 canica», «5 canicas». */
const cant = (n, cosa) => `${n} ${n === 1 ? cosa.s : cosa.p}`;
const cuantas = (cosa) => (cosa.g === 'f' ? 'Cuántas' : 'Cuántos');
const algunas = (cosa) => (cosa.g === 'f' ? 'algunas' : 'algunos');

/**
 * Plantillas por nivel. Cada una declara la operación que el niño debe hacer con los dos números del par y arma
 * la historia. En el nivel 3 el dato que se busca es el del INICIO o el que FALTA, que es lo que más cuesta.
 */
const PLANTILLAS = {
    1: [
        { operacion: 'suma', historia: ({ n, c, a, b }) => `${n} tiene ${cant(a, c)}. Le regalan ${cant(b, c)} más. ¿${cuantas(c)} ${c.p} tiene ahora?`, clave: 'Le regalan más: se junta.' },
        { operacion: 'resta', historia: ({ n, c, a, b }) => `${n} tiene ${cant(a, c)} y regala ${b}. ¿${cuantas(c)} ${c.p} le quedan?`, clave: 'Regala: se quita.' }
    ],
    2: [
        { operacion: 'suma', historia: ({ c, a, b }) => `En una caja hay ${cant(a, c)} y en otra caja hay ${b}. ¿${cuantas(c)} ${c.p} hay en total?`, clave: 'En total: se junta lo de las dos cajas.' },
        { operacion: 'resta', historia: ({ n, m, c, a, b }) => `${n} tiene ${cant(a, c)} y ${m} tiene ${b}. ¿${cuantas(c)} ${c.p} más tiene ${n} que ${m}?`, clave: 'Cuántos más: se compara y se resta.' }
    ],
    3: [
        // «Tenía algunas»: se busca el INICIO. La historia usa el total y lo que se agregó; se resuelve restando.
        { operacion: 'resta', faltante: 'inicio-suma', historia: ({ n, c, a, b }) => `${n} tenía ${algunas(c)} ${c.p}. Le dieron ${b} más y ahora tiene ${a}. ¿${cuantas(c)} ${c.p} tenía al principio?`, clave: 'Buscas lo que tenía antes de que le dieran más: se resta.' },
        { operacion: 'suma', faltante: 'inicio-resta', historia: ({ n, c, a, b }) => `${n} tenía ${algunas(c)} ${c.p}. Regaló ${b} y le quedaron ${a}. ¿${cuantas(c)} ${c.p} tenía al principio?`, clave: 'Buscas lo que tenía antes de regalar: se suma lo que regaló a lo que le quedó.' }
    ]
};

function problemaPregunta({ grado, nivel, cantidad, aleatorio, apoyo }) {
    const plantilla = elegir(aleatorio, PLANTILLAS[nivel]);
    // Los números salen del mismo generador que sumas y restas: así la dificultad numérica sube igual
    const operacionDeNumeros = plantilla.faltante === 'inicio-suma' ? 'suma' : plantilla.faltante === 'inicio-resta' ? 'resta' : plantilla.operacion;
    const par = parNumeros(operacionDeNumeros, grado, nivel, aleatorio);
    // x e y son los números que SE OPERAN; en los «faltante» la historia muestra otro dato (el total o lo que quedó)
    let x;
    let y;
    let mostrados;
    if (plantilla.faltante === 'inicio-suma') { x = par.a + par.b; y = par.b; mostrados = { a: x, b: y }; }
    else if (plantilla.faltante === 'inicio-resta') { x = par.a - par.b; y = par.b; mostrados = { a: x, b: y }; }
    else { x = par.a; y = par.b; mostrados = { a: x, b: y }; }
    const esSuma = plantilla.operacion === 'suma';
    const r = esSuma ? x + y : x - y;
    const [n, m] = mezclar(aleatorio, NOMBRES);
    const c = elegir(aleatorio, COSAS);
    const historia = plantilla.historia({ n, m, c, ...mostrados });
    const signo = esSuma ? '+' : '−';
    return {
        habilidad: 'problemas',
        tipo: 'opciones',
        apoyo,
        enunciado: historia,
        material: null,
        respuesta: r,
        textoRespuesta: String(r),
        // El error clásico: usar la operación contraria
        opciones: armarOpciones(r, { preferidos: [r + 1, r - 1, r + 10, r - 10], obligatorios: [esSuma ? Math.abs(x - y) : x + y] }, cantidad, aleatorio),
        pista: PISTAS.problemas,
        explicacion: `${plantilla.clave} ${x} ${signo} ${y} = ${r}.`,
        datos: { operacion: plantilla.operacion, x, y, historia, clave: plantilla.clave }
    };
}

/**
 * @param {Object} p
 * @param {number} p.grado       grado de CONTENIDO (1–6)
 * @param {string} p.habilidad   'suma' | 'resta' | 'problemas'
 * @param {number} p.nivel       1–3
 * @param {string} [p.apoyo]     'completo' | 'ligero' | 'ninguno' (cuánta ayuda lleva; ver apoyo.js)
 * @returns {{habilidad:string, tipo:'marcos'|'recta'|'opciones', apoyo:string, enunciado:string, material:Object|null,
 *            respuesta:number, textoRespuesta:string, opciones:{id:number,texto:string}[], pista:string, explicacion:string, datos:Object}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 3, aleatorio = Math.random, apoyo = 'ninguno' }) {
    const g = acotar(grado, GRADO_MIN, GRADO_MAX);
    const n = acotar(nivel, 1, NIVEL_MAX);
    const ajustes = { grado: g, nivel: n, cantidad: acotar(cantidad, 2, 4), aleatorio, apoyo };
    if (habilidad === 'suma' || habilidad === 'resta') return sumaRestaPregunta({ operacion: habilidad, ...ajustes });
    if (habilidad === 'problemas') {
        if (g < 2) throw new Error('Los problemas empiezan en 2.º');
        return problemaPregunta(ajustes);
    }
    throw new Error(`Habilidad desconocida: ${habilidad}`);
}
