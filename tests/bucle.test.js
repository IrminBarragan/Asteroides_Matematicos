import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BucleJuego, PASO_60_FPS } from '../src/core/bucle.js';
import { crearRelojFalso } from './auxiliares/relojFalso.js';

function crear(reloj, extra = {}) {
    const cuenta = { actualizaciones: 0, dibujos: 0 };
    const bucle = new BucleJuego({
        actualizar: () => { cuenta.actualizaciones++; },
        dibujar: () => { cuenta.dibujos++; },
        raf: reloj.raf,
        caf: reloj.caf,
        ...extra
    });
    return { bucle, cuenta };
}

test('la lógica corre ~60 veces por segundo en un monitor de 60 Hz', () => {
    const reloj = crearRelojFalso();
    const { bucle, cuenta } = crear(reloj);
    bucle.iniciar();
    reloj.avanzar(10_000, 60);
    // Tolerancia de ±1 por segundo: el primer cuadro solo fija la referencia de tiempo
    assert.ok(Math.abs(cuenta.actualizaciones - 600) <= 2, `actualizaciones: ${cuenta.actualizaciones}`);
});

test('la velocidad del juego NO depende de la frecuencia del monitor (144 Hz = 60 Hz)', () => {
    const r60 = crearRelojFalso();
    const a = crear(r60);
    a.bucle.iniciar();
    r60.avanzar(10_000, 60);

    const r144 = crearRelojFalso();
    const b = crear(r144);
    b.bucle.iniciar();
    r144.avanzar(10_000, 144);

    assert.ok(Math.abs(a.cuenta.actualizaciones - b.cuenta.actualizaciones) <= 2,
        `60Hz=${a.cuenta.actualizaciones}, 144Hz=${b.cuenta.actualizaciones}`);
    // ...pero en 144 Hz se dibuja más veces (más fluido)
    assert.ok(b.cuenta.dibujos > a.cuenta.dibujos);
});

test('tras un congelamiento largo no hay "avalancha" de actualizaciones', () => {
    const reloj = crearRelojFalso();
    const { bucle, cuenta } = crear(reloj, { maxDelta: 250 });
    bucle.iniciar();
    reloj.avanzar(100, 60);
    const antes = cuenta.actualizaciones;
    reloj.saltar(60_000); // la pestaña estuvo oculta un minuto
    reloj.avanzar(PASO_60_FPS, 60);
    const extra = cuenta.actualizaciones - antes;
    assert.ok(extra <= Math.ceil(250 / PASO_60_FPS) + 1, `pasos extra: ${extra}`);
});

test('detener cancela el cuadro pendiente y deja de actualizar', () => {
    const reloj = crearRelojFalso();
    const { bucle, cuenta } = crear(reloj);
    bucle.iniciar();
    reloj.avanzar(500, 60);
    bucle.detener();
    const congelado = cuenta.actualizaciones;
    assert.equal(reloj.pendientes(), 0);
    reloj.avanzar(500, 60);
    assert.equal(cuenta.actualizaciones, congelado);
});

test('iniciar dos veces no duplica el bucle', () => {
    const reloj = crearRelojFalso();
    const { bucle, cuenta } = crear(reloj);
    bucle.iniciar();
    bucle.iniciar();
    assert.equal(reloj.pendientes(), 1);
    reloj.avanzar(1000, 60);
    assert.ok(cuenta.actualizaciones <= 61);
});

test('al reanudar tras detener no se "recupera" el tiempo parado', () => {
    const reloj = crearRelojFalso();
    const { bucle, cuenta } = crear(reloj);
    bucle.iniciar();
    reloj.avanzar(200, 60);
    bucle.detener();
    reloj.saltar(5000);
    const antes = cuenta.actualizaciones;
    bucle.iniciar();
    reloj.avanzar(100, 60);
    assert.ok(cuenta.actualizaciones - antes <= 7);
});

test('si la lógica detiene el bucle, no se sigue actualizando ni dibujando en ese cuadro', () => {
    const reloj = crearRelojFalso();
    let bucle;
    let n = 0;
    bucle = new BucleJuego({
        actualizar: () => { n++; if (n === 3) bucle.detener(); },
        dibujar: () => {},
        raf: reloj.raf,
        caf: reloj.caf
    });
    bucle.iniciar();
    reloj.avanzar(2000, 60);
    assert.equal(n, 3);
});

test('exige las funciones actualizar y dibujar', () => {
    assert.throws(() => new BucleJuego({}), TypeError);
});

test('en un equipo lento (30 cuadros/s) la lógica sigue a ~60 pasos/s: el juego no va en cámara lenta', () => {
    const reloj = crearRelojFalso();
    const { bucle, cuenta } = crear(reloj);
    bucle.iniciar();
    reloj.avanzar(10_000, 30);
    assert.ok(Math.abs(cuenta.actualizaciones - 600) <= 3, `actualizaciones: ${cuenta.actualizaciones}`);
    assert.ok(cuenta.dibujos <= 305); // pero solo se dibuja ~30 veces por segundo
});
