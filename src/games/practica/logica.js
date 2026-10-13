/**
 * Lógica pura del juego de práctica (sin DOM): genera preguntas de suma y resta según
 * el grado y el nivel de dificultad que decide el motor adaptativo.
 */

/** Tope de los números por grado (1.º a 6.º) para el nivel más alto. */
const TOPE_POR_GRADO = [10, 20, 100, 500, 1000, 5000];
/** Fracción del tope que se usa en cada nivel de dificultad (1..3). */
const ESCALA_NIVEL = [0.5, 0.75, 1];

export const HABILIDADES = {
    suma: { nivelMax: 3 },
    resta: { nivelMax: 3 }
};

export const PREGUNTAS_POR_PARTIDA = 10;

export function topeNumeros(grado, nivel) {
    const base = TOPE_POR_GRADO[Math.min(Math.max(grado, 1), 6) - 1];
    const escala = ESCALA_NIVEL[Math.min(Math.max(nivel, 1), 3) - 1];
    return Math.max(5, Math.round(base * escala));
}

const entre = (aleatorio, min, max) => Math.floor(aleatorio() * (max - min + 1)) + min;

function mezclar(lista, aleatorio) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(aleatorio() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Respuestas incorrectas "creíbles": cerca de la correcta (errores típicos de ±1, ±2, ±10).
 * Siempre devuelve 3 valores únicos, enteros, no negativos y distintos de la respuesta.
 */
export function generarDistractores(respuesta, aleatorio = Math.random) {
    const saltos = [1, 2, 3, 10, 5];
    const candidatos = new Set();
    for (const salto of mezclar(saltos, aleatorio)) {
        candidatos.add(respuesta + salto);
        candidatos.add(respuesta - salto);
    }
    const validos = [...candidatos].filter((n) => n >= 0 && n !== respuesta);
    // Garantía: con respuestas muy pequeñas pueden sobrar pocos válidos; se completa hacia arriba
    let extra = Math.max(...validos, respuesta) + 1;
    while (validos.length < 3) validos.push(extra++);
    return mezclar(validos, aleatorio).slice(0, 3);
}

/**
 * @returns {{habilidad:string, enunciado:string, respuesta:number, opciones:number[], pista:string}}
 */
export function generarPregunta({ grado, habilidad, nivel, aleatorio = Math.random }) {
    const tope = topeNumeros(grado, nivel);
    let a;
    let b;
    let respuesta;
    let enunciado;
    let pista;

    if (habilidad === 'suma') {
        a = entre(aleatorio, 1, tope);
        b = entre(aleatorio, 1, tope);
        respuesta = a + b;
        enunciado = `${a} + ${b}`;
        pista = 'Suma primero las unidades y después las decenas.';
    } else if (habilidad === 'resta') {
        a = entre(aleatorio, 2, tope);
        b = entre(aleatorio, 1, a); // b <= a: nunca da negativo
        respuesta = a - b;
        enunciado = `${a} − ${b}`;
        pista = `Piensa: ¿cuánto le falta a ${b} para llegar a ${a}?`;
    } else {
        throw new Error(`Habilidad desconocida: ${habilidad}`);
    }

    const opciones = mezclar([respuesta, ...generarDistractores(respuesta, aleatorio)], aleatorio);
    return { habilidad, enunciado, respuesta, opciones, pista };
}
