import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SistemaIA } from '../src/adaptativo/sistemaia.js';
import { CONFIG } from '../src/games/asteroides/configuracion.js';

function registrar(ia, patron, operacion = 'suma', tiempo = 3000) {
    for (const ok of patron) ia.registrarRespuesta(ok, operacion, tiempo);
}

test('solo conserva las últimas 20 respuestas', () => {
    const ia = new SistemaIA();
    registrar(ia, Array(30).fill(true));
    assert.equal(ia.historialRespuestas.length, 20);
});

test('la racha crece con aciertos y se rompe con un fallo', () => {
    const ia = new SistemaIA();
    registrar(ia, [true, true, true]);
    assert.equal(ia.metricas.racha, 3);
    registrar(ia, [false]);
    assert.equal(ia.metricas.racha, 0);
    assert.equal(ia.metricas.rachaMaxima, 3);
});

test('mucha precisión => avanzado, y pide subir dificultad', () => {
    const ia = new SistemaIA();
    registrar(ia, Array(CONFIG.IA.INTERVALO_EVALUACION).fill(true));
    assert.equal(ia.perfilJugador.nivelHabilidad, 'avanzado');
    const ajustes = ia.obtenerAjustesDificultad();
    assert.equal(ajustes.aplicarCambio, true);
    assert.equal(ajustes.velocidad, CONFIG.IA.AJUSTE_VELOCIDAD_DIFICIL);
});

test('poca precisión => principiante, necesita ayuda y baja dificultad', () => {
    const ia = new SistemaIA();
    registrar(ia, Array(CONFIG.IA.INTERVALO_EVALUACION).fill(false));
    assert.equal(ia.perfilJugador.nivelHabilidad, 'principiante');
    assert.equal(ia.perfilJugador.necesitaAyuda, true);
    const ajustes = ia.obtenerAjustesDificultad();
    assert.equal(ajustes.velocidad, CONFIG.IA.AJUSTE_VELOCIDAD_FACIL);
    assert.ok(ajustes.cantidadAsteroides < 0);
});

test('detecta la operación con más errores al superar el umbral', () => {
    const ia = new SistemaIA();
    registrar(ia, [false, false, false], 'resta');
    registrar(ia, [true, true], 'suma');
    assert.equal(ia.metricas.operacionMasDificil, 'resta');
});

test('obtenerRecomendacionActual no reordena la lista interna', () => {
    const ia = new SistemaIA();
    ia.recomendaciones = [
        { mensaje: 'baja', prioridad: 'baja' },
        { mensaje: 'alta', prioridad: 'alta' }
    ];
    assert.equal(ia.obtenerRecomendacionActual().mensaje, 'alta');
    assert.equal(ia.recomendaciones[0].mensaje, 'baja');
});

test('reiniciar limpia TODO el estado, no solo el historial', () => {
    const ia = new SistemaIA();
    registrar(ia, Array(10).fill(true));
    registrar(ia, [false, false, false], 'division');
    ia.reiniciar();
    assert.equal(ia.historialRespuestas.length, 0);
    assert.equal(ia.metricas.rachaMaxima, 0);
    assert.equal(ia.metricas.operacionMasDificil, null);
    assert.equal(ia.metricas.precisionActual, 1.0);
    assert.equal(ia.perfilJugador.nivelHabilidad, 'principiante');
    assert.equal(ia.patronesError.division, 0);
});
