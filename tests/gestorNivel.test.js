import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GestorNivel } from '../src/games/asteroides/gestorNivel.js';
import { CONFIG } from '../src/games/asteroides/configuracion.js';

test('estado inicial', () => {
    const g = new GestorNivel();
    assert.equal(g.nivel, 1);
    assert.equal(g.puntos, 0);
    assert.equal(g.vidas, CONFIG.VIDAS.INICIAL);
});

test('sube de nivel al acumular PUNTOS_POR_NIVEL', () => {
    const g = new GestorNivel();
    assert.equal(g.sumarPuntos(CONFIG.NIVELES.PUNTOS_POR_NIVEL - 10), false);
    assert.equal(g.nivel, 1);
    assert.equal(g.sumarPuntos(10), true);
    assert.equal(g.nivel, 2);
});

test('el nivel nunca supera NIVEL_MAX, ni con un salto grande de puntos', () => {
    const g = new GestorNivel();
    g.sumarPuntos(100000);
    assert.equal(g.nivel, CONFIG.NIVELES.NIVEL_MAX);
    g.sumarPuntos(100000);
    assert.equal(g.nivel, CONFIG.NIVELES.NIVEL_MAX);
});

test('dos fallos consecutivos quitan una vida; un acierto reinicia la cuenta', () => {
    const g = new GestorNivel();
    g.registrarFallo();
    assert.equal(g.vidas, CONFIG.VIDAS.INICIAL);
    g.registrarAcierto();
    g.registrarFallo();
    assert.equal(g.vidas, CONFIG.VIDAS.INICIAL);
    g.registrarFallo();
    assert.equal(g.vidas, CONFIG.VIDAS.INICIAL - 1);
});

test('las vidas no bajan de 0 ni suben de la máxima', () => {
    const g = new GestorNivel();
    for (let i = 0; i < 20; i++) g.perderVida();
    assert.equal(g.vidas, 0);
    assert.equal(g.juegoTerminado(), true);
    for (let i = 0; i < 20; i++) g.ganarVida();
    assert.equal(g.vidas, CONFIG.VIDAS.MAXIMA);
});

test('el multiplicador duplica puntos y expira por frames', () => {
    const g = new GestorNivel();
    g.activarMultiplicador(2, 3);
    g.sumarPuntos(10);
    assert.equal(g.puntos, 20);
    for (let i = 0; i < 3; i++) g.actualizarEfectos();
    assert.equal(g.multiplicadorPuntos, 1);
});

test('ralentizar: reduce el factor, expira por frames y no toca la velocidad base', () => {
    const g = new GestorNivel();
    const base = g.velocidadAsteroides;
    assert.equal(g.factorVelocidad(), 1);
    g.ralentizarAsteroides(2);
    assert.equal(g.factorVelocidad(), 0.5);
    g.actualizarEfectos();
    assert.equal(g.factorVelocidad(), 0.5);
    g.actualizarEfectos();
    assert.equal(g.factorVelocidad(), 1);
    assert.equal(g.velocidadAsteroides, base);
});

test('ralentizar no avanza si no se llama a actualizarEfectos (es decir, en pausa)', () => {
    const g = new GestorNivel();
    g.ralentizarAsteroides(5);
    // Pausa: el bucle no corre, no hay llamadas a actualizarEfectos
    assert.equal(g.factorVelocidad(), 0.5);
    assert.equal(g.tiempoRalentizacion, 5);
});

test('la velocidad nunca supera VELOCIDAD_MAX', () => {
    const g = new GestorNivel();
    for (let i = 0; i < 100; i++) g.aumentarVelocidad();
    assert.equal(g.velocidadAsteroides, CONFIG.ASTEROIDE.VELOCIDAD_MAX);
});

test('reiniciar vuelve al estado inicial', () => {
    const g = new GestorNivel();
    g.sumarPuntos(250);
    g.registrarFallo();
    g.ralentizarAsteroides(100);
    g.reiniciar();
    assert.equal(g.nivel, 1);
    assert.equal(g.puntos, 0);
    assert.equal(g.tiempoRalentizacion, 0);
    assert.equal(g.vidas, CONFIG.VIDAS.INICIAL);
});

test('obtenerEstadisticas calcula la precisión', () => {
    const g = new GestorNivel();
    assert.equal(g.obtenerEstadisticas().precision, 0);
    g.registrarAcierto(); g.registrarAcierto(); g.registrarAcierto(); g.registrarFallo();
    assert.equal(g.obtenerEstadisticas().precision, 75);
});
