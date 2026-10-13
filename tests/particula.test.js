import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SistemaParticulas, Particula } from '../src/core/particula.js';

test('crear una explosión no falla y genera la cantidad pedida (regresión: faltaba un import)', () => {
    const s = new SistemaParticulas();
    s.crearExplosion(10, 20, 15, '#ff0000');
    assert.equal(s.particulas.length, 15);
    assert.ok(s.particulas.every((p) => p instanceof Particula && p.color === '#ff0000'));
});

test('las partículas se desvanecen y desaparecen con el tiempo', () => {
    const s = new SistemaParticulas();
    s.crearExplosion(0, 0, 20);
    for (let i = 0; i < 100; i++) s.actualizar();
    assert.equal(s.particulas.length, 0);
});

test('dibujar usa el contexto sin errores y limpiar vacía el sistema', () => {
    const llamadas = [];
    const ctx = new Proxy({}, { get: (_, nombre) => (...args) => llamadas.push(nombre), set: () => true });
    const s = new SistemaParticulas();
    s.crearExplosion(5, 5, 3);
    s.dibujar(ctx);
    assert.ok(llamadas.includes('arc'));
    s.limpiar();
    assert.equal(s.particulas.length, 0);
});
