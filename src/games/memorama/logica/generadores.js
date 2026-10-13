/**
 * Generación de tableros del Memorama: elige qué parejas entran y las convierte en cartas.
 * Lógica pura (sin DOM).
 */
import { entre, mezclar } from '../../../core/aleatorio.js';
import {
    candidatosImagenPalabra, candidatosSilabaInicial, candidatosConteoSilabas,
    candidatosRimas, candidatosSinonimos, candidatosAntonimos
} from './contenido.js';

export const NIVEL_MAX = 3;
const GRADO_MAX = 3; // este juego cubre 1.º a 3.º; quien juega con otro grado ("ver todos") usa el tablero de 3.º

export const HABILIDADES_POR_GRADO = {
    1: ['imagen-palabra', 'silaba-inicial'],
    2: ['silaba-inicial', 'conteo-silabas', 'rimas'],
    3: ['rimas', 'sinonimos', 'antonimos']
};

export const INSTRUCCIONES = {
    'imagen-palabra': 'Junta cada dibujo con su palabra.',
    'silaba-inicial': 'Junta cada palabra con la sílaba con la que empieza.',
    'conteo-silabas': 'Junta cada palabra con su número de sílabas.',
    'rimas': 'Junta las palabras que riman (terminan igual).',
    'sinonimos': 'Junta las palabras que significan casi lo mismo.',
    'antonimos': 'Junta las palabras que significan lo contrario.'
};

export const NOMBRES_HABILIDAD = {
    'imagen-palabra': 'leer palabras',
    'silaba-inicial': 'sílabas iniciales',
    'conteo-silabas': 'contar sílabas',
    'rimas': 'rimas',
    'sinonimos': 'sinónimos',
    'antonimos': 'antónimos'
};

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

/** 1.º juega con dibujos y 2.º con palabras; la instrucción debe nombrar lo que el niño ve. */
export function instruccionPara(habilidad, grado) {
    if (habilidad === 'silaba-inicial' && grado <= 1) return 'Junta cada dibujo con la sílaba con la que empieza.';
    return INSTRUCCIONES[habilidad];
}

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, 1, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

/** Cuántas parejas (cartas = 2 × parejas). Contar sílabas usa 3/4/5 porque solo hay cantidades de 1 a 5. */
export function cantidadParejas(habilidad, nivel) {
    const n = acotar(nivel, 1, NIVEL_MAX);
    return habilidad === 'conteo-silabas' ? n + 2 : [3, 4, 6][n - 1];
}

/** Columnas del tablero: filas parejas y rectángulos casi cuadrados que caben en pantalla. */
export function columnasPara(totalCartas) {
    if (totalCartas <= 6) return 3;
    if (totalCartas <= 8) return 4;
    if (totalCartas <= 10) return 5;
    return 4;
}

export function candidatosPara(habilidad, grado) {
    switch (habilidad) {
        case 'imagen-palabra': return candidatosImagenPalabra();
        case 'silaba-inicial': return candidatosSilabaInicial(grado);
        case 'conteo-silabas': return candidatosConteoSilabas();
        case 'rimas': return candidatosRimas();
        case 'sinonimos': return candidatosSinonimos();
        case 'antonimos': return candidatosAntonimos();
        default: throw new Error(`Habilidad desconocida: ${habilidad}`);
    }
}

/** Agrupa las parejas por `grupo` (un tablero toma como máximo una de cada grupo). */
function agruparPorGrupo(candidatos) {
    const grupos = new Map();
    for (const c of candidatos) {
        if (!grupos.has(c.grupo)) grupos.set(c.grupo, []);
        grupos.get(c.grupo).push(c);
    }
    return grupos;
}

/**
 * @param {Object} p
 * @param {number} p.grado
 * @param {string} p.habilidad
 * @param {number} p.nivel 1..3
 * @param {Function} [p.aleatorio]
 * @returns {{habilidad:string, instruccion:string, columnas:number,
 *            parejas:Object[], cartas:{id:string, parejaId:string, grupo:string, contenido:Object}[]}}
 */
export function generarTablero({ grado, habilidad, nivel, aleatorio = Math.random }) {
    const g = acotar(grado, 1, GRADO_MAX);
    const grupos = agruparPorGrupo(candidatosPara(habilidad, g));
    let claves = [...grupos.keys()];

    if (habilidad === 'conteo-silabas') {
        // Nivel 1: cantidades 1-3; nivel 2: 1-4; nivel 3: 1-5 (todas, una pareja de cada cantidad)
        const maximo = acotar(nivel, 1, NIVEL_MAX) + 2;
        claves = claves.filter((k) => Number(k) <= maximo);
    }
    const cantidad = Math.min(cantidadParejas(habilidad, nivel), claves.length);
    if (cantidad < 2) throw new Error(`No hay suficientes parejas distintas para ${habilidad}`);

    const elegidas = mezclar(aleatorio, claves).slice(0, cantidad).map((clave) => {
        const opciones = grupos.get(clave);
        return opciones[entre(aleatorio, 0, opciones.length - 1)];
    });

    const cartas = elegidas.flatMap((pareja) => [
        { id: `${pareja.id}:a`, parejaId: pareja.id, grupo: pareja.grupo, contenido: pareja.a },
        { id: `${pareja.id}:b`, parejaId: pareja.id, grupo: pareja.grupo, contenido: pareja.b }
    ]);
    const mezcladas = mezclar(aleatorio, cartas);

    return {
        habilidad,
        instruccion: instruccionPara(habilidad, g),
        columnas: columnasPara(mezcladas.length),
        parejas: elegidas,
        cartas: mezcladas
    };
}
