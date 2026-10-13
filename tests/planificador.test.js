import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Planificador } from '../src/core/planificador.js';

test('una tarea se ejecuta cuando vence, no antes', () => {
    const p = new Planificador();
    let n = 0;
    p.programar(100, () => n++);
    p.avanzar(99);
    assert.equal(n, 0);
    p.avanzar(1);
    assert.equal(n, 1);
    p.avanzar(1000);
    assert.equal(n, 1, 'solo una vez');
});

test('sin avanzar el reloj (juego en pausa) nada se ejecuta', () => {
    const p = new Planificador();
    let n = 0;
    p.programar(10, () => n++);
    assert.equal(p.pendientes, 1);
    assert.equal(n, 0);
});

test('las tareas vencidas corren en orden cronológico, aunque se hayan programado al revés', () => {
    const p = new Planificador();
    const orden = [];
    p.programar(300, () => orden.push('c'));
    p.programar(100, () => orden.push('a'));
    p.programar(200, () => orden.push('b'));
    p.avanzar(1000);
    assert.deepEqual(orden, ['a', 'b', 'c']);
});

test('cancelar impide que corra y devuelve si existía', () => {
    const p = new Planificador();
    let n = 0;
    const id = p.programar(50, () => n++);
    assert.equal(p.cancelar(id), true);
    assert.equal(p.cancelar(id), false);
    p.avanzar(100);
    assert.equal(n, 0);
});

test('una tarea puede programar otra; corre si también vence dentro del mismo avance', () => {
    const p = new Planificador();
    const orden = [];
    p.programar(10, () => { orden.push('uno'); p.programar(10, () => orden.push('dos')); });
    p.avanzar(15);
    assert.deepEqual(orden, ['uno']);
    p.avanzar(5);
    assert.deepEqual(orden, ['uno', 'dos']);
    p.programar(1, () => { orden.push('tres'); p.programar(1, () => orden.push('cuatro')); });
    p.avanzar(10);
    assert.deepEqual(orden, ['uno', 'dos', 'tres', 'cuatro']);
});

test('limpiar descarta todo lo pendiente', () => {
    const p = new Planificador();
    let n = 0;
    p.programar(1, () => n++);
    p.limpiar();
    p.avanzar(100);
    assert.equal(n, 0);
    assert.equal(p.pendientes, 0);
});

test('el resultado no depende del tamaño del avance (un paso grande = muchos pequeños)', () => {
    const correr = (pasos) => {
        const p = new Planificador();
        const registro = [];
        p.programar(100, () => { registro.push(['a', p.tiempo]); p.programar(50, () => registro.push(['b', p.tiempo])); });
        for (const paso of pasos) p.avanzar(paso);
        return registro;
    };
    assert.deepEqual(correr([1000]), correr(Array(1000).fill(1)));
    assert.deepEqual(correr([1000]), [['a', 100], ['b', 150]]);
});
