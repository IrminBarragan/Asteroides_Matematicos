import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    describirPegatina, pegatinasGanadas, elegirPegatina, listaPegatinasValida, NUM_PEGATINAS, GLIFOS, COLORES
} from '../src/core/pegatinas.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

test('el catálogo tiene 30 pegatinas distintas (6 dibujos × 5 colores) y nombres únicos y bien concordados', () => {
    assert.equal(NUM_PEGATINAS, GLIFOS.length * COLORES.length);
    const nombres = new Set();
    const combinaciones = new Set();
    for (let id = 0; id < NUM_PEGATINAS; id++) {
        const d = describirPegatina(id);
        nombres.add(d.nombre);
        combinaciones.add(`${d.glifo}/${d.color.id}`);
        assert.equal(d.id, id);
    }
    assert.equal(nombres.size, NUM_PEGATINAS);
    assert.equal(combinaciones.size, NUM_PEGATINAS);
    assert.equal(describirPegatina(0).nombre, 'Estrella azul'.replace('azul', 'azul'));
    assert.match(describirPegatina(1).nombre, /^Estrella naranja$/, 'estrella es femenino pero «naranja» no cambia');
    assert.match(describirPegatina(2).nombre, /^Estrella verde$/);
    assert.match(describirPegatina(3).nombre, /^Estrella morada$/, 'el color concuerda en género');
    assert.match(describirPegatina(4).nombre, /^Estrella roja$/);
    assert.match(describirPegatina(5).nombre, /^Cohete azul$/);
});

test('describirPegatina rechaza ids inexistentes', () => {
    for (const malo of [-1, 30, 1.5, '3', null, undefined, NaN]) assert.throws(() => describirPegatina(malo), /inexistente/);
});

test('pegatinas por partida: 0 sin esfuerzo, 1 por esforzarse y 2 con las 3 estrellas', () => {
    assert.deepEqual([0, 1, 2, 3].map(pegatinasGanadas), [0, 1, 1, 2]);
});

test('elegirPegatina: nunca repite, recorre todo el catálogo y devuelve null al completarlo', () => {
    const az = crearAleatorioSembrado(1);
    const tengo = [];
    for (let i = 0; i < NUM_PEGATINAS; i++) {
        const id = elegirPegatina(tengo, az);
        assert.ok(Number.isInteger(id) && !tengo.includes(id));
        tengo.push(id);
    }
    assert.equal(new Set(tengo).size, NUM_PEGATINAS);
    assert.equal(elegirPegatina(tengo, az), null);
});

test('elegirPegatina es reproducible con aleatorio sembrado y reparte por todo el catálogo', () => {
    const a = [1, 2, 3].map((s) => elegirPegatina([], crearAleatorioSembrado(s)));
    assert.deepEqual(a, [1, 2, 3].map((s) => elegirPegatina([], crearAleatorioSembrado(s))));
    const vistos = new Set();
    const az = crearAleatorioSembrado(5);
    for (let i = 0; i < 300; i++) vistos.add(elegirPegatina([], az));
    assert.ok(vistos.size > 20, `solo ${vistos.size} distintas`);
});

test('listaPegatinasValida', () => {
    assert.equal(listaPegatinasValida([]), true);
    assert.equal(listaPegatinasValida([0, 29]), true);
    for (const mala of [[30], [-1], [1, 1], ['1'], [1.5], null, 'x', {}]) assert.equal(listaPegatinasValida(mala), false, JSON.stringify(mala));
});
