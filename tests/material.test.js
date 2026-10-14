import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EstadoMarcos, EstadoRecta, EstadoBloques } from '../src/core/material.js';
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

// ---------- Bloques de valor posicional ----------

test('bloques: juntar cambia 10 por 1 de la columna siguiente y separar hace lo contrario', () => {
    const b = new EstadoBloques({ columnas: 3, inicial: [12, 3, 0] });
    assert.equal(b.valor(), 12 + 30);
    assert.equal(b.juntar(0), true);
    assert.deepEqual(b.cuenta, [2, 4, 0]);
    assert.equal(b.valor(), 42, 'cambiar no cambia el valor');
    assert.equal(b.separar(1), true);
    assert.deepEqual(b.cuenta, [12, 3, 0]);
});

test('bloques: no se puede juntar con menos de 10, ni salirse de las columnas, ni separar de las unidades', () => {
    const b = new EstadoBloques({ columnas: 2, inicial: [9, 5] });
    assert.equal(b.juntar(0), false);
    const c = new EstadoBloques({ columnas: 2, inicial: [0, 12] });
    assert.equal(c.juntar(1), false, 'no hay columna siguiente');
    assert.equal(c.separar(0), false, 'las unidades no se separan');
    assert.equal(c.juntar(7), false);
    assert.equal(c.separar(-1), false);
    assert.equal(new EstadoBloques({ columnas: 2, inicial: [0, 0] }).separar(1), false, 'no hay bloque que separar');
});

test('bloques: agregar y retirar respetan el máximo y el cero', () => {
    const b = new EstadoBloques({ columnas: 2, maximoPorColumna: 3 });
    for (let i = 0; i < 3; i++) assert.equal(b.agregar(0), true);
    assert.equal(b.agregar(0), false, 'columna llena');
    assert.equal(b.retirar(1), false, 'nada que retirar');
    assert.equal(b.retirar(0), true);
    assert.equal(b.valor(), 2);
});

test('bloques: quitar cuenta lo quitado y separar da bloques para poder quitar', () => {
    // 52 − 38: hay que pedir prestado una decena
    const b = new EstadoBloques({ columnas: 2, inicial: [2, 5] });
    assert.equal(b.quitar(0), true);
    assert.equal(b.quitar(0), true);
    assert.equal(b.quitar(0), false, 'ya no hay unidades: hay que separar una decena');
    assert.equal(b.separar(1), true);
    for (let i = 0; i < 6; i++) assert.equal(b.quitar(0), true);
    for (let i = 0; i < 3; i++) assert.equal(b.quitar(1), true);
    assert.equal(b.quitoExactamente([8, 3]), true);
    assert.equal(b.valorQuitado(), 38);
    assert.equal(b.valor(), 52 - 38);
});

test('bloques: valor + valor quitado se conserva con cualquier secuencia de cambios', () => {
    for (let semilla = 1; semilla <= 60; semilla++) {
        let e = semilla * 7919;
        const az = () => { e = (e * 1103515245 + 12345) % 2147483648; return e / 2147483648; };
        const b = new EstadoBloques({ columnas: 4, inicial: [3, 12, 5, 1] });
        const total = b.valor();
        for (let i = 0; i < 100; i++) {
            const col = Math.floor(az() * 4);
            const accion = az();
            if (accion < 0.35) b.juntar(col); else if (accion < 0.7) b.separar(col); else if (accion < 0.9) b.quitar(col); else b.deshacer();
            assert.equal(b.valor() + b.valorQuitado(), total, `semilla ${semilla}, paso ${i}`);
            assert.ok(b.cuenta.every((n) => n >= 0 && n <= 30));
        }
    }
});

test('bloques: deshacer vuelve al estado anterior y reiniciar al inicial; normalizado y coincideCon', () => {
    const b = new EstadoBloques({ columnas: 2, inicial: [14, 2] });
    assert.equal(b.normalizado, false);
    assert.equal(b.deshacer(), false);
    b.juntar(0);
    assert.equal(b.normalizado, true);
    assert.equal(b.coincideCon([4, 3]), true);
    assert.equal(b.coincideCon([4, 2]), false);
    assert.equal(b.deshacer(), true);
    assert.deepEqual(b.cuenta, [14, 2]);
    b.juntar(0); b.quitar(1);
    b.reiniciar();
    assert.deepEqual(b.cuenta, [14, 2]);
    assert.deepEqual(b.quitadas, [0, 0]);
});

test('bloques: parámetros inválidos se rechazan', () => {
    assert.throws(() => new EstadoBloques({ columnas: 0 }));
    assert.throws(() => new EstadoBloques({ columnas: 7 }));
    assert.throws(() => new EstadoBloques({ columnas: 2, inicial: [1, 2, 3] }));
    assert.throws(() => new EstadoBloques({ columnas: 2, inicial: [-1] }));
});
