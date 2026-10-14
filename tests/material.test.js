import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EstadoMarcos, EstadoRecta } from '../src/core/material.js';
import { apoyoInicial, siguienteApoyo, APOYOS } from '../src/games/calculo/logica/apoyo.js';

// ---------- Marcos de diez ----------

test('marcos: poner llena la primera casilla vacía y el conteo cuadra', () => {
    const m = new EstadoMarcos({ capacidad: 10 });
    for (let i = 0; i < 3; i++) assert.equal(m.poner('a'), true);
    for (let i = 0; i < 2; i++) assert.equal(m.poner('b'), true);
    assert.deepEqual(m.casillas.slice(0, 6), ['a', 'a', 'a', 'b', 'b', 'vacia']);
    assert.deepEqual(m.conteo(), { a: 3, b: 2, tachadas: 0, vacias: 5, fichas: 5 });
});

test('marcos: no caben más fichas que la capacidad ni colores inventados', () => {
    const m = new EstadoMarcos({ capacidad: 10 });
    for (let i = 0; i < 10; i++) assert.equal(m.poner('a'), true);
    assert.equal(m.poner('a'), false, 'lleno');
    assert.equal(m.conteo().fichas, 10);
    assert.throws(() => m.poner('verde'), /color/);
});

test('marcos: quitarUltima saca la última ficha puesta y no inventa fichas', () => {
    const m = new EstadoMarcos({ capacidad: 20 });
    assert.equal(m.quitarUltima(), false, 'no hay nada que quitar');
    m.poner('a'); m.poner('b');
    assert.equal(m.quitarUltima(), true);
    assert.deepEqual(m.conteo(), { a: 1, b: 0, tachadas: 0, vacias: 19, fichas: 1 });
});

test('marcos: una resta empieza con las fichas del primer número y se tachan y destachan', () => {
    const m = new EstadoMarcos({ capacidad: 10, llenas: 7 });
    assert.equal(m.conteo().fichas, 7);
    assert.equal(m.alternarTachado(8), false, 'no se tacha una casilla vacía');
    assert.equal(m.alternarTachado(-1), false);
    assert.equal(m.alternarTachado(99), false);
    assert.equal(m.alternarTachado(0), true);
    assert.equal(m.alternarTachado(1), true);
    assert.equal(m.conteo().tachadas, 2);
    assert.equal(m.alternarTachado(0), true, 'segundo toque: la destacha');
    assert.equal(m.conteo().tachadas, 1);
    m.reiniciar(7);
    assert.deepEqual(m.conteo(), { a: 7, b: 0, tachadas: 0, vacias: 3, fichas: 7 });
});

test('marcos: parámetros inválidos se rechazan', () => {
    assert.throws(() => new EstadoMarcos({ capacidad: 0 }));
    assert.throws(() => new EstadoMarcos({ capacidad: 10, llenas: 11 }));
    assert.throws(() => new EstadoMarcos({ capacidad: 10, llenas: -1 }));
});

// ---------- Recta de saltos ----------

test('recta: avanza y retrocede, y la posición es la suma de los saltos', () => {
    const r = new EstadoRecta({ desde: 370, saltos: [1, 10, 100], maximo: 999 });
    assert.equal(r.posicion, 370);
    assert.equal(r.saltar(100, 1), true);
    assert.equal(r.saltar(10, 1), true);
    assert.equal(r.saltar(1, -1), true);
    assert.equal(r.posicion, 370 + 100 + 10 - 1);
    assert.deepEqual(r.historial.map((s) => s.paso), [100, 10, -1]);
    assert.deepEqual(r.historial.map((s) => [s.de, s.a]), [[370, 470], [470, 480], [480, 479]]);
});

test('recta: un salto que se saldría de [0, maximo] se rechaza y no cambia nada', () => {
    const r = new EstadoRecta({ desde: 5, saltos: [1, 10], maximo: 12 });
    assert.equal(r.saltar(10, -1), false, 'bajaría de 0');
    assert.equal(r.saltar(10, 1), false, 'pasaría del máximo');
    assert.equal(r.posicion, 5);
    assert.equal(r.historial.length, 0);
});

test('recta: tamaños y direcciones que no existen se rechazan', () => {
    const r = new EstadoRecta({ desde: 50, saltos: [1, 10], maximo: 99 });
    assert.equal(r.saltar(100, 1), false, 'no es un salto permitido');
    assert.equal(r.saltar(10, 2), false);
    assert.equal(r.saltar(10, 0), false);
    assert.equal(r.posicion, 50);
});

test('recta: deshacer vuelve un paso atrás y reiniciar vuelve al inicio', () => {
    const r = new EstadoRecta({ desde: 10, saltos: [1, 10], maximo: 99 });
    assert.equal(r.deshacer(), false, 'nada que deshacer');
    r.saltar(10, 1); r.saltar(1, 1);
    assert.equal(r.deshacer(), true);
    assert.equal(r.posicion, 20);
    r.reiniciar();
    assert.equal(r.posicion, 10);
    assert.equal(r.historial.length, 0);
});

test('recta: hay un límite de saltos (no se puede inundar de saltos)', () => {
    const r = new EstadoRecta({ desde: 0, saltos: [1], maximo: 1000, limiteSaltos: 5 });
    for (let i = 0; i < 5; i++) assert.equal(r.saltar(1, 1), true);
    assert.equal(r.saltar(1, 1), false);
    assert.equal(r.posicion, 5);
});

test('recta: la posición siempre es la suma de saltos aceptados, con saltos al azar', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
        let estado = semilla * 7919;
        const az = () => { estado = (estado * 1103515245 + 12345) % 2147483648; return estado / 2147483648; };
        const r = new EstadoRecta({ desde: 500, saltos: [1, 10, 100], maximo: 999 });
        let esperado = 500;
        for (let i = 0; i < 60; i++) {
            const tam = [1, 10, 100][Math.floor(az() * 3)];
            const dir = az() < 0.5 ? 1 : -1;
            const aceptado = r.saltar(tam, dir);
            if (aceptado) esperado += tam * dir;
            assert.equal(r.posicion, esperado);
            assert.ok(r.posicion >= 0 && r.posicion <= 999);
        }
    }
});

test('recta: parámetros inválidos se rechazan', () => {
    assert.throws(() => new EstadoRecta({ desde: -1, saltos: [1], maximo: 9 }));
    assert.throws(() => new EstadoRecta({ desde: 0, saltos: [], maximo: 9 }));
    assert.throws(() => new EstadoRecta({ desde: 0, saltos: [0], maximo: 9 }));
    assert.throws(() => new EstadoRecta({ desde: 10, saltos: [1], maximo: 9 }));
});

// ---------- Andamiaje ----------

test('apoyo: empieza completo solo en el nivel 1 y baja un escalón por acierto', () => {
    assert.equal(apoyoInicial(1), 'completo');
    assert.equal(apoyoInicial(2), 'ligero');
    assert.equal(apoyoInicial(3), 'ligero');
    assert.equal(siguienteApoyo('completo', { acerto: true }), 'ligero');
    assert.equal(siguienteApoyo('ligero', { acerto: true }), 'ninguno');
    assert.equal(siguienteApoyo('ninguno', { acerto: true }), 'ninguno', 'no baja de «ninguno»');
});

test('apoyo: un error sube un escalón y no pasa de «completo»', () => {
    assert.equal(siguienteApoyo('ninguno', { acerto: false }), 'ligero');
    assert.equal(siguienteApoyo('ligero', { acerto: false }), 'completo');
    assert.equal(siguienteApoyo('completo', { acerto: false }), 'completo');
    assert.throws(() => siguienteApoyo('mucho', { acerto: true }), /desconocido/);
    assert.deepEqual(APOYOS, ['completo', 'ligero', 'ninguno']);
});
