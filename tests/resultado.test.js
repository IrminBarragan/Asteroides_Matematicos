import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEstrellas, normalizarResultado } from '../src/core/resultado.js';

test('estrellas: 0 si no resolvió nada, 1 por esforzarse, 2 con buena precisión, 3 con casi todo a la primera', () => {
    assert.equal(calcularEstrellas({ aciertos: 0, fallos: 0 }), 0);
    assert.equal(calcularEstrellas({ aciertos: 0, fallos: 5 }), 0);            // dejó escapar todo
    assert.equal(calcularEstrellas({ aciertos: 1, fallos: 5 }), 1);
    assert.equal(calcularEstrellas({ aciertos: 6, fallos: 4 }), 2);            // 60 % exacto
    assert.equal(calcularEstrellas({ aciertos: 9, fallos: 1 }), 3);            // 90 % exacto
    assert.equal(calcularEstrellas({ aciertos: 10, fallos: 0 }), 3);
});

test('estrellas: justo debajo de cada umbral', () => {
    assert.equal(calcularEstrellas({ aciertos: 59, fallos: 41 }), 1);
    assert.equal(calcularEstrellas({ aciertos: 89, fallos: 11 }), 2);
});

test('estrellas: terminar reintentando cada pregunta YA NO deja en 0 (era el defecto de la v1)', () => {
    // 10 preguntas, todas falladas al principio y resueltas después
    assert.equal(calcularEstrellas({ aciertos: 0, fallos: 10, recuperadas: 10 }), 1);
    assert.equal(calcularEstrellas({ aciertos: 0, fallos: 10, recuperadas: 0 }), 0, 'sin resolver ninguna sigue siendo 0');
});

test('estrellas: las preguntas recuperadas valen la mitad', () => {
    // 5 a la primera + 5 recuperadas → (5 + 2.5) / 10 = 75 % → 2 estrellas
    assert.equal(calcularEstrellas({ aciertos: 5, fallos: 5, recuperadas: 5 }), 2);
    // 8 a la primera + 2 recuperadas → (8 + 1) / 10 = 90 % → 3 estrellas
    assert.equal(calcularEstrellas({ aciertos: 8, fallos: 2, recuperadas: 2 }), 3);
    // sin recuperar, esos mismos 8 de 10 serían solo 80 % → 2
    assert.equal(calcularEstrellas({ aciertos: 8, fallos: 2, recuperadas: 0 }), 2);
    // recuperar nunca baja las estrellas
    for (let a = 0; a <= 10; a++) {
        for (let r = 0; r <= 10 - a; r++) {
            assert.ok(calcularEstrellas({ aciertos: a, fallos: 10 - a, recuperadas: r }) >= calcularEstrellas({ aciertos: a, fallos: 10 - a, recuperadas: 0 }));
        }
    }
});

test('estrellas: nunca baja al aumentar los aciertos a la primera (monotonía)', () => {
    let previo = -1;
    for (let a = 0; a <= 10; a++) {
        const e = calcularEstrellas({ aciertos: a, fallos: 10 - a, recuperadas: 10 - a });
        assert.ok(e >= previo, `${a} aciertos → ${e}`);
        previo = e;
    }
});

test('normalizarResultado calcula estrellas y puntaje faltantes', () => {
    const r = normalizarResultado({ aciertos: 9, fallos: 1, tiempoMs: 5000 });
    assert.equal(r.estrellas, 3);
    assert.equal(r.puntaje, 90);
});

test('normalizarResultado usa las recuperadas para las estrellas', () => {
    const r = normalizarResultado({ aciertos: 0, fallos: 10, recuperadas: 10, tiempoMs: 1 });
    assert.equal(r.estrellas, 1);
});

test('normalizarResultado respeta estrellas y puntaje del juego y conserva campos extra', () => {
    const r = normalizarResultado({ aciertos: 1, fallos: 9, tiempoMs: 1, estrellas: 2, puntaje: 500, habilidades: { a: 1 } });
    assert.equal(r.estrellas, 2);
    assert.equal(r.puntaje, 500);
    assert.deepEqual(r.habilidades, { a: 1 });
});

test('normalizarResultado no modifica el objeto original', () => {
    const original = { aciertos: 1, fallos: 0, tiempoMs: 10 };
    normalizarResultado(original);
    assert.deepEqual(original, { aciertos: 1, fallos: 0, tiempoMs: 10 });
});

test('normalizarResultado rechaza datos inválidos', () => {
    const base = { aciertos: 1, fallos: 0, tiempoMs: 10 };
    assert.throws(() => normalizarResultado(null));
    assert.throws(() => normalizarResultado({ ...base, aciertos: -1 }));
    assert.throws(() => normalizarResultado({ ...base, fallos: 1.5 }));
    assert.throws(() => normalizarResultado({ ...base, tiempoMs: NaN }));
    assert.throws(() => normalizarResultado({ ...base, tiempoMs: -5 }));
    assert.throws(() => normalizarResultado({ ...base, estrellas: 4 }));
    assert.throws(() => normalizarResultado({ ...base, recuperadas: 1 }), /recuperadas/, 'no puede haber más recuperadas que fallos');
    assert.throws(() => normalizarResultado({ ...base, fallos: 3, recuperadas: -1 }), /recuperadas/);
});
