import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BusEventos } from '../src/core/eventos.js';

test('emit entrega los datos a los oyentes suscritos', () => {
    const bus = new BusEventos();
    const recibidos = [];
    bus.on('x', (d) => recibidos.push(d));
    bus.emit('x', 1);
    bus.emit('x', 2);
    assert.deepEqual(recibidos, [1, 2]);
});

test('on devuelve una función que cancela la suscripción', () => {
    const bus = new BusEventos();
    let n = 0;
    const cancelar = bus.on('x', () => n++);
    bus.emit('x');
    cancelar();
    bus.emit('x');
    assert.equal(n, 1);
    assert.equal(bus.cantidad('x'), 0);
});

test('once se ejecuta una sola vez', () => {
    const bus = new BusEventos();
    let n = 0;
    bus.once('x', () => n++);
    bus.emit('x');
    bus.emit('x');
    assert.equal(n, 1);
});

test('un oyente que lanza error no impide a los demás', () => {
    const bus = new BusEventos();
    const original = console.error;
    console.error = () => {};
    try {
        let llego = false;
        bus.on('x', () => { throw new Error('falla'); });
        bus.on('x', () => { llego = true; });
        bus.emit('x');
        assert.equal(llego, true);
    } finally {
        console.error = original;
    }
});

test('un oyente puede cancelarse a sí mismo durante emit sin saltarse a otros', () => {
    const bus = new BusEventos();
    const orden = [];
    const cancelarA = bus.on('x', () => { orden.push('a'); cancelarA(); });
    bus.on('x', () => orden.push('b'));
    bus.emit('x');
    bus.emit('x');
    assert.deepEqual(orden, ['a', 'b', 'b']);
});

test('on rechaza algo que no es función', () => {
    assert.throws(() => new BusEventos().on('x', 'no soy función'), TypeError);
});

test('limpiar elimina todos los oyentes', () => {
    const bus = new BusEventos();
    bus.on('x', () => {});
    bus.on('y', () => {});
    bus.limpiar();
    assert.equal(bus.cantidad('x') + bus.cantidad('y'), 0);
});
