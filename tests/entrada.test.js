import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aCoordenadasLogicas, EntradaPuntero, EntradaTeclado } from '../src/core/entrada.js';

const disparar = (objetivo, tipo, props = {}) => objetivo.dispatchEvent(Object.assign(new Event(tipo), props));

test('aCoordenadasLogicas: sin escala ni desplazamiento es la identidad', () => {
    const rect = { left: 0, top: 0, width: 900, height: 600 };
    assert.deepEqual(aCoordenadasLogicas(450, 300, rect, 900, 600), { x: 450, y: 300 });
});

test('aCoordenadasLogicas: compensa el desplazamiento del canvas en la página', () => {
    const rect = { left: 100, top: 50, width: 900, height: 600 };
    assert.deepEqual(aCoordenadasLogicas(100, 50, rect, 900, 600), { x: 0, y: 0 });
});

test('aCoordenadasLogicas: compensa el escalado CSS (canvas mostrado más chico)', () => {
    const rect = { left: 0, top: 0, width: 450, height: 300 }; // mitad del tamaño lógico
    assert.deepEqual(aCoordenadasLogicas(225, 150, rect, 900, 600), { x: 450, y: 300 });
});

test('aCoordenadasLogicas: un elemento sin tamaño no produce NaN ni Infinity', () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    assert.deepEqual(aCoordenadasLogicas(10, 10, rect, 900, 600), { x: 0, y: 0 });
});

function crearElementoFalso() {
    const el = new EventTarget();
    el.style = {};
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 450, height: 300 });
    el.capturados = [];
    el.setPointerCapture = (id) => el.capturados.push(id);
    return el;
}

test('EntradaPuntero: presionar, mover y soltar reportan coordenadas lógicas', () => {
    const el = crearElementoFalso();
    const log = [];
    const entrada = new EntradaPuntero(el, {
        anchoLogico: 900, altoLogico: 600,
        alPresionar: (p) => log.push(['down', p.x, p.y, p.tipo]),
        alMover: (p) => log.push(['move', p.x, p.y, p.presionado]),
        alSoltar: (p) => log.push(['up', p.x, p.y])
    });
    entrada.activar();
    disparar(el, 'pointerdown', { clientX: 100, clientY: 50, pointerId: 7, pointerType: 'touch' });
    disparar(el, 'pointermove', { clientX: 150, clientY: 60, pointerType: 'touch' });
    disparar(el, 'pointerup', { clientX: 150, clientY: 60, pointerType: 'touch' });
    assert.deepEqual(log, [
        ['down', 200, 100, 'touch'],
        ['move', 300, 120, true],
        ['up', 300, 120]
    ]);
    assert.deepEqual(el.capturados, [7]);
    assert.equal(el.style.touchAction, 'none');
});

test('EntradaPuntero: mover sin presionar indica presionado=false (hover del mouse)', () => {
    const el = crearElementoFalso();
    let ultimo;
    new EntradaPuntero(el, { anchoLogico: 900, altoLogico: 600, alMover: (p) => { ultimo = p; } }).activar();
    disparar(el, 'pointermove', { clientX: 10, clientY: 10 });
    assert.equal(ultimo.presionado, false);
});

test('EntradaPuntero: soltar sin haber presionado no dispara alSoltar', () => {
    const el = crearElementoFalso();
    let n = 0;
    new EntradaPuntero(el, { anchoLogico: 900, altoLogico: 600, alSoltar: () => n++ }).activar();
    disparar(el, 'pointerup', { clientX: 1, clientY: 1 });
    assert.equal(n, 0);
});

test('EntradaPuntero: pointercancel libera el estado presionado', () => {
    const el = crearElementoFalso();
    const entrada = new EntradaPuntero(el, { anchoLogico: 900, altoLogico: 600 });
    entrada.activar();
    disparar(el, 'pointerdown', { clientX: 1, clientY: 1, pointerId: 1 });
    assert.equal(entrada.presionado, true);
    disparar(el, 'pointercancel', { clientX: 1, clientY: 1 });
    assert.equal(entrada.presionado, false);
});

test('EntradaPuntero: desactivar quita los oyentes (sin fugas)', () => {
    const el = crearElementoFalso();
    let n = 0;
    const entrada = new EntradaPuntero(el, { anchoLogico: 900, altoLogico: 600, alPresionar: () => n++ });
    entrada.activar();
    entrada.desactivar();
    disparar(el, 'pointerdown', { clientX: 1, clientY: 1, pointerId: 1 });
    assert.equal(n, 0);
});

test('EntradaTeclado: varias teclas pueden activar la misma acción', () => {
    const doc = new EventTarget();
    const ventana = new EventTarget();
    const t = new EntradaTeclado({ izquierda: ['ArrowLeft', 'a', 'A'], derecha: ['ArrowRight', 'd', 'D'] }, doc, ventana);
    t.activar();
    assert.equal(t.estaActiva('izquierda'), false);
    disparar(doc, 'keydown', { key: 'a' });
    assert.equal(t.estaActiva('izquierda'), true);
    assert.equal(t.estaActiva('derecha'), false);
    disparar(doc, 'keyup', { key: 'a' });
    assert.equal(t.estaActiva('izquierda'), false);
});

test('EntradaTeclado: perder el foco de la ventana suelta todas las teclas', () => {
    const doc = new EventTarget();
    const ventana = new EventTarget();
    const t = new EntradaTeclado({ derecha: ['ArrowRight'] }, doc, ventana);
    t.activar();
    disparar(doc, 'keydown', { key: 'ArrowRight' });
    assert.equal(t.estaActiva('derecha'), true);
    disparar(ventana, 'blur');
    assert.equal(t.estaActiva('derecha'), false);
});

test('EntradaTeclado: una acción desconocida no está activa (y no lanza)', () => {
    const t = new EntradaTeclado({}, new EventTarget(), new EventTarget());
    assert.equal(t.estaActiva('volar'), false);
});

test('EntradaTeclado: desactivar quita los oyentes', () => {
    const doc = new EventTarget();
    const t = new EntradaTeclado({ a: ['x'] }, doc, new EventTarget());
    t.activar();
    t.desactivar();
    disparar(doc, 'keydown', { key: 'x' });
    assert.equal(t.estaActiva('a'), false);
});
