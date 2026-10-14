import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animacionesPermitidas, pareceEquipoLento } from '../src/ui/movimiento.js';
import { generarConfeti, COLORES_CONFETI, DURACION_MAX_MS } from '../src/ui/confeti.js';
import { generarFormas } from '../src/ui/fondo.js';
import { frasePara, REACCIONES, ESTADOS } from '../src/ui/mascota.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

test('animaciones: se permiten por omisión; no en modo ligero ni si el sistema pide reducir movimiento', () => {
    const sin = () => ({ matches: false });
    const reducir = () => ({ matches: true });
    assert.equal(animacionesPermitidas({ matchMedia: sin }), true);
    assert.equal(animacionesPermitidas({ ligero: true, matchMedia: sin }), false);
    assert.equal(animacionesPermitidas({ matchMedia: reducir }), false);
    assert.equal(animacionesPermitidas({ matchMedia: undefined }), true, 'sin matchMedia se asume que sí');
    assert.equal(animacionesPermitidas({ matchMedia: () => { throw new Error('x'); } }), true, 'un matchMedia que falla no rompe');
});

test('animaciones: pregunta por la media query correcta', () => {
    let pedida = null;
    animacionesPermitidas({ matchMedia: (q) => { pedida = q; return { matches: false }; } });
    assert.equal(pedida, '(prefers-reduced-motion: reduce)');
});

test('pareceEquipoLento: pocos núcleos o poca memoria; sin datos, no se asume', () => {
    assert.equal(pareceEquipoLento({ hardwareConcurrency: 2 }), true);
    assert.equal(pareceEquipoLento({ hardwareConcurrency: 8, deviceMemory: 2 }), true);
    assert.equal(pareceEquipoLento({ hardwareConcurrency: 4, deviceMemory: 8 }), false);
    assert.equal(pareceEquipoLento({}), false);
    assert.equal(pareceEquipoLento(null), false);
    assert.equal(pareceEquipoLento({ hardwareConcurrency: 'x' }), false);
});

test('confeti: la cantidad pedida, valores en rango, colores de la paleta y reproducible', () => {
    const piezas = generarConfeti(60, crearAleatorioSembrado(1));
    assert.equal(piezas.length, 60);
    for (const p of piezas) {
        assert.ok(p.x >= 0 && p.x <= 100);
        assert.ok(Math.abs(p.dx) <= 80);
        assert.ok(p.giro >= 360 && p.giro <= 1080);
        assert.ok(COLORES_CONFETI.includes(p.color));
        assert.ok(p.retardo >= 0 && p.retardo <= 0.4);
        assert.ok(p.duracion >= 1.6 && p.duracion <= 2.4);
        assert.ok(Math.round((p.retardo + p.duracion) * 1000) <= DURACION_MAX_MS, 'termina antes de que se limpie la capa');
        assert.ok(p.ancho >= 6 && p.alto > 0);
    }
    assert.deepEqual(piezas, generarConfeti(60, crearAleatorioSembrado(1)));
    assert.equal(generarConfeti(0).length, 0);
});

test('confeti: usa varios colores', () => {
    assert.ok(new Set(generarConfeti(80, crearAleatorioSembrado(2)).map((p) => p.color)).size >= 4);
});

test('fondo: formas repartidas por todo el ancho, con tamaños y tiempos razonables', () => {
    const formas = generarFormas(12, crearAleatorioSembrado(3));
    assert.equal(formas.length, 12);
    for (const f of formas) {
        assert.ok(f.x >= 0 && f.x <= 100);
        assert.ok(f.tamano >= 22 && f.tamano <= 68);
        assert.ok(f.duracion >= 16 && f.duracion <= 33, 'lentas: no distraen');
        assert.ok(f.retardo <= 0, 'empiezan a medio camino');
        assert.ok(['circulo', 'rombo', 'estrella'].includes(f.forma));
    }
    const xs = formas.map((f) => f.x);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 70, 'cubren buena parte del ancho');
    assert.ok(xs.every((x, i) => i === 0 || x >= xs[i - 1] - 8), 'van de izquierda a derecha');
});

test('mascota: cada reacción apunta a un estado que existe y las frases no son infantiles ni vacías', () => {
    for (const [tipo, r] of Object.entries(REACCIONES)) {
        assert.ok(ESTADOS.includes(r.estado), tipo);
        assert.ok(r.ms > 0);
        if (r.habla) assert.ok(frasePara(tipo, crearAleatorioSembrado(1)).length > 3, tipo);
    }
    for (const tipo of ['acierto', 'error', 'nivel', 'ayuda', 'mision']) {
        const az = crearAleatorioSembrado(4);
        const vistas = new Set(Array.from({ length: 80 }, () => frasePara(tipo, az)));
        assert.ok(vistas.size >= 1 && [...vistas].every((f) => f.length > 3 && !/pequeñ|bebé|chiquit/i.test(f)), tipo);
    }
    assert.equal(frasePara('inventado'), '');
    assert.ok(new Set(Array.from({ length: 80 }, ((az) => () => frasePara('error', az))(crearAleatorioSembrado(9)))).size >= 3, 'hay variedad');
});

test('mascota: habla cuando hace falta ánimo (error) o hay motivo (nivel), pero no con cada acierto (sería ruido)', () => {
    assert.equal(REACCIONES.error.habla, true);
    assert.equal(REACCIONES.nivel.habla, true);
    assert.equal(REACCIONES.acierto.habla, false);
    assert.equal(REACCIONES.error.estado, 'animo');
    assert.equal(REACCIONES.acierto.estado, 'celebra');
});

test('mascota: el error nunca regaña ni culpa', () => {
    const az = crearAleatorioSembrado(5);
    for (let i = 0; i < 100; i++) assert.ok(!/mal|error|equivoc|incorrect|fallaste|no puedes/i.test(frasePara('error', az)));
});
