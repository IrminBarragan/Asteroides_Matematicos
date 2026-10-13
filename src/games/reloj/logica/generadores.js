/**
 * Generación de preguntas de "Reloj Aventurero" (lógica pura, sin DOM).
 *
 * Habilidades por grado:
 *   1.º leer la hora, poner la hora                       (en punto y y media)
 *   2.º leer, poner, decir la hora con palabras           (+ cuartos)
 *   3.º leer, poner, duración                             (+ de 5 en 5 minutos y luego minuto a minuto)
 *   4.º leer, poner, reloj de 24 horas, duración          (+ horas y minutos de duración)
 *
 * Tipos de pregunta:
 *   'opciones' → se muestran uno o dos relojes y se elige entre botones (ids 0..n-1; la correcta es la 0 antes de mezclar)
 *   'poner'    → el niño arrastra las manecillas; `respuesta` es el `codigoHora` de la hora pedida
 */
import { entre, elegir, mezclar } from '../../../core/aleatorio.js';
import {
    codigoHora, formatoDigital, formato24, formato12ConPeriodo, textoEnPalabras, periodoDelDia, a12,
    desdeMinutosDelDia, minutosDelDia, formatoDuracion, normalizarHora12
} from '../../../core/tiempo.js';

export const NIVEL_MAX = 3;
export const GRADO_MIN = 1;
export const GRADO_MAX = 4;

export const HABILIDADES_POR_GRADO = {
    1: ['leer-hora', 'poner-hora'],
    2: ['leer-hora', 'poner-hora', 'hora-en-palabras'],
    3: ['leer-hora', 'poner-hora', 'duracion'],
    4: ['leer-hora', 'poner-hora', 'formato-24h', 'duracion']
};

export const NOMBRES_HABILIDAD = {
    'leer-hora': 'leer el reloj', 'poner-hora': 'poner la hora', 'hora-en-palabras': 'decir la hora',
    'formato-24h': 'el reloj de 24 horas', 'duracion': 'calcular el tiempo que pasa'
};

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);
const rango = (desde, hasta, paso) => Array.from({ length: Math.floor((hasta - desde) / paso) + 1 }, (_, i) => desde + i * paso);

export function habilidadesParaGrado(grado) {
    const lista = HABILIDADES_POR_GRADO[acotar(grado, GRADO_MIN, GRADO_MAX)];
    return Object.fromEntries(lista.map((h) => [h, { nivelMax: NIVEL_MAX }]));
}

// ---------- Qué minutos aparecen y a qué paso se arrastra el minutero ----------

const TODOS = rango(0, 59, 1);
const MINUTOS = {
    1: [[0], [0, 30], [0, 30]],
    2: [[0, 30], [0, 15, 30, 45], [0, 15, 30, 45]],
    3: [[0, 15, 30, 45], rango(0, 55, 5), TODOS],
    4: [rango(0, 55, 5), TODOS, TODOS]
};
/** Cada cuántos minutos "salta" el minutero al arrastrarlo (siempre divide a los minutos permitidos). */
const PASO_MINUTERO = { 1: [30, 30, 30], 2: [30, 15, 15], 3: [15, 5, 1], 4: [5, 1, 1] };

export function minutosPermitidos(grado, nivel) {
    return MINUTOS[acotar(grado, GRADO_MIN, GRADO_MAX)][acotar(nivel, 1, NIVEL_MAX) - 1];
}

export function pasoMinutero(grado, nivel) {
    return PASO_MINUTERO[acotar(grado, GRADO_MIN, GRADO_MAX)][acotar(nivel, 1, NIVEL_MAX) - 1];
}

/** Cuántos botones: 3 en el nivel fácil y 4 después. */
export function cantidadOpciones(nivel) {
    return nivel <= 1 ? 3 : 4;
}

export function prepararRonda(grado, nivel) {
    return { cantidad: cantidadOpciones(nivel) };
}

// ---------- Distractores: errores típicos al leer el reloj ----------

const horaValida = ({ h, m }) => h >= 1 && h <= 12 && m >= 0 && m <= 59;

/**
 * Horas "creíbles" pero incorrectas:
 *  - leer la manecilla corta como si fuera la larga (y al revés): 3:30 → 6:15
 *  - equivocarse una hora (sobre todo cuando el horario está entre dos números)
 *  - equivocarse de minutos por un paso o dos
 */
export function distractoresHora(h, m, aleatorio, cantidad, paso = 5) {
    const candidatos = [];
    if (m % 5 === 0) candidatos.push({ h: m === 0 ? 12 : m / 5, m: (h % 12) * 5 }); // manecillas intercambiadas
    candidatos.push({ h: normalizarHora12(h + 1), m }, { h: normalizarHora12(h - 1), m });
    for (const d of [paso, 2 * paso]) candidatos.push({ h, m: m + d }, { h, m: m - d });
    candidatos.push({ h: normalizarHora12(h + 1), m: (m + 30) % 60 });

    const textoDe = ({ h: hh, m: mm }) => formatoDigital(hh, mm);
    const usados = new Set([textoDe({ h, m })]);
    const salida = [];
    const agregar = (c) => {
        if (salida.length < cantidad && horaValida(c) && !usados.has(textoDe(c))) {
            usados.add(textoDe(c));
            salida.push(c);
        }
    };
    mezclar(aleatorio, candidatos).forEach(agregar);
    while (salida.length < cantidad) agregar({ h: entre(aleatorio, 1, 12), m: elegir(aleatorio, [0, 15, 30, 45]) });
    return salida;
}

/**
 * Elige `cantidad` errores DISTINTOS de la respuesta: primero los típicos (`candidatos`) y, si no alcanzan
 * (varios pueden coincidir con la respuesta, p. ej. "no sumar 12" en las horas de la mañana), los completa con `relleno()`.
 */
function elegirErrores(correcta, candidatos, cantidad, aleatorio, relleno) {
    const errores = [];
    const agregar = (c) => {
        if (errores.length < cantidad && c !== correcta && !errores.includes(c)) errores.push(c);
    };
    mezclar(aleatorio, candidatos).forEach(agregar);
    for (let intentos = 0; errores.length < cantidad && intentos < 500; intentos++) agregar(relleno());
    if (errores.length < cantidad) throw new Error(`No se pudieron generar ${cantidad} errores distintos de «${correcta}»`);
    return errores;
}

function armarOpciones(textos, aleatorio) {
    return mezclar(aleatorio, textos.map((texto, id) => ({ id, texto })));
}

const PISTAS = {
    'leer-hora': 'Mira primero la manecilla CORTA (las horas) y luego la LARGA (los minutos). Cada número del reloj vale 5 minutos.',
    'poner-hora': 'La manecilla corta marca las horas y la larga los minutos. Con la larga en el 12 es en punto; en el 6, y media.',
    'hora-en-palabras': 'Con la larga en el 12 es «en punto»; en el 3, «y cuarto»; en el 6, «y media»; en el 9, «menos cuarto».',
    'formato-24h': 'En el reloj de 24 horas, después de las 12 del mediodía la hora sigue: la 1 de la tarde es las 13. Para pasar a 24 h se suma 12.',
    'duracion': 'Cuenta los minutos que pasan. Al llegar a 60 minutos, la hora avanza una y los minutos vuelven a empezar.'
};

function explicacionLectura(h, m) {
    const digital = formatoDigital(h, m);
    if (m === 0) return `${digital} es en punto: la manecilla larga está en el 12 y la corta señala el ${h}.`;
    // La hora es el número que la manecilla corta YA PASÓ (a las 2:45 está casi en el 3, pero todavía es la hora 2)
    const siguiente = normalizarHora12(h + 1);
    const corta = `la manecilla corta ya pasó el ${h} pero no llegó al ${siguiente} (por eso es la hora ${h})`;
    if (m % 5 === 0) return `${digital}: ${corta}, y la larga está en el ${m / 5} (${m / 5} × 5 = ${m} minutos).`;
    return `${digital}: ${corta}, y la larga marca ${m} minutos (cada rayita es un minuto).`;
}

// ---------- Generadores por habilidad ----------

function horaAlAzar(grado, nivel, aleatorio) {
    return { h: entre(aleatorio, 1, 12), m: elegir(aleatorio, minutosPermitidos(grado, nivel)) };
}

function leerHora({ grado, nivel, cantidad, aleatorio }) {
    const { h, m } = horaAlAzar(grado, nivel, aleatorio);
    const paso = pasoMinutero(grado, nivel);
    const errores = distractoresHora(h, m, aleatorio, cantidad - 1, paso);
    return {
        tipo: 'opciones', enunciado: '¿Qué hora marca el reloj?', relojes: [{ h, m }],
        textoRespuesta: formatoDigital(h, m),
        opciones: armarOpciones([formatoDigital(h, m), ...errores.map((e) => formatoDigital(e.h, e.m))], aleatorio),
        pista: PISTAS['leer-hora'], explicacion: explicacionLectura(h, m)
    };
}

function ponerHora({ grado, nivel, aleatorio }) {
    const { h, m } = horaAlAzar(grado, nivel, aleatorio);
    const digital = formatoDigital(h, m);
    // En los primeros grados se pide con palabras Y con números: la meta es unirlas con el reloj
    const articulo = h === 1 ? 'la' : 'las';
    const pedido = grado <= 2 && m % 5 === 0 ? `${textoEnPalabras(h, m)} (${digital})` : `${articulo} ${digital}`;
    let inicio = { h: 12, m: 0 };
    if (codigoHora(inicio.h, inicio.m) === codigoHora(h, m)) inicio = { h: 6, m: 0 }; // nunca empieza ya resuelto
    return {
        tipo: 'poner', enunciado: `Pon el reloj a ${pedido}`, relojes: [], relojInicial: inicio, paso: pasoMinutero(grado, nivel),
        respuesta: codigoHora(h, m), textoRespuesta: digital, horaPedida: { h, m }, opciones: [],
        pista: PISTAS['poner-hora'], explicacion: explicacionLectura(h, m)
    };
}

function horaEnPalabras({ grado, nivel, cantidad, aleatorio }) {
    const permitidos = grado <= 2 ? minutosPermitidos(grado, nivel) : rango(0, 55, 5);
    const h = entre(aleatorio, 1, 12);
    const m = elegir(aleatorio, permitidos);
    // Frases (no horas): solo se pueden decir con palabras los minutos múltiplos de 5
    const correcta = textoEnPalabras(h, m);
    const candidatos = distractoresHora(h, m, aleatorio, 6, 5).filter((e) => e.m % 5 === 0).map((e) => textoEnPalabras(e.h, e.m));
    const errores = elegirErrores(correcta, candidatos, cantidad - 1, aleatorio,
        () => textoEnPalabras(entre(aleatorio, 1, 12), elegir(aleatorio, rango(0, 55, 5))));
    return {
        tipo: 'opciones', enunciado: '¿Cómo se dice la hora que marca el reloj?', relojes: [{ h, m }],
        textoRespuesta: correcta,
        opciones: armarOpciones([correcta, ...errores], aleatorio),
        pista: PISTAS['hora-en-palabras'], explicacion: `${textoEnPalabras(h, m)} es ${formatoDigital(h, m)}. ${explicacionLectura(h, m)}`
    };
}

function formato24h({ nivel, cantidad, aleatorio }) {
    const minutos = nivel === 1 ? [0, 30] : rango(0, 55, 5);
    const bordes = nivel >= 3 && aleatorio() < 0.4; // 12 a. m. (0 h) y 12 p. m. (12 h) son las que más confunden
    const h24 = bordes ? elegir(aleatorio, [0, 12]) : elegir(aleatorio, [...rango(1, 11, 1), ...rango(13, 23, 1)]);
    const m = elegir(aleatorio, minutos);
    const { h: h12, pm } = a12(h24);

    if (aleatorio() < 0.5) { // de 12 h a 24 h
        const correcta = formato24(h24, m);
        const candidatos = [
            formato24((h24 + 12) % 24, m),                 // se equivocó de mañana/tarde
            formato24(h12, m),                             // no sumó 12
            formato24((h12 + 10) % 24, m),                 // sumó 10 en lugar de 12
            formato24(h24 === 0 ? 12 : (h24 + 1) % 24, m)  // una hora de diferencia
        ];
        const errores = elegirErrores(correcta, candidatos, cantidad - 1, aleatorio, () => formato24(entre(aleatorio, 0, 23), m));
        return {
            tipo: 'opciones', enunciado: `Son las ${formatoDigital(h12, m)} ${periodoDelDia(h24)}. ¿Cómo se escribe en el reloj de 24 horas?`,
            relojes: [], textoRespuesta: correcta, opciones: armarOpciones([correcta, ...errores], aleatorio),
            pista: PISTAS['formato-24h'],
            explicacion: `${formatoDigital(h12, m)} ${pm ? 'p. m.' : 'a. m.'} se escribe ${correcta} en 24 horas${h24 === 0 ? ' (las 12 de la noche son las 00)' : h24 === 12 ? ' (las 12 del día son las 12)' : pm ? ` (${h12} + 12 = ${h24})` : ''}.`
        };
    }
    const correcta = formato12ConPeriodo(h24, m);
    const otraHora = ((h24 + 12) % 24);
    const candidatos = [
        formato12ConPeriodo(otraHora, m),                  // mismo número, cambió a. m. / p. m.
        formato12ConPeriodo((h24 + 2) % 24, m),
        formato12ConPeriodo((h24 + 23) % 24, m),
        formato12ConPeriodo((h24 + 10) % 24, m)
    ];
    const errores = elegirErrores(correcta, candidatos, cantidad - 1, aleatorio, () => formato12ConPeriodo(entre(aleatorio, 0, 23), m));
    return {
        tipo: 'opciones', enunciado: `En un reloj digital de 24 horas se lee ${formato24(h24, m)}. ¿Qué hora es en el reloj de 12 horas?`,
        relojes: [], textoRespuesta: correcta, opciones: armarOpciones([correcta, ...errores], aleatorio),
        pista: PISTAS['formato-24h'],
        explicacion: `${formato24(h24, m)} es ${correcta}${h24 === 0 ? ' (00 son las 12 de la noche)' : h24 > 12 ? ` (${h24} − 12 = ${h12})` : ''}.`
    };
}

/** Duración: cuánto tiempo pasa o a qué hora termina algo. Cada nivel permite duraciones más largas y menos "redondas". */
const DURACION = {
    3: [{ inicioPaso: 15, desde: 5, hasta: 30, paso: 5 }, { inicioPaso: 5, desde: 5, hasta: 55, paso: 5 }, { inicioPaso: 5, desde: 10, hasta: 90, paso: 5 }],
    4: [{ inicioPaso: 5, desde: 10, hasta: 90, paso: 5 }, { inicioPaso: 5, desde: 15, hasta: 165, paso: 5 }, { inicioPaso: 1, desde: 10, hasta: 180, paso: 1 }]
};

export function configuracionDuracion(grado, nivel) {
    return DURACION[acotar(grado, 3, 4)][acotar(nivel, 1, NIVEL_MAX) - 1];
}

function duracion({ grado, nivel, cantidad, aleatorio }) {
    const c = configuracionDuracion(grado, nivel);
    const horaInicio = entre(aleatorio, 1, 12);
    const minInicio = elegir(aleatorio, rango(0, 59, c.inicioPaso));
    const d = elegir(aleatorio, rango(c.desde, c.hasta, c.paso));
    // En el nivel fácil la actividad termina dentro de la misma hora; después puede cruzar a la siguiente
    const dentroDeLaHora = nivel === 1 && grado === 3;
    const duracionFinal = dentroDeLaHora ? Math.min(d, 59 - minInicio) || 5 : d;
    const t0 = minutosDelDia(horaInicio, minInicio);
    const fin = desdeMinutosDelDia(t0 + duracionFinal);
    const hFin = normalizarHora12(fin.h24);
    const pasoOpcion = c.paso;

    if (aleatorio() < 0.5) { // ¿A qué hora termina?
        const correcta = formatoDigital(hFin, fin.m);
        const candidatos = [
            { h: hFin, m: fin.m + pasoOpcion }, { h: hFin, m: fin.m - pasoOpcion }, { h: hFin, m: fin.m + 2 * pasoOpcion },
            { h: normalizarHora12(hFin + 1), m: fin.m }, { h: normalizarHora12(hFin - 1), m: fin.m }
        ].filter((x) => horaValida(x)).map((x) => formatoDigital(x.h, x.m));
        const errores = elegirErrores(correcta, candidatos, cantidad - 1, aleatorio,
            () => formatoDigital(entre(aleatorio, 1, 12), elegir(aleatorio, [0, 15, 30, 45])));
        return {
            tipo: 'opciones', enunciado: `Empieza a las ${formatoDigital(horaInicio, minInicio)} y dura ${formatoDuracion(duracionFinal)}. ¿A qué hora termina?`,
            relojes: [{ h: horaInicio, m: minInicio, etiqueta: 'Empieza' }], textoRespuesta: correcta,
            opciones: armarOpciones([correcta, ...errores], aleatorio), pista: PISTAS.duracion,
            explicacion: `${formatoDigital(horaInicio, minInicio)} + ${formatoDuracion(duracionFinal)} = ${correcta}.`
        };
    }
    // ¿Cuántos minutos pasan?
    const correcta = `${duracionFinal} minutos`;
    const candidatos = [duracionFinal + pasoOpcion, duracionFinal - pasoOpcion, duracionFinal + 2 * pasoOpcion, duracionFinal + 60, duracionFinal - 60]
        .filter((x) => x > 0).map((x) => `${x} minutos`);
    const errores = elegirErrores(correcta, candidatos, cantidad - 1, aleatorio,
        () => `${Math.max(1, duracionFinal + entre(aleatorio, -6, 6) * pasoOpcion)} minutos`);
    return {
        tipo: 'opciones', enunciado: `¿Cuántos minutos pasan desde las ${formatoDigital(horaInicio, minInicio)} hasta las ${formatoDigital(hFin, fin.m)}?`,
        relojes: [{ h: horaInicio, m: minInicio, etiqueta: 'Empieza' }, { h: hFin, m: fin.m, etiqueta: 'Termina' }],
        textoRespuesta: correcta, opciones: armarOpciones([correcta, ...errores], aleatorio), pista: PISTAS.duracion,
        explicacion: `De ${formatoDigital(horaInicio, minInicio)} a ${formatoDigital(hFin, fin.m)} pasan ${formatoDuracion(duracionFinal)} (${duracionFinal} minutos).`
    };
}

const GENERADORES = { 'leer-hora': leerHora, 'poner-hora': ponerHora, 'hora-en-palabras': horaEnPalabras, 'formato-24h': formato24h, duracion };

/**
 * @returns {{habilidad:string, tipo:'opciones'|'poner', enunciado:string, relojes:{h:number,m:number,etiqueta?:string}[],
 *            respuesta:number, textoRespuesta:string, opciones:{id:number,texto:string}[], pista:string, explicacion:string,
 *            relojInicial?:{h:number,m:number}, paso?:number}}
 */
export function generarPregunta({ grado, habilidad, nivel, cantidad = 3, aleatorio = Math.random }) {
    const generador = GENERADORES[habilidad];
    if (!generador) throw new Error(`Habilidad desconocida: ${habilidad}`);
    const g = acotar(grado, GRADO_MIN, GRADO_MAX);
    const n = acotar(nivel, 1, NIVEL_MAX);
    const base = generador({ grado: g, nivel: n, cantidad: acotar(cantidad, 2, 4), aleatorio });
    return { habilidad, respuesta: 0, ...base };
}

