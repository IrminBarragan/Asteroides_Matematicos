import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    cantidadAsteroides, velocidadBase, colocarAsteroides, poderParaPregunta, repartirOpciones,
    ANCHO, RADIO_MIN, RADIO_MAX, PODERES
} from '../src/games/asteroides/logica/campo.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

test('cantidad de asteroides: pocos para los más chicos, máximo 5', () => {
    assert.equal(cantidadAsteroides(1, 1), 3);
    assert.equal(cantidadAsteroides(2, 2), 3);
    assert.equal(cantidadAsteroides(3, 1), 4);
    assert.equal(cantidadAsteroides(6, 3), 5);
    for (let g = 1; g <= 6; g++) for (let n = 1; n <= 3; n++) {
        const c = cantidadAsteroides(g, n);
        assert.ok(c >= 3 && c <= 5);
    }
});

test('la velocidad crece con el grado y con el nivel, y nunca es 0', () => {
    for (let n = 1; n <= 3; n++) for (let g = 1; g < 6; g++) assert.ok(velocidadBase(g + 1, n) > velocidadBase(g, n));
    for (let g = 1; g <= 6; g++) for (let n = 1; n < 3; n++) assert.ok(velocidadBase(g, n + 1) > velocidadBase(g, n));
    assert.ok(velocidadBase(1, 1) > 0);
    assert.equal(velocidadBase(99, 99), velocidadBase(6, 3));
});

test('el ritmo es razonable: 1.º tiene tiempo para leer (15–30 s en cruzar) y 6.º no se aburre (< 12 s)', () => {
    const segundos = (g, n) => (600 + 60) / velocidadBase(g, n) / 60;
    assert.ok(segundos(1, 1) >= 15 && segundos(1, 1) <= 30, `1.º nivel 1: ${segundos(1, 1).toFixed(1)} s`);
    assert.ok(segundos(6, 3) < 12, `6.º nivel 3: ${segundos(6, 3).toFixed(1)} s`);
});

test('el primer asteroide aparece en pantalla en pocos segundos (el niño no mira una pantalla vacía)', () => {
    for (let semilla = 0; semilla < 200; semilla++) {
        const az = crearAleatorioSembrado(semilla);
        for (const a of colocarAsteroides(5, az)) {
            const segundosEnAparecer = (-a.y) / velocidadBase(1, 1) / 60;
            assert.ok(segundosEnAparecer < 4, `${segundosEnAparecer.toFixed(1)} s`);
        }
    }
});

test('colocarAsteroides: NUNCA se solapan ni se salen de la pantalla (3 a 5 asteroides, miles de casos)', () => {
    for (let cantidad = 3; cantidad <= 5; cantidad++) {
        for (let semilla = 0; semilla < 1500; semilla++) {
            const az = crearAleatorioSembrado(semilla);
            const lista = colocarAsteroides(cantidad, az);
            assert.equal(lista.length, cantidad);
            for (const a of lista) {
                assert.ok(a.radio >= RADIO_MIN && a.radio <= RADIO_MAX);
                assert.ok(a.x - a.radio >= 0 && a.x + a.radio <= ANCHO, `fuera de pantalla x=${a.x}`);
                assert.ok(a.y + a.radio <= 0, 'deben nacer por encima de la pantalla');
            }
            for (let i = 0; i < lista.length; i++) {
                for (let j = i + 1; j < lista.length; j++) {
                    const distancia = Math.abs(lista[i].x - lista[j].x);
                    assert.ok(distancia >= lista[i].radio + lista[j].radio,
                        `solapan: ${distancia} < ${lista[i].radio + lista[j].radio}`);
                }
            }
        }
    }
});

test('colocarAsteroides: los carriles van de izquierda a derecha y las entradas se escalonan', () => {
    const lista = colocarAsteroides(5, crearAleatorioSembrado(4));
    for (let i = 1; i < lista.length; i++) assert.ok(lista[i].x > lista[i - 1].x);
    assert.ok(new Set(lista.map((a) => Math.round(a.y))).size > 1);
});

test('repartirOpciones mezcla sin perder opciones: la correcta cae en distintos carriles', () => {
    const opciones = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const posiciones = new Set();
    const az = crearAleatorioSembrado(8);
    for (let i = 0; i < 200; i++) {
        const r = repartirOpciones(opciones, az);
        assert.equal(r.length, 4);
        posiciones.add(r.findIndex((o) => o.id === 1));
    }
    assert.equal(posiciones.size, 4);
});

test('poderes: nunca en la primera pregunta, y a veces después; salen los tres tipos', () => {
    const az = crearAleatorioSembrado(5);
    for (let i = 0; i < 200; i++) assert.equal(poderParaPregunta(1, az), null);
    const tipos = new Set();
    let conPoder = 0;
    for (let i = 0; i < 2000; i++) {
        const p = poderParaPregunta(5, az);
        if (p) { conPoder++; tipos.add(p); }
    }
    assert.deepEqual([...tipos].sort(), Object.keys(PODERES).sort());
    assert.ok(conPoder > 400 && conPoder < 800, `${conPoder}/2000 (esperado ≈ 30 %)`);
});
