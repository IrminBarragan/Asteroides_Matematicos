import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entre, elegir, mezclar, crearAleatorioSembrado } from '../src/core/aleatorio.js';

test('entre incluye ambos extremos y solo da enteros del rango', () => {
    const az = crearAleatorioSembrado(1);
    const vistos = new Set();
    for (let i = 0; i < 2000; i++) {
        const n = entre(az, -2, 2);
        assert.ok(Number.isInteger(n) && n >= -2 && n <= 2);
        vistos.add(n);
    }
    assert.equal(vistos.size, 5);
});

test('entre con min = max devuelve ese valor', () => {
    assert.equal(entre(Math.random, 7, 7), 7);
});

test('elegir devuelve elementos de la lista, incluso con aleatorio ≈ 1', () => {
    assert.equal(elegir(() => 0.999999, ['a', 'b', 'c']), 'c');
    assert.equal(elegir(() => 0, ['a', 'b', 'c']), 'a');
});

test('mezclar es una permutación y no modifica la lista original', () => {
    const original = [1, 2, 3, 4, 5, 6];
    const mezclada = mezclar(crearAleatorioSembrado(3), original);
    assert.deepEqual([...mezclada].sort(), original);
    assert.deepEqual(original, [1, 2, 3, 4, 5, 6]);
});

test('mezclar alcanza todas las posiciones (no deja elementos "pegados")', () => {
    const az = crearAleatorioSembrado(9);
    const posiciones = new Set();
    for (let i = 0; i < 300; i++) posiciones.add(mezclar(az, ['x', 'y', 'z']).indexOf('x'));
    assert.equal(posiciones.size, 3);
});

test('el generador sembrado es reproducible y está en [0, 1)', () => {
    const a = crearAleatorioSembrado(42);
    const b = crearAleatorioSembrado(42);
    const c = crearAleatorioSembrado(43);
    const sa = Array.from({ length: 50 }, a);
    assert.deepEqual(sa, Array.from({ length: 50 }, b));
    assert.notDeepEqual(sa, Array.from({ length: 50 }, c));
    assert.ok(sa.every((v) => v >= 0 && v < 1));
});
