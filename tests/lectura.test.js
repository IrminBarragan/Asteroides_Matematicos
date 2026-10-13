import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tiempoDeLectura, MS_MIN_LECTURA, MS_MAX_LECTURA } from '../src/core/lectura.js';

test('un mensaje corto espera el mínimo; uno largo, proporcional; uno larguísimo, el máximo', () => {
    assert.equal(tiempoDeLectura('¡Bien!'), MS_MIN_LECTURA);
    assert.equal(tiempoDeLectura('x'.repeat(100)), 5500);
    assert.equal(tiempoDeLectura('x'.repeat(10_000)), MS_MAX_LECTURA);
});

test('crece con el largo del texto', () => {
    assert.ok(tiempoDeLectura('x'.repeat(120)) > tiempoDeLectura('x'.repeat(60)));
});
