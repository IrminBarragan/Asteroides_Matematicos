import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    avanzarEscalon, ajustarGradoContenido, gradoInicialColocacion, creditoPartida, nivelPromedio,
    PREGUNTAS_COLOCACION, UMBRAL_BAJAR, UMBRAL_SUBIR
} from '../src/adaptativo/colocacion.js';

const inicio = (grado) => ({ grado, aciertosSeguidos: 0, erroresSeguidos: 0 });

test('la misión empieza dos grados por debajo del tope, sin salir del rango', () => {
    assert.equal(gradoInicialColocacion(1, 6), 4);
    assert.equal(gradoInicialColocacion(1, 2), 1);
    assert.equal(gradoInicialColocacion(3, 6), 4);
    assert.equal(gradoInicialColocacion(3, 3), 3);
});

test('escalera: dos aciertos seguidos suben un grado; uno solo no', () => {
    let e = avanzarEscalon(inicio(3), true, 1, 6);
    assert.deepEqual(e, { grado: 3, aciertosSeguidos: 1, erroresSeguidos: 0 });
    e = avanzarEscalon(e, true, 1, 6);
    assert.deepEqual(e, { grado: 4, aciertosSeguidos: 0, erroresSeguidos: 0 });
});

test('escalera: un error baja uno; el segundo error seguido baja dos', () => {
    let e = avanzarEscalon(inicio(5), false, 1, 6);
    assert.equal(e.grado, 4);
    e = avanzarEscalon(e, false, 1, 6);
    assert.equal(e.grado, 2);
    e = avanzarEscalon(e, false, 1, 6);
    assert.equal(e.grado, 1, 'nunca baja del mínimo');
});

test('escalera: un acierto reinicia la cuenta de errores y un error la de aciertos', () => {
    let e = avanzarEscalon(inicio(4), false, 1, 6);
    e = avanzarEscalon(e, true, 1, 6);
    assert.equal(e.erroresSeguidos, 0);
    e = avanzarEscalon(e, false, 1, 6);
    assert.equal(e.grado, 2, 'el error tras un acierto vuelve a bajar solo uno');
    e = avanzarEscalon(avanzarEscalon(inicio(3), true, 1, 6), false, 1, 6);
    assert.equal(e.aciertosSeguidos, 0);
});

test('escalera: nunca sale de [gradoMin, gradoMax]', () => {
    let e = inicio(6);
    for (let i = 0; i < 10; i++) e = avanzarEscalon(e, true, 3, 6);
    assert.equal(e.grado, 6);
    e = inicio(3);
    for (let i = 0; i < 10; i++) e = avanzarEscalon(e, false, 3, 6);
    assert.equal(e.grado, 3);
});

test('escalera: un niño que sabe todo termina en el tope y uno que no sabe nada, en el piso (con 8 preguntas)', () => {
    let sabe = inicio(gradoInicialColocacion(1, 6));
    let nada = inicio(gradoInicialColocacion(1, 6));
    for (let i = 0; i < PREGUNTAS_COLOCACION; i++) {
        sabe = avanzarEscalon(sabe, true, 1, 6);
        nada = avanzarEscalon(nada, false, 1, 6);
    }
    assert.equal(sabe.grado, 6);
    assert.equal(nada.grado, 1);
});

test('escalera: la escalera «se queda» cerca del nivel donde el niño empieza a fallar (sabe hasta 3.º)', () => {
    // El niño acierta si el grado de contenido es ≤ 3
    let e = inicio(gradoInicialColocacion(1, 6));
    const visitados = [];
    for (let i = 0; i < PREGUNTAS_COLOCACION; i++) {
        visitados.push(e.grado);
        e = avanzarEscalon(e, e.grado <= 3, 1, 6);
    }
    assert.ok(e.grado >= 2 && e.grado <= 4, `terminó en ${e.grado}; recorrió ${visitados}`);
});

test('creditoPartida: aciertos valen 1 y recuperadas ½', () => {
    assert.equal(creditoPartida({ aciertos: 10, fallos: 0 }), 1);
    assert.equal(creditoPartida({ aciertos: 5, fallos: 5, recuperadas: 5 }), 0.75);
    assert.equal(creditoPartida({ aciertos: 0, fallos: 0 }), 0);
});

test('nivelPromedio de una instantánea del motor', () => {
    assert.equal(nivelPromedio({ a: { nivel: 1 }, b: { nivel: 3 } }), 2);
    assert.equal(nivelPromedio({}), null);
    assert.equal(nivelPromedio(null), null);
    assert.equal(nivelPromedio({ a: { nivel: 'x' } }), null);
});

const hab = (...niveles) => Object.fromEntries(niveles.map((n, i) => [`h${i}`, { nivel: n }]));
const caso = (aciertos, fallos, recuperadas, niveles, grado = 4) =>
    ajustarGradoContenido({ grado, gradoMin: 1, gradoMax: 6, resultado: { aciertos, fallos, recuperadas, habilidades: hab(...niveles) } });

test('ajuste: BAJA si le fue mal y sus habilidades ya están en el nivel más fácil', () => {
    assert.deepEqual(caso(2, 8, 2, [1, 1, 1]), { grado: 3, cambio: 'bajo' });
});

test('ajuste: NO baja si todavía puede bajar de nivel dentro del grado (el motor tiene su oportunidad primero)', () => {
    assert.deepEqual(caso(2, 8, 2, [3, 3, 2]), { grado: 4, cambio: null });
});

test('ajuste: NO baja con crédito suficiente aunque esté en nivel 1', () => {
    assert.deepEqual(caso(6, 4, 0, [1, 1]), { grado: 4, cambio: null });
});

test('ajuste: SUBE si le fue muy bien y domina el nivel más difícil', () => {
    assert.deepEqual(caso(10, 0, 0, [3, 3, 3]), { grado: 5, cambio: 'subio' });
    assert.deepEqual(caso(9, 1, 1, [3, 3]), { grado: 5, cambio: 'subio' });
});

test('ajuste: NO sube si aún está en niveles bajos del grado (no se salta contenido)', () => {
    assert.deepEqual(caso(10, 0, 0, [1, 2, 1]), { grado: 4, cambio: null });
});

test('ajuste: respeta el rango (no baja del mínimo ni sube del tope) y mueve máximo un grado', () => {
    assert.deepEqual(caso(0, 10, 0, [1, 1], 1), { grado: 1, cambio: null });
    assert.deepEqual(caso(10, 0, 0, [3, 3], 6), { grado: 6, cambio: null });
    const g = caso(10, 0, 0, [3, 3], 4).grado;
    assert.equal(g - 4, 1);
});

test('ajuste: sin datos de habilidades no cambia nada', () => {
    assert.deepEqual(ajustarGradoContenido({ grado: 3, gradoMin: 1, gradoMax: 6, resultado: { aciertos: 0, fallos: 10 } }), { grado: 3, cambio: null });
});

test('los umbrales son coherentes con las estrellas (bajar < 60 % ≤ ... ≤ 90 % subir)', () => {
    assert.ok(UMBRAL_BAJAR < 0.6);
    assert.equal(UMBRAL_SUBIR, 0.9);
});
