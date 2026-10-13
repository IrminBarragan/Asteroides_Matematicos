import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Utilidades } from '../src/core/utilidades.js';

test('numeroAleatorio respeta los límites inclusivos', () => {
    const vistos = new Set();
    for (let i = 0; i < 2000; i++) {
        const n = Utilidades.numeroAleatorio(3, 6);
        assert.ok(Number.isInteger(n));
        assert.ok(n >= 3 && n <= 6);
        vistos.add(n);
    }
    // Con 2000 intentos deben aparecer ambos extremos (si no, el rango está mal)
    assert.ok(vistos.has(3) && vistos.has(6));
});

test('limitar acota un valor', () => {
    assert.equal(Utilidades.limitar(5, 0, 10), 5);
    assert.equal(Utilidades.limitar(-2, 0, 10), 0);
    assert.equal(Utilidades.limitar(99, 0, 10), 10);
});

test('puntoEnCirculo incluye el borde y excluye lo de afuera', () => {
    assert.equal(Utilidades.puntoEnCirculo(0, 0, 0, 0, 5), true);
    assert.equal(Utilidades.puntoEnCirculo(3, 4, 0, 0, 5), true); // distancia exacta 5
    assert.equal(Utilidades.puntoEnCirculo(4, 4, 0, 0, 5), false);
});

test('colisionCirculos detecta solapamiento', () => {
    assert.equal(Utilidades.colisionCirculos(0, 0, 5, 8, 0, 5), true);
    assert.equal(Utilidades.colisionCirculos(0, 0, 5, 10, 0, 5), false); // solo se tocan
});

test('formatearNumero agrega separador de miles', () => {
    assert.equal(Utilidades.formatearNumero(1234567), '1.234.567');
    assert.equal(Utilidades.formatearNumero(999), '999');
});
