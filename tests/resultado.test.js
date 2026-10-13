import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEstrellas, normalizarResultado } from '../src/core/resultado.js';

test('estrellas: 0 sin aciertos, 1 con pocos, 2 con buena precisión, 3 con casi todo bien', () => {
    assert.equal(calcularEstrellas({ aciertos: 0, fallos: 0 }), 0);
    assert.equal(calcularEstrellas({ aciertos: 0, fallos: 5 }), 0);
    assert.equal(calcularEstrellas({ aciertos: 1, fallos: 5 }), 1);
    assert.equal(calcularEstrellas({ aciertos: 7, fallos: 3 }), 2);   // 70% exacto
    assert.equal(calcularEstrellas({ aciertos: 9, fallos: 1 }), 3);   // 90% exacto
    assert.equal(calcularEstrellas({ aciertos: 10, fallos: 0 }), 3);
});

test('estrellas: justo debajo de cada umbral', () => {
    assert.equal(calcularEstrellas({ aciertos: 69, fallos: 31 }), 1);
    assert.equal(calcularEstrellas({ aciertos: 89, fallos: 11 }), 2);
});

test('normalizarResultado calcula estrellas y puntaje faltantes', () => {
    const r = normalizarResultado({ aciertos: 9, fallos: 1, tiempoMs: 5000 });
    assert.equal(r.estrellas, 3);
    assert.equal(r.puntaje, 90);
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
});
