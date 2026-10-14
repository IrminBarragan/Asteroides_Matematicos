import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    componerPista, eventosEnVentana, midiAFrecuencia, esPentatonica, segundosPorPaso, duracionDelCiclo, Musica,
    PISTAS, PASOS_POR_COMPAS, PENTATONICA, FANFARRIA
} from '../src/core/musica.js';

// ---------- Teoría ----------

test('midiAFrecuencia: la 69 es 440 Hz, una octava arriba duplica y la 60 es el do central', () => {
    assert.equal(midiAFrecuencia(69), 440);
    assert.equal(midiAFrecuencia(81), 880);
    assert.equal(midiAFrecuencia(57), 220);
    assert.ok(Math.abs(midiAFrecuencia(60) - 261.6256) < 0.001);
});

test('esPentatonica reconoce do, re, mi, sol y la en cualquier octava, y rechaza fa y si', () => {
    for (const octava of [-12, 0, 12, 24]) for (const g of PENTATONICA) assert.equal(esPentatonica(60 + octava + g), true);
    for (const octava of [-12, 0, 12]) for (const g of [1, 3, 5, 6, 8, 10, 11]) assert.equal(esPentatonica(60 + octava + g), false, `grado ${g}`);
});

test('segundosPorPaso y duración del ciclo: a 120 pulsos por minuto una corchea dura 0.25 s', () => {
    assert.equal(segundosPorPaso(120), 0.25);
    assert.equal(duracionDelCiclo({ tempo: 120, compases: 8 }), 8 * PASOS_POR_COMPAS * 0.25);
});

// ---------- Composición ----------

test('componerPista es determinista: misma semilla, misma música; otra semilla, otra música', () => {
    const a = componerPista({ semilla: 5, tempo: 100 });
    assert.deepEqual(a, componerPista({ semilla: 5, tempo: 100 }));
    assert.notDeepEqual(a.notas, componerPista({ semilla: 6, tempo: 100 }).notas);
});

for (const [nombre, config] of Object.entries(PISTAS)) {
    test(`pista «${nombre}»: la melodía solo usa notas de la escala pentatónica (nunca suena «mal»)`, () => {
        for (let semilla = 1; semilla <= 60; semilla++) {
            const pista = componerPista({ ...config, semilla });
            for (const n of pista.notas.filter((x) => x.voz === 'melodia')) assert.ok(esPentatonica(n.midi), `semilla ${semilla}: nota ${n.midi}`);
        }
    });

    test(`pista «${nombre}»: cada compás de la melodía suma exactamente 8 corcheas, sin huecos ni traslapes`, () => {
        for (let semilla = 1; semilla <= 60; semilla++) {
            const pista = componerPista({ ...config, semilla });
            for (let c = 0; c < pista.compases; c++) {
                const delCompas = pista.notas.filter((n) => n.voz === 'melodia' && n.paso >= c * PASOS_POR_COMPAS && n.paso < (c + 1) * PASOS_POR_COMPAS)
                    .sort((a, b) => a.paso - b.paso);
                let cursor = c * PASOS_POR_COMPAS;
                for (const n of delCompas) { assert.equal(n.paso, cursor, `semilla ${semilla}, compás ${c}`); cursor += n.duracion; }
                assert.equal(cursor, (c + 1) * PASOS_POR_COMPAS);
            }
        }
    });

    test(`pista «${nombre}»: la melodía no da saltos enormes y termina en el do (cierre)`, () => {
        for (let semilla = 1; semilla <= 60; semilla++) {
            const m = componerPista({ ...config, semilla }).notas.filter((n) => n.voz === 'melodia');
            for (let i = 1; i < m.length; i++) assert.ok(Math.abs(m[i].midi - m[i - 1].midi) <= 12, `salto de ${Math.abs(m[i].midi - m[i - 1].midi)}`);
            assert.equal(m.at(-1).midi % 12, 0, 'termina en do');
        }
    });
}

test('el bajo sigue la progresión de acordes (do, la, fa, sol) y el estilo animado agrega arpegio', () => {
    const calmo = componerPista({ semilla: 1, tempo: 90, estilo: 'calmo' });
    const animado = componerPista({ semilla: 1, tempo: 90, estilo: 'animado' });
    const raices = calmo.notas.filter((n) => n.voz === 'bajo' && n.paso % PASOS_POR_COMPAS === 0).map((n) => n.midi % 12);
    assert.deepEqual(raices.slice(0, 4), [0, 9, 5, 7], 'do, la, fa, sol');
    assert.equal(calmo.notas.some((n) => n.voz === 'arpegio'), false);
    assert.ok(animado.notas.filter((n) => n.voz === 'arpegio').length > 0);
});

// ---------- Programación ----------

test('eventosEnVentana: ventanas consecutivas no repiten ni pierden notas, también al dar la vuelta (bucle)', () => {
    const pista = componerPista({ ...PISTAS.juego });
    const ciclo = duracionDelCiclo(pista);
    const total = pista.notas.length;
    // recorrer 2.5 ciclos en ventanas irregulares
    const cortes = [0];
    let t = 0;
    let k = 0;
    while (t < ciclo * 2.5) { t += [0.07, 0.31, 0.5, 0.13][k++ % 4]; cortes.push(t); }
    const contados = [];
    for (let i = 1; i < cortes.length; i++) contados.push(...eventosEnVentana(pista, cortes[i - 1], cortes[i]));
    const hasta = cortes.at(-1);
    const esperado = eventosEnVentana(pista, 0, hasta);
    assert.equal(contados.length, esperado.length);
    assert.deepEqual(contados.map((e) => e.t).sort((a, b) => a - b), esperado.map((e) => e.t).sort((a, b) => a - b));
    assert.equal(eventosEnVentana(pista, 0, ciclo).length, total, 'un ciclo trae todas las notas, una vez');
    assert.equal(eventosEnVentana(pista, ciclo, ciclo * 2).length, total, 'y el siguiente, igual');
});

test('eventosEnVentana: los tiempos van en orden, dentro de la ventana, y respetan el tempo', () => {
    const pista = componerPista({ semilla: 3, tempo: 120 });
    const ev = eventosEnVentana(pista, 1, 3);
    assert.ok(ev.length > 0);
    assert.ok(ev.every((e) => e.t >= 1 && e.t < 3));
    assert.deepEqual(ev.map((e) => e.t), [...ev.map((e) => e.t)].sort((a, b) => a - b));
    assert.ok(ev.every((e) => Math.abs(e.t / 0.25 - Math.round(e.t / 0.25)) < 1e-9), 'todo cae en una corchea (0.25 s a 120)');
    assert.deepEqual(eventosEnVentana(pista, 5, 5), []);
});

// ---------- Reproductor (con un AudioContext falso) ----------

function crearContextoFalso() {
    const ctx = {
        currentTime: 0, destination: { tipo: 'destino' }, osciladores: [], ganancias: [],
        createOscillator() {
            const o = { type: '', frequency: { value: 0 }, inicio: null, fin: null, conectado: null,
                connect(x) { o.conectado = x; return x; }, start(t) { o.inicio = t; }, stop(t) { o.fin = t; } };
            ctx.osciladores.push(o); return o;
        },
        createGain() {
            const g = { gain: { valor: 1, objetivo: [], setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { g.gain.objetivo.push(v); } },
                connect(x) { g.conectado = x; return x; }, disconnect() { g.suelto = true; } };
            ctx.ganancias.push(g); return g;
        }
    };
    return ctx;
}
function crearReproductor() {
    const ctx = crearContextoFalso();
    let tareas = [];
    const reloj = { programar: (f) => { tareas.push(f); return tareas.length; }, cancelar: () => { tareas = []; } };
    const m = new Musica({ contextoAudio: ctx }, reloj);
    return { m, ctx, correr: () => tareas.forEach((f) => f()), hayTareas: () => tareas.length > 0 };
}

test('Musica: sin audio disponible o sin activar, no hace nada ni falla', () => {
    const sinAudio = new Musica({ contextoAudio: null });
    sinAudio.establecerActiva(true);
    assert.doesNotThrow(() => { sinAudio.reproducir('menu'); sinAudio.pausar(); sinAudio.detener(); sinAudio.atenuar(); sinAudio.fanfarria(); });
    assert.equal(sinAudio.disponible, false);
    const { m, ctx } = crearReproductor();
    m.reproducir('menu'); // aún no está activa
    assert.equal(ctx.osciladores.length, 0);
    assert.equal(m.sonando, false);
});

test('Musica: al activarla y reproducir programa notas con las formas de onda y frecuencias correctas', () => {
    const { m, ctx } = crearReproductor();
    m.establecerActiva(true);
    m.establecerVolumen(0.4);
    m.reproducir('juego');
    assert.equal(m.sonando, true);
    assert.ok(ctx.osciladores.length > 0, 'programó las primeras notas');
    assert.ok(ctx.osciladores.every((o) => ['triangle', 'sine'].includes(o.type)));
    assert.ok(ctx.osciladores.every((o) => o.frequency.value > 40 && o.frequency.value < 2000));
    assert.ok(ctx.osciladores.every((o) => o.fin > o.inicio), 'todas las notas terminan después de empezar');
    assert.ok(ctx.osciladores.every((o) => o.inicio >= 0), 'nada empieza en el pasado');
});

test('Musica: el reloj de programación va añadiendo notas conforme avanza el tiempo, sin repetir', () => {
    const { m, ctx, correr } = crearReproductor();
    m.establecerActiva(true);
    m.reproducir('menu');
    const antes = ctx.osciladores.length;
    ctx.currentTime = 2; correr();
    const despues = ctx.osciladores.length;
    assert.ok(despues > antes);
    const tiempos = ctx.osciladores.map((o) => `${o.inicio.toFixed(4)}|${o.frequency.value.toFixed(2)}`);
    // una misma nota (mismo instante y frecuencia) nunca se programa dos veces
    assert.equal(new Set(tiempos).size, tiempos.length);
    ctx.currentTime = 2; correr();
    assert.equal(ctx.osciladores.length, despues, 'si no avanzó el tiempo, no programa nada nuevo');
});

test('Musica: pedir la misma pista de nuevo no la reinicia; pedir otra la cambia', () => {
    const { m, ctx } = crearReproductor();
    m.establecerActiva(true);
    m.reproducir('menu');
    const n = ctx.osciladores.length;
    m.reproducir('menu');
    assert.equal(ctx.osciladores.length, n);
    m.reproducir('juego');
    assert.equal(m.nombre, 'juego');
    assert.ok(ctx.osciladores.length > n);
    m.reproducir('inventada');
    assert.equal(m.nombre, 'juego', 'una pista desconocida se ignora');
});

test('Musica: pausar silencia y deja de programar; reanudar sigue desde el presente (sin ráfaga de notas atrasadas)', () => {
    const { m, ctx, correr } = crearReproductor();
    m.establecerActiva(true);
    m.reproducir('juego');
    ctx.currentTime = 1; correr();
    m.pausar();
    const n = ctx.osciladores.length;
    ctx.currentTime = 30; correr();
    assert.equal(ctx.osciladores.length, n, 'en pausa no programa');
    m.reanudar();
    ctx.currentTime = 30.1; correr();
    const nuevas = ctx.osciladores.slice(n);
    assert.ok(nuevas.length > 0 && nuevas.length < 40, `${nuevas.length} notas nuevas: no debe soltar 30 s atrasados`);
    assert.ok(nuevas.every((o) => o.inicio >= 29), 'solo notas del presente');
});

test('Musica: detener cancela el reloj y desconecta; apagar la música (establecerActiva(false)) la detiene', () => {
    const { m, hayTareas } = crearReproductor();
    m.establecerActiva(true);
    m.reproducir('menu');
    assert.ok(hayTareas());
    m.establecerActiva(false);
    assert.equal(m.sonando, false);
    assert.equal(hayTareas(), false);
    assert.equal(m.nombre, null);
});

test('Musica: el volumen se acota a 0..1 y se aplica al control maestro; atenuar lo baja', () => {
    const { m, ctx } = crearReproductor();
    m.establecerActiva(true);
    m.reproducir('menu');
    m.establecerVolumen(5);
    assert.equal(m.volumen, 1);
    m.establecerVolumen(-3);
    assert.equal(m.volumen, 0);
    m.establecerVolumen('texto');
    assert.equal(m.volumen, 0);
    m.establecerVolumen(0.4);
    const maestro = ctx.ganancias[0];
    assert.equal(maestro.gain.objetivo.at(-1), 0.4);
    m.atenuar(2000);
    const objetivos = maestro.gain.objetivo;
    assert.ok(Math.abs(objetivos.at(-2) - 0.4 * 0.3) < 1e-9, 'baja al 30 %');
    assert.equal(objetivos.at(-1), 0.4, 'y programa volver al volumen normal');
});

test('Musica.fanfarria toca las notas de la fanfarria con su duración', () => {
    const { m, ctx } = crearReproductor();
    m.establecerActiva(true);
    m.fanfarria();
    assert.equal(ctx.osciladores.length, FANFARRIA.notas.length);
    assert.deepEqual(ctx.osciladores.map((o) => Math.round(o.frequency.value)), FANFARRIA.notas.map(([midi]) => Math.round(midiAFrecuencia(midi))));
    for (let i = 1; i < ctx.osciladores.length; i++) assert.ok(ctx.osciladores[i].inicio >= ctx.osciladores[i - 1].inicio, 'en orden');
    const apagada = crearReproductor();
    apagada.m.fanfarria();
    assert.equal(apagada.ctx.osciladores.length, 0, 'sin activar no suena');
});
