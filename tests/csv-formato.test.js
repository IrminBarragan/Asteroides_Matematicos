import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aCSV, neutralizarFormula } from '../src/portal/csv.js';
import { formatearTiempo, mensajeResultado, textoGrado, textoEstrellas } from '../src/portal/formato.js';

test('neutralizarFormula antepone comilla a textos peligrosos y respeta números', () => {
    for (const peligroso of ['=1+1', '+1', '-1', '@x', '\tx', '\rx']) {
        assert.equal(neutralizarFormula(peligroso), `'${peligroso}`);
    }
    assert.equal(neutralizarFormula('Luisa'), 'Luisa');
    assert.equal(neutralizarFormula(-5), -5); // un número negativo NO es texto
    assert.equal(neutralizarFormula(0), 0);
});

test('aCSV escapa comas, comillas y saltos de línea', () => {
    const csv = aCSV(['a', 'b'], [['hola, mundo', 'dice "hola"'], ['línea1\nlínea2', null]]);
    assert.equal(csv, '﻿a,b\r\n"hola, mundo","dice ""hola"""\r\n"línea1\nlínea2",\r\n');
});

test('aCSV con números negativos no los prefija', () => {
    assert.equal(aCSV(['n'], [[-3]]), '﻿n\r\n-3\r\n');
});

test('formatearTiempo', () => {
    assert.equal(formatearTiempo(0), '0:00');
    assert.equal(formatearTiempo(65_000), '1:05');
    assert.equal(formatearTiempo(599_400), '9:59');  // redondea al segundo más cercano
    assert.equal(formatearTiempo(599_500), '10:00');
    assert.equal(formatearTiempo(-50), '0:00');
});

test('mensajeResultado siempre anima, incluso con 0 estrellas', () => {
    for (const n of [0, 1, 2, 3]) assert.ok(mensajeResultado(n).length > 5);
    assert.match(mensajeResultado(0), /inténtalo/);
});

test('textos de grado y estrellas', () => {
    assert.equal(textoGrado(3), '3.º grado');
    assert.equal(textoEstrellas(2), '2 de 3 estrellas');
});
