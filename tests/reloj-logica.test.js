import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarPregunta, habilidadesParaGrado, HABILIDADES_POR_GRADO, minutosPermitidos, pasoMinutero, cantidadOpciones,
    prepararRonda, distractoresHora, configuracionDuracion, NIVEL_MAX
} from '../src/games/reloj/logica/generadores.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from '../src/games/reloj/logica/partida.js';
import {
    codigoHora, formatoDigital, textoEnPalabras, formato24, desdeMinutosDelDia, minutosDelDia
} from '../src/core/tiempo.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { normalizarResultado } from '../src/core/resultado.js';

const TODAS = [...new Set(Object.values(HABILIDADES_POR_GRADO).flat())];

function paraTodas(fn, muestras = 60) {
    for (const [grado, habilidades] of Object.entries(HABILIDADES_POR_GRADO)) {
        for (const habilidad of habilidades) {
            for (let nivel = 1; nivel <= NIVEL_MAX; nivel++) {
                const az = crearAleatorioSembrado(Number(grado) * 1000 + nivel * 100 + habilidad.length);
                for (let i = 0; i < muestras; i++) {
                    for (const cantidad of [3, 4]) fn(generarPregunta({ grado: Number(grado), habilidad, nivel, cantidad, aleatorio: az }), { grado: Number(grado), habilidad, nivel, cantidad });
                }
            }
        }
    }
}

// ---------- Minutos, pasos y dificultad ----------

test('los minutos permitidos crecen con el grado y el nivel; el paso del minutero siempre los alcanza', () => {
    for (let g = 1; g <= 4; g++) {
        for (let n = 1; n <= 3; n++) {
            const permitidos = minutosPermitidos(g, n);
            const paso = pasoMinutero(g, n);
            assert.ok(permitidos.every((m) => m % paso === 0), `g${g} n${n}: el paso ${paso} no alcanza todos los minutos`);
            assert.ok(permitidos.every((m) => m >= 0 && m < 60));
        }
    }
    assert.deepEqual(minutosPermitidos(1, 1), [0]);
    assert.deepEqual(minutosPermitidos(1, 2), [0, 30]);
    assert.deepEqual(minutosPermitidos(2, 2), [0, 15, 30, 45]);
    assert.equal(minutosPermitidos(3, 3).length, 60);
});

test('1.º-2.º nunca ve minutos que no sean en punto, y media o cuartos', () => {
    paraTodas((q, { grado, habilidad }) => {
        if (grado > 2 || habilidad === 'hora-en-palabras') return;
        const t = q.textoRespuesta;
        if (habilidad === 'leer-hora' || habilidad === 'poner-hora') {
            const m = Number(t.split(':')[1]);
            assert.ok(grado === 1 ? [0, 30].includes(m) : [0, 15, 30, 45].includes(m), `${grado}.º: ${t}`);
        }
    });
});

// ---------- Estructura de las preguntas ----------

test('todas las preguntas tienen enunciado, pista y explicación sin valores raros', () => {
    paraTodas((q) => {
        for (const t of [q.enunciado, q.pista, q.explicacion, q.textoRespuesta]) {
            assert.ok(typeof t === 'string' && t.length > 3);
            assert.ok(!/undefined|NaN|Infinity|null|\[object/.test(t), t);
        }
        assert.ok(['opciones', 'poner'].includes(q.tipo));
    });
});

test('las preguntas de opciones: la correcta está entre ellas, opciones únicas, cantidad pedida, y la posición varía', () => {
    const posiciones = new Set();
    paraTodas((q, { cantidad }) => {
        if (q.tipo !== 'opciones') return;
        const textos = q.opciones.map((o) => o.texto);
        assert.equal(new Set(textos).size, textos.length, `repetidas: ${textos}`);
        assert.equal(textos.length, cantidad, `${q.habilidad}: pidió ${cantidad} y hay ${textos.length}`);
        assert.equal(q.opciones.find((o) => o.id === q.respuesta).texto, q.textoRespuesta);
        assert.equal(new Set(q.opciones.map((o) => o.id)).size, textos.length);
        posiciones.add(q.opciones.findIndex((o) => o.id === q.respuesta));
    }, 30);
    assert.equal(posiciones.size, 4, 'la correcta debe caer en todas las posiciones');
});

test('las preguntas de "poner" traen la hora pedida, un reloj inicial distinto y un paso que la alcanza', () => {
    paraTodas((q, { grado, nivel }) => {
        if (q.tipo !== 'poner') return;
        const { h, m } = q.horaPedida;
        assert.equal(q.respuesta, codigoHora(h, m));
        assert.notEqual(codigoHora(q.relojInicial.h, q.relojInicial.m), q.respuesta, 'no puede empezar ya resuelto');
        assert.equal(q.paso, pasoMinutero(grado, nivel));
        assert.equal(m % q.paso, 0, 'el minutero debe poder llegar a esa hora');
        assert.deepEqual(q.opciones, []);
        assert.ok(!q.enunciado.includes('las las') && !q.enunciado.includes('la la'), q.enunciado);
    });
});

test('el enunciado de "poner" usa "la una" para la 1 y "las" para el resto', () => {
    const az = crearAleatorioSembrado(1);
    let visto1 = false;
    let visto5 = false;
    for (let i = 0; i < 600 && !(visto1 && visto5); i++) {
        const q = generarPregunta({ grado: 3, habilidad: 'poner-hora', nivel: 3, aleatorio: az });
        if (q.horaPedida.h === 1) { visto1 = true; assert.match(q.enunciado, /^Pon el reloj a la 1:\d\d$/); }
        if (q.horaPedida.h === 5) { visto5 = true; assert.match(q.enunciado, /^Pon el reloj a las 5:\d\d$/); }
    }
    assert.ok(visto1 && visto5);
});

test('1.º y 2.º piden la hora con palabras Y con números', () => {
    const q = generarPregunta({ grado: 2, habilidad: 'poner-hora', nivel: 2, aleatorio: crearAleatorioSembrado(3) });
    assert.match(q.enunciado, /^Pon el reloj a las? .+ \(\d+:\d\d\)$/);
});

test('las preguntas son reproducibles con la misma semilla', () => {
    for (const h of TODAS) {
        const g = h === 'formato-24h' ? 4 : h === 'duracion' ? 3 : 2;
        const q = (s) => generarPregunta({ grado: g, habilidad: h, nivel: 2, aleatorio: crearAleatorioSembrado(s) });
        assert.deepEqual(q(9), q(9), h);
    }
});

test('grado, nivel y cantidad fuera de rango se acotan; habilidad desconocida falla con error claro', () => {
    assert.doesNotThrow(() => generarPregunta({ grado: 9, habilidad: 'leer-hora', nivel: 99, cantidad: 99 }));
    assert.doesNotThrow(() => generarPregunta({ grado: -1, habilidad: 'leer-hora', nivel: -4, cantidad: 0 }));
    assert.throws(() => generarPregunta({ grado: 1, habilidad: 'calendario', nivel: 1 }), /desconocida/);
    assert.deepEqual(Object.keys(habilidadesParaGrado(99)), HABILIDADES_POR_GRADO[4]);
    assert.deepEqual(Object.keys(habilidadesParaGrado(0)), HABILIDADES_POR_GRADO[1]);
});

// ---------- Leer la hora ----------

test('leer-hora: los relojes muestran la hora de la respuesta y los distractores son errores típicos', () => {
    paraTodas((q, { habilidad }) => {
        if (habilidad !== 'leer-hora') return;
        assert.equal(q.relojes.length, 1);
        assert.equal(formatoDigital(q.relojes[0].h, q.relojes[0].m), q.textoRespuesta);
    }, 30);
});

test('distractoresHora: únicos, válidos, distintos de la correcta, e incluyen la lectura con las manecillas intercambiadas', () => {
    const az = crearAleatorioSembrado(2);
    for (let h = 1; h <= 12; h++) {
        for (const m of [0, 15, 30, 45]) {
            const d = distractoresHora(h, m, az, 3, 15);
            assert.equal(d.length, 3);
            const textos = d.map((x) => formatoDigital(x.h, x.m));
            assert.equal(new Set(textos).size, 3);
            assert.ok(!textos.includes(formatoDigital(h, m)));
            for (const x of d) assert.ok(x.h >= 1 && x.h <= 12 && x.m >= 0 && x.m <= 59);
        }
    }
    // 3:30 leído al revés: la manecilla larga (6) como hora y la corta (3 → 15 minutos) como minutos = 6:15
    const intercambiada = new Set();
    for (let i = 0; i < 80; i++) distractoresHora(3, 30, crearAleatorioSembrado(i), 3, 15).forEach((x) => intercambiada.add(formatoDigital(x.h, x.m)));
    assert.ok(intercambiada.has('6:15'), '6:15 es el error de confundir las manecillas en las 3:30');
});

// ---------- Decir la hora con palabras ----------

test('hora-en-palabras: la respuesta es la que corresponde al reloj mostrado y todas las opciones son frases válidas', () => {
    paraTodas((q, { habilidad }) => {
        if (habilidad !== 'hora-en-palabras') return;
        const { h, m } = q.relojes[0];
        assert.equal(q.textoRespuesta, textoEnPalabras(h, m));
        for (const o of q.opciones) assert.match(o.texto, /^(la|las) \w+ (en punto|y \w+|menos \w+)$/);
    });
});

// ---------- Reloj de 24 horas ----------

test('formato-24h: la respuesta es correcta según la regla (sumar 12 después del mediodía; 12 a. m. = 00)', () => {
    paraTodas((q, { habilidad }) => {
        if (habilidad !== 'formato-24h') return;
        if (q.enunciado.startsWith('Son las')) {
            const [, hh, mm] = q.enunciado.match(/Son las (\d+):(\d\d)/);
            const h12 = Number(hh);
            const tarde = /de la (tarde|noche)/.test(q.enunciado);
            const h24 = (h12 % 12) + (tarde ? 12 : 0);
            // madrugada de las 12 (00:xx) y mediodía (12:xx) son los casos límite
            assert.equal(q.textoRespuesta, formato24(h24, Number(mm)), q.enunciado);
        } else {
            const [, h24, mm] = q.enunciado.match(/se lee (\d\d):(\d\d)/);
            const h = Number(h24);
            const esperado = `${(h % 12) || 12}:${mm} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
            assert.equal(q.textoRespuesta, esperado, q.enunciado);
        }
    }, 120);
});

test('formato-24h: el nivel 3 incluye 12 a. m. (00:xx) y 12 p. m. (12:xx)', () => {
    const az = crearAleatorioSembrado(11);
    const vistos = new Set();
    for (let i = 0; i < 400; i++) {
        const q = generarPregunta({ grado: 4, habilidad: 'formato-24h', nivel: 3, aleatorio: az });
        if (/12:\d\d a\. m\.|00:/.test(q.textoRespuesta + q.enunciado)) vistos.add('medianoche');
        if (/12:\d\d p\. m\.|se lee 12:|(?<![\d])12:\d\d (de la tarde)/.test(q.textoRespuesta + q.enunciado)) vistos.add('mediodia');
    }
    assert.deepEqual([...vistos].sort(), ['medianoche', 'mediodia']);
});

test('formato-24h: ningún distractor repite la respuesta correcta (ni siquiera con el mismo texto en otro formato)', () => {
    paraTodas((q, { habilidad }) => {
        if (habilidad !== 'formato-24h') return;
        const correcta = q.textoRespuesta;
        assert.equal(q.opciones.filter((o) => o.texto === correcta).length, 1);
    }, 100);
});

// ---------- Duración ----------

test('duración: la hora final o los minutos que pasan están calculados correctamente (con acarreo de horas y vuelta de las 12)', () => {
    paraTodas((q, { habilidad }) => {
        if (habilidad !== 'duracion') return;
        const [ini] = q.relojes;
        const t0 = minutosDelDia(ini.h % 12, ini.m);
        if (q.enunciado.startsWith('Empieza')) {
            const d = q.enunciado.match(/dura (.+)\. ¿A qué hora/)[1];
            const horas = /(\d+) horas?/.exec(d);
            const minutos = /(\d+) minutos?/.exec(d);
            const total = (horas ? Number(horas[1]) * 60 : 0) + (minutos ? Number(minutos[1]) : 0);
            const fin = desdeMinutosDelDia(t0 + total);
            assert.equal(q.textoRespuesta, formatoDigital(fin.h24, fin.m), q.enunciado);
        } else {
            const fin = q.relojes[1];
            const pasan = (minutosDelDia(fin.h % 12, fin.m) - t0 + 720) % 720;
            assert.equal(q.textoRespuesta, `${pasan} minutos`, q.enunciado);
        }
    }, 200);
});

test('duración: 3.º nivel 1 termina siempre dentro de la misma hora', () => {
    const az = crearAleatorioSembrado(5);
    for (let i = 0; i < 500; i++) {
        const q = generarPregunta({ grado: 3, habilidad: 'duracion', nivel: 1, aleatorio: az });
        const [ini] = q.relojes;
        const fin = q.enunciado.startsWith('Empieza') ? { h: null } : q.relojes[1];
        if (fin.h !== null) assert.equal(fin.h, ini.h, `${ini.h}:${ini.m} → ${fin.h}:${fin.m}`);
        else assert.ok(Number(q.textoRespuesta.split(':')[0]) === ini.h, q.enunciado + ' → ' + q.textoRespuesta);
    }
});

test('duración: la dificultad crece (duraciones máximas) con el grado y el nivel', () => {
    assert.ok(configuracionDuracion(3, 3).hasta > configuracionDuracion(3, 1).hasta);
    assert.ok(configuracionDuracion(4, 3).hasta >= configuracionDuracion(4, 1).hasta);
    assert.ok(configuracionDuracion(4, 1).hasta >= configuracionDuracion(3, 3).hasta);
    assert.equal(configuracionDuracion(4, 3).paso, 1, 'el nivel más difícil usa minutos sueltos');
});

test('duración: las opciones de "minutos" son todas positivas', () => {
    paraTodas((q, { habilidad }) => {
        if (habilidad !== 'duracion' || q.enunciado.startsWith('Empieza')) return;
        for (const o of q.opciones) assert.ok(Number(o.texto.split(' ')[0]) > 0, o.texto);
    }, 100);
});

// ---------- Ajustes y partida ----------

test('3 opciones en el nivel 1 y 4 después', () => {
    assert.deepEqual([1, 2, 3].map(cantidadOpciones), [3, 4, 4]);
    assert.deepEqual(prepararRonda(2, 2), { cantidad: 4 });
});

test('cobertura por grado', () => {
    assert.deepEqual(HABILIDADES_POR_GRADO[1], ['leer-hora', 'poner-hora']);
    assert.ok(HABILIDADES_POR_GRADO[2].includes('hora-en-palabras'));
    assert.ok(HABILIDADES_POR_GRADO[3].includes('duracion') && !HABILIDADES_POR_GRADO[3].includes('formato-24h'));
    assert.ok(HABILIDADES_POR_GRADO[4].includes('formato-24h') && HABILIDADES_POR_GRADO[4].includes('duracion'));
});

const nueva = (extra = {}) => new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(1), ...extra });

test('una partida termina tras 10 preguntas; poner la hora se responde con el código de la hora', () => {
    const p = nueva();
    let n = 0;
    for (let info = p.iniciarPregunta(); info; info = p.iniciarPregunta()) {
        const q = p.pregunta;
        const r = p.responder(q.respuesta);
        assert.equal(r.tipo, 'correcta');
        assert.ok(r.explicacion.length > 10);
        n++;
    }
    assert.equal(n, PREGUNTAS_POR_PARTIDA);
});

test('poner la hora mal da la pista, no cuenta de más y se puede reintentar hasta acertar', () => {
    const p = new Partida({ grado: 1, aleatorio: crearAleatorioSembrado(4) });
    let q = null;
    while (!q || q.tipo !== 'poner') { p.iniciarPregunta(); q = p.pregunta; if (q.tipo !== 'poner') p.responder(q.respuesta); }
    const mala = codigoHora(q.horaPedida.h % 12 + 1, q.horaPedida.m);
    const e1 = p.responder(mala);
    assert.equal(e1.tipo, 'incorrecta');
    assert.ok(e1.pista.length > 20);
    p.responder(codigoHora((q.horaPedida.h + 4) % 12, q.horaPedida.m));
    assert.equal(p.fallos >= 1, true);
    const bien = p.responder(q.respuesta);
    assert.equal(bien.tipo, 'correcta');
    assert.equal(bien.primerIntento, false);
});

test('el grado se acota a 1.º–4.º y el resultado cumple el formato común', () => {
    assert.equal(new Partida({ grado: 8 }).grado, 4);
    assert.equal(new Partida({ grado: 0 }).grado, 1);
    const p = nueva();
    while (p.iniciarPregunta()) p.responder(p.pregunta.respuesta);
    const r = normalizarResultado(p.resultado(80000));
    assert.equal(r.estrellas, 3);
    assert.ok(Object.keys(r.habilidades).length >= 3);
});

test('la explicación de lectura enseña que la hora es el número que la manecilla corta YA PASÓ (a las 2:45 es la hora 2, no la 3)', () => {
    const q = (h, m) => {
        const az = crearAleatorioSembrado(h * 100 + m);
        for (let i = 0; i < 5000; i++) {
            const x = generarPregunta({ grado: 4, habilidad: 'leer-hora', nivel: 3, aleatorio: az });
            if (x.relojes[0].h === h && x.relojes[0].m === m) return x;
        }
        throw new Error(`no salió ${h}:${m}`);
    };
    assert.match(q(2, 45).explicacion, /ya pasó el 2 pero no llegó al 3.*hora 2.*9 \(9 × 5 = 45 minutos\)/);
    assert.match(q(12, 30).explicacion, /ya pasó el 12 pero no llegó al 1/, 'después de las 12 viene la 1');
    assert.match(q(5, 0).explicacion, /en punto/);
    assert.match(q(3, 7).explicacion, /7 minutos \(cada rayita es un minuto\)/);
});
