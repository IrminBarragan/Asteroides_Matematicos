/**
 * Generación de preguntas de "Atrapa la Ortografía" (lógica pura, sin DOM).
 *
 * Habilidades por grado:  3.º b/v, g/j, h  ·  4.º b/v, g/j, c/s/z, ll/y  ·  5.º acentuación, c/s/z, ll/y, h
 *                         6.º acentuación, homófonos, tilde diacrítica, porque/por qué
 */
import { elegir, mezclar } from '../../../core/aleatorio.js';
import {
    BV, GJ, H, CSZ, LLY, ACENTUACION, HOMOFONOS, DIACRITICOS, PORQUES, PALABRAS_VALIDAS_QUE_NO_SON_ERROR,
    todasLasPalabrasCorrectas, quitarTildes, claseDePalabra, debeLlevarTilde, silabasConTonica, CON_TILDE_DE, CON_TILDE
} from './contenido.js';

export const NIVEL_MAX = 3;
export const GRADO_MIN = 3;
export const GRADO_MAX = 6;

export const HABILIDADES_POR_GRADO = {
    3: ['b-v', 'g-j', 'h'],
    4: ['b-v', 'g-j', 'c-s-z', 'll-y'],
    5: ['acentuacion', 'c-s-z', 'll-y', 'h'],
    6: ['acentuacion', 'homofonos', 'diacriticos', 'porques']
};

export const NOMBRES_HABILIDAD = {
    'b-v': 'palabras con b y v', 'g-j': 'palabras con g y j', 'h': 'la letra h', 'c-s-z': 'palabras con c, s y z',
    'll-y': 'palabras con ll y y', 'acentuacion': 'las tildes', 'homofonos': 'palabras que suenan igual',
    'diacriticos': 'la tilde diacrítica', 'porques': 'porque y por qué'
};

export const PISTAS = {
    'b-v': 'Fíjate bien: la b y la v suenan igual, pero se escriben distinto.',
    'g-j': 'Antes de e y de i, la g y la j suenan igual. Piensa cómo se escribe esta palabra.',
    'h': 'La h no se pronuncia, pero muchas palabras la llevan.',
    'c-s-z': 'La c, la s y la z pueden sonar igual. Fíjate cuál va en cada lugar.',
    'll-y': 'La ll y la y pueden sonar igual. Piensa cuál va en esta palabra.',
    'acentuacion': 'Busca la sílaba que suena más fuerte y piensa si esa palabra debe llevar tilde.',
    'homofonos': 'Lee la oración con cada opción y piensa qué quiere decir cada palabra.',
    'diacriticos': 'Algunas palabras cortas llevan tilde para distinguirse de otra igual. Piensa en su significado.',
    'porques': 'Piensa: ¿la oración hace una pregunta o da una respuesta?'
};

const LISTAS_PALABRAS = { 'b-v': BV, 'g-j': GJ, 'h': H, 'c-s-z': CSZ, 'll-y': LLY };
const LISTAS_ORACIONES = { homofonos: HOMOFONOS, diacriticos: DIACRITICOS, porques: PORQUES };

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);
const reemplazar = (s, i, largo, nuevo) => s.slice(0, i) + nuevo + s.slice(i + largo);
const VOCAL = (c) => c !== undefined && 'aeiouáéíóú'.includes(c);
const E_I = (c) => c !== undefined && 'eiéí'.includes(c);

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, GRADO_MIN, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

// ---------- Errores típicos por regla (un cambio a la vez) ----------

function variantesBV(p) {
    const salida = [];
    [...p].forEach((c, i) => {
        if (c === 'b') salida.push(reemplazar(p, i, 1, 'v'));
        if (c === 'v') salida.push(reemplazar(p, i, 1, 'b'));
    });
    return salida;
}

/** g y j solo se confunden delante de e, i (en "ga, go, gu" la g suena distinto de la j). */
function variantesGJ(p) {
    const salida = [];
    [...p].forEach((c, i) => {
        if (c === 'j' && E_I(p[i + 1])) salida.push(reemplazar(p, i, 1, 'g'));
        if (c === 'g' && E_I(p[i + 1])) salida.push(reemplazar(p, i, 1, 'j'));
    });
    return salida;
}

/** Quitar la h (salvo en "ch") o agregarla al inicio de una palabra que empieza con vocal. */
function variantesH(p) {
    const salida = [];
    [...p].forEach((c, i) => {
        if (c === 'h' && p[i - 1] !== 'c') salida.push(reemplazar(p, i, 1, ''));
    });
    if (VOCAL(p[0]) && !/(^|[^c])h/.test(p)) salida.push(`h${p}`); // solo a palabras sin una h real (la de "ch" no cuenta)
    return salida;
}

/** c (solo antes de e, i), s y z se confunden cuando suenan igual: delante de vocal o al final. */
function variantesCSZ(p) {
    const salida = [];
    [...p].forEach((c, i) => {
        if (!'csz'.includes(c)) return;
        const siguiente = p[i + 1];
        if (c === 'c' && !E_I(siguiente)) return;                 // "ca, co, cu" suena /k/
        if (siguiente !== undefined && !VOCAL(siguiente)) return; // "esp-", "-nz-"… no es la confusión que se enseña
        for (const alterna of 'csz') {
            if (alterna === c || (alterna === 'c' && !E_I(siguiente))) continue;
            salida.push(reemplazar(p, i, 1, alterna));
        }
    });
    return salida;
}

function variantesLLY(p) {
    const salida = [];
    for (let i = 0; i < p.length; i++) {
        if (p.startsWith('ll', i)) salida.push(reemplazar(p, i, 2, 'y'));
        else if (p[i] === 'y' && VOCAL(p[i + 1])) salida.push(reemplazar(p, i, 1, 'll'));
    }
    return salida;
}

/** Tilde mal puesta o ausente: sin tilde, o en cualquier otra vocal. */
function variantesAcento(p) {
    const base = quitarTildes(p);
    const salida = base !== p ? [base] : [];
    [...base].forEach((c, i) => {
        if (!CON_TILDE_DE[c]) return;
        if (c === 'u' && (base[i - 1] === 'q' || (base[i - 1] === 'g' && E_I(base[i + 1])))) return; // la u muda de "que, gui"
        salida.push(reemplazar(base, i, 1, CON_TILDE_DE[c]));
    });
    return salida;
}

const GENERADORES_DE_VARIANTES = {
    'b-v': variantesBV, 'g-j': variantesGJ, 'h': variantesH, 'c-s-z': variantesCSZ, 'll-y': variantesLLY, acentuacion: variantesAcento
};

/**
 * Errores posibles de una palabra: únicos, distintos de la palabra, y que NO sean otra palabra real
 * (ni de las listas del juego ni de PALABRAS_VALIDAS_QUE_NO_SON_ERROR).
 */
export function erroresPosibles(habilidad, palabra, { correctas = todasLasPalabrasCorrectas(), validas = PALABRAS_VALIDAS_QUE_NO_SON_ERROR } = {}) {
    const generar = GENERADORES_DE_VARIANTES[habilidad];
    if (!generar) throw new Error(`Habilidad sin errores generables: ${habilidad}`);
    return [...new Set(generar(palabra))].filter((v) => v !== palabra && !validas.has(v) && !correctas.has(v));
}

// ---------- Explicaciones ----------

function letrasConfundibles(habilidad, p) {
    const letras = [];
    const pares = { 'b-v': 'bv', 'g-j': 'gj' };
    [...p].forEach((c, i) => {
        if (pares[habilidad] && pares[habilidad].includes(c)) {
            if (habilidad !== 'g-j' || E_I(p[i + 1]) || c === 'j') letras.push(c);
        }
    });
    return [...new Set(letras)];
}

function notaCSZ(p) {
    const notas = [];
    [...p].forEach((c, i) => {
        if (c === 'c' && E_I(p[i + 1])) notas.push('la «c» va antes de e, i');
        else if (c === 'z' && (p[i + 1] === undefined || 'aouáóú'.includes(p[i + 1]))) notas.push('la «z» va antes de a, o, u o al final');
        else if (c === 's' && (p[i + 1] === undefined || VOCAL(p[i + 1]))) notas.push('aquí va «s»');
    });
    return notas.join('; ');
}

export function explicacionPalabra(habilidad, p, regla) {
    let detalle;
    switch (habilidad) {
        case 'b-v': detalle = `con ${letrasConfundibles('b-v', p).join(' y ') || 'b o v'}`; break;
        case 'g-j': detalle = `con ${letrasConfundibles('g-j', p).join(' y ')}`; break;
        case 'h': detalle = /(^|[^c])h/.test(p) ? 'con h (la h no se pronuncia)' : 'sin h (no lleva h)'; break;
        case 'c-s-z': detalle = notaCSZ(p); break;
        case 'll-y': detalle = p.includes('ll') ? 'con ll' : 'con y'; break;
        default: detalle = '';
    }
    const base = `Se escribe «${p}»${detalle ? `: ${detalle}` : ''}.`;
    return regla ? `${base} ${regla}` : base;
}

export function explicacionAcento(entrada) {
    const { palabra } = entrada;
    const clase = claseDePalabra(entrada);
    const nombre = { aguda: 'aguda', grave: 'grave', esdrujula: 'esdrújula' }[clase];
    const tilde = debeLlevarTilde(entrada);
    const silabas = silabasConTonica(entrada);
    if (clase === 'esdrujula') return `«${palabra}» (${silabas}) es esdrújula: todas las esdrújulas llevan tilde.`;
    const final = quitarTildes(palabra).slice(-1);
    const terminaEn = final === 'n' || final === 's' ? `en «${final}»` : 'en vocal';
    const termina = (final === 'n' || final === 's' || 'aeiou'.includes(final)) ? terminaEn : `en consonante distinta de n y s («${final}»)`;
    const regla = clase === 'aguda'
        ? (tilde ? 'las agudas llevan tilde si terminan en n, s o vocal' : 'las agudas solo llevan tilde si terminan en n, s o vocal')
        : (tilde ? 'las graves llevan tilde si NO terminan en n, s ni vocal' : 'las graves solo llevan tilde si NO terminan en n, s ni vocal');
    return `«${palabra}» (${silabas}) es ${nombre} y termina ${termina}: ${regla}. ${tilde ? 'Por eso lleva tilde.' : 'Por eso no lleva tilde.'}`;
}

// ---------- Ajustes de ronda ----------

const SEGUNDOS_BASE = { 3: 20, 4: 18, 5: 16, 6: 15 };
const FACTOR_NIVEL = [1.2, 1, 0.9];

/** Segundos que tarda una palabra en cruzar el cielo: más tiempo para leer a los más chicos. */
export function segundosDeCaida(grado, nivel) {
    return SEGUNDOS_BASE[acotar(grado, GRADO_MIN, GRADO_MAX)] * FACTOR_NIVEL[acotar(nivel, 1, NIVEL_MAX) - 1];
}

/** Cuántas palabras caen: 2 en el nivel fácil (cara o cruz con pista) y 3 después. */
export function cantidadOpciones(nivel) {
    return nivel <= 1 ? 2 : 3;
}

export function prepararRonda(grado, nivel) {
    return { cantidad: cantidadOpciones(nivel), segundos: segundosDeCaida(grado, nivel) };
}

// ---------- Pregunta ----------

function elegirDelNivel(lista, nivel, aleatorio, nivelDe) {
    // Casi siempre del nivel actual; a veces un repaso del nivel anterior
    const objetivo = nivel > 1 && aleatorio() < 0.3 ? nivel - 1 : nivel;
    const pool = lista.filter((e) => nivelDe(e) === objetivo);
    return elegir(aleatorio, pool.length > 0 ? pool : lista);
}

/**
 * @returns {{habilidad:string, tipo:'palabra'|'oracion', enunciado:string, respuesta:number, textoRespuesta:string,
 *            opciones:{id:number, texto:string}[], pista:string, explicacion:string}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 3, aleatorio = Math.random }) {
    const n = acotar(nivel, 1, NIVEL_MAX);
    const total = acotar(cantidad, 2, 3);

    if (LISTAS_ORACIONES[habilidad]) {
        const [oracion, opciones, , explicacion] = elegirDelNivel(LISTAS_ORACIONES[habilidad], n, aleatorio, (e) => e[2]);
        const usadas = opciones.slice(0, Math.max(2, Math.min(total, opciones.length))); // la primera es la correcta
        return {
            habilidad, tipo: 'oracion', enunciado: oracion,
            respuesta: 0, textoRespuesta: opciones[0],
            opciones: mezclar(aleatorio, usadas.map((texto, id) => ({ id, texto }))),
            pista: PISTAS[habilidad], explicacion
        };
    }

    let palabra;
    let regla = null;
    let explicacion;
    if (habilidad === 'acentuacion') {
        const entrada = elegirDelNivel(ACENTUACION, n, aleatorio, (e) => e.nivel);
        palabra = entrada.palabra;
        explicacion = explicacionAcento(entrada);
    } else if (LISTAS_PALABRAS[habilidad]) {
        const [texto, , reglaDeLaPalabra] = elegirDelNivel(LISTAS_PALABRAS[habilidad], n, aleatorio, (e) => e[1]);
        palabra = texto;
        regla = reglaDeLaPalabra || null;
        explicacion = explicacionPalabra(habilidad, palabra, regla);
    } else {
        throw new Error(`Habilidad desconocida: ${habilidad}`);
    }

    const errores = mezclar(aleatorio, erroresPosibles(habilidad, palabra)).slice(0, total - 1);
    if (errores.length === 0) throw new Error(`No hay errores posibles para «${palabra}» (${habilidad})`);
    const textos = [palabra, ...errores];
    return {
        habilidad, tipo: 'palabra', enunciado: '¿Cuál está bien escrita?',
        respuesta: 0, textoRespuesta: palabra,
        opciones: mezclar(aleatorio, textos.map((texto, id) => ({ id, texto }))),
        // La regla sirve de pista solo si no nombra la palabra (la de «vivir» dice «vivir lleva v»: regalaría la respuesta)
        pista: regla && !regla.toLowerCase().includes(palabra.toLowerCase()) ? regla : PISTAS[habilidad], explicacion
    };
}

