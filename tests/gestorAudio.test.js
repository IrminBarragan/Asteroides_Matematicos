import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GestorAudio } from '../src/core/gestorAudio.js';

function contextoFalso() {
    const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    return {
        state: 'suspended',
        currentTime: 0,
        destination: {},
        osciladores: 0,
        reanudado: 0,
        resume() { this.reanudado++; },
        createOscillator() { this.osciladores++; return { connect() {}, start() {}, stop() {}, frequency: param() }; },
        createGain() { return { connect() {}, gain: param() }; }
    };
}

test('sin activar o sin contexto no suena ni lanza', () => {
    const a = new GestorAudio();
    a.reproducirEfecto('acierto');
    a.contextoAudio = contextoFalso();
    a.reproducirEfecto('acierto'); // inactivo
    assert.equal(a.contextoAudio.osciladores, 0);
});

test('activo: reproduce efectos conocidos y crea un oscilador por efecto', () => {
    const a = new GestorAudio();
    a.contextoAudio = contextoFalso();
    a.establecerActivo(true);
    for (const tipo of ['explosion', 'acierto', 'fallo', 'laser', 'powerup', 'nivel']) a.reproducirEfecto(tipo);
    assert.equal(a.contextoAudio.osciladores, 6);
});

test('un efecto desconocido no crea nodos de audio (evita fugas)', () => {
    const a = new GestorAudio();
    a.contextoAudio = contextoFalso();
    a.establecerActivo(true);
    a.reproducirEfecto('inventado');
    assert.equal(a.contextoAudio.osciladores, 0);
});

test('reanudar despierta un contexto suspendido y no toca uno activo', () => {
    const a = new GestorAudio();
    a.contextoAudio = contextoFalso();
    a.reanudar();
    assert.equal(a.contextoAudio.reanudado, 1);
    a.contextoAudio.state = 'running';
    a.reanudar();
    assert.equal(a.contextoAudio.reanudado, 1);
});

test('establecerActivo devuelve un booleano y alternar invierte el estado', () => {
    const a = new GestorAudio();
    assert.equal(a.establecerActivo(1), true);
    assert.equal(a.alternar(), false);
});
