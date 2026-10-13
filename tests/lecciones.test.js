import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarLeccion, opcionesCercanas, hazlo, TIPOS_VISUAL, MAX_PASOS } from '../src/lecciones/leccion.js';
import {
    leccionSuma, leccionResta, leccionMultiplicacion, leccionDivision, leccionCombinadas, leccionMultiplos, leccionDecimales,
    leccionAritmetica, partesPosicionales, columnasSuma, columnasResta, trozosDivision
} from '../src/lecciones/aritmetica.js';
import { leccionDeEjemplo } from '../src/lecciones/ejemplo.js';
import { construirLeccion } from '../src/lecciones/index.js';
import { generarPregunta, HABILIDADES_POR_GRADO as HAB_AST } from '../src/games/asteroides/logica/generadores.js';
import { Partida as PartidaAsteroides } from '../src/games/asteroides/logica/partida.js';
import { Partida as PartidaOrtografia } from '../src/games/ortografia/logica/partida.js';
import { Partida as PartidaReloj } from '../src/games/reloj/logica/partida.js';
import { Partida as PartidaFracciones } from '../src/games/fracciones/logica/partida.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

// ---------- Verificación INDEPENDIENTE ----------
// Cada «hazlo tú» tiene la forma «a ○ b = ?»: aquí se recalcula sin usar el código que se prueba.

const OPERACIONES = { '+': (x, y) => x + y, '−': (x, y) => x - y, '×': (x, y) => x * y, '÷': (x, y) => x / y };

function revisarHazlos(leccion) {
    let hazlos = 0;
    for (const paso of leccion.pasos) {
        if (!paso.hazlo) continue;
        hazlos++;
        const m = /^(\d+) ([+−×÷]) (\d+) = \?$/.exec(paso.hazlo.enunciado);
        assert.ok(m, `hazlo con forma inesperada: «${paso.hazlo.enunciado}»`);
        const esperado = OPERACIONES[m[2]](Number(m[1]), Number(m[3]));
        assert.equal(paso.hazlo.respuesta, esperado, `«${paso.hazlo.enunciado}» → ${paso.hazlo.respuesta}, debía ser ${esperado}`);
        assert.ok(paso.hazlo.opciones.includes(esperado));
        // El texto del paso plantea; la respuesta no puede venir ya escrita (si no, «hazlo tú» no enseña nada)
        const completo = paso.hazlo.enunciado.replace('?', String(esperado));
        assert.ok(!paso.texto.includes(completo), `el texto ya trae «${completo}»: ${paso.texto}`);
        assert.ok(!new RegExp(`= ${esperado}(?![\\d.])`).test(paso.texto), `el texto trae «= ${esperado}»: ${paso.texto}`);
        assert.ok(typeof paso.hazlo.explicacion === 'string' && paso.hazlo.explicacion.length > 0, 'falta la explicación posterior');
    }
    return hazlos;
}
const textoCompleto = (l) => l.pasos.map((p) => p.texto).join(' ');

// ---------- Formato ----------

test('opcionesCercanas: contiene la respuesta, ≥ 2 distintas, no negativas y ordenadas', () => {
    for (let r = 0; r <= 300; r++) {
        for (const paso of [1, 5, 10]) {
            const o = opcionesCercanas(r, 3, paso);
            assert.ok(o.includes(r));
            assert.ok(o.length >= 2 && new Set(o).size === o.length);
            assert.ok(o.every((x) => x >= 0));
            assert.deepEqual(o, [...o].sort((a, b) => a - b));
        }
    }
    assert.deepEqual(opcionesCercanas(60, 3, 10), [50, 60, 70]);
});

test('validarLeccion acepta una lección correcta y rechaza las rotas (con motivo)', () => {
    const buena = { titulo: 'T', pasos: [{ texto: 'a' }, { texto: 'b', hazlo: hazlo('1 + 1 = ?', 2, 'p') }] };
    assert.equal(validarLeccion(buena), buena);
    const casos = [
        [null, /objeto/], [{ titulo: '', pasos: [{ texto: 'a' }] }, /título/], [{ titulo: 'T', pasos: [] }, /pasos/],
        [{ titulo: 'T', pasos: Array(MAX_PASOS + 1).fill({ texto: 'a' }) }, /pasos/],
        [{ titulo: 'T', pasos: [{ texto: ' ' }] }, /sin texto/], [{ titulo: 'T', pasos: [{ texto: 'vale undefined' }] }, /roto/],
        [{ titulo: 'T', pasos: [{ texto: 'a', visual: { tipo: 'inventado' } }] }, /visual/],
        [{ titulo: 'T', pasos: [{ texto: 'a', hazlo: { enunciado: 'x', opciones: [1, 1], respuesta: 1, pista: 'p' } }] }, /opciones/],
        [{ titulo: 'T', pasos: [{ texto: 'a', hazlo: { enunciado: 'x', opciones: [1, 2], respuesta: 3, pista: 'p' } }] }, /respuesta/],
        [{ titulo: 'T', pasos: [{ texto: 'a', hazlo: { enunciado: 'x', opciones: [1, 2], respuesta: 1, pista: '' } }] }, /pista/]
    ];
    for (const [leccion, motivo] of casos) assert.throws(() => validarLeccion(leccion), motivo);
    assert.ok(TIPOS_VISUAL.includes('bloques'));
});

// ---------- Funciones de apoyo ----------

test('partesPosicionales suma de vuelta el número y descarta los ceros', () => {
    assert.deepEqual(partesPosicionales(475), [400, 70, 5]);
    assert.deepEqual(partesPosicionales(3004), [3000, 4]);
    for (let n = 1; n <= 3000; n += 7) assert.equal(partesPosicionales(n).reduce((a, b) => a + b, 0), n);
});

test('columnasSuma: reconstruyendo las columnas se obtiene a + b (y las llevadas son 0 o 1)', () => {
    const az = crearAleatorioSembrado(1);
    for (let i = 0; i < 400; i++) {
        const a = 1 + Math.floor(az() * 99999);
        const b = 1 + Math.floor(az() * 99999);
        const cols = columnasSuma(a, b);
        const valor = cols.reduce((suma, c, k) => suma + c.escribe * 10 ** k, 0);
        assert.equal(valor, a + b, `${a} + ${b}`);
        assert.ok(cols.every((c) => c.llevaSale === 0 || c.llevaSale === 1));
    }
});

test('columnasResta: reconstruyendo las columnas se obtiene a − b', () => {
    const az = crearAleatorioSembrado(2);
    for (let i = 0; i < 400; i++) {
        const b = 1 + Math.floor(az() * 49999);
        const a = b + 1 + Math.floor(az() * 49999);
        const cols = columnasResta(a, b);
        assert.equal(cols.reduce((suma, c, k) => suma + c.resultado * 10 ** k, 0), a - b, `${a} − ${b}`);
        assert.ok(cols.every((c) => c.resultado >= 0 && c.resultado <= 9));
    }
});

test('trozosDivision: los trozos suman el cociente y sus partes suman el dividendo', () => {
    const az = crearAleatorioSembrado(3);
    for (let i = 0; i < 400; i++) {
        const d = 2 + Math.floor(az() * 39);
        const q = 5 + Math.floor(az() * 90);
        const a = d * q;
        const t = trozosDivision(a, d);
        assert.equal(t.reduce((s, x) => s + x.c, 0), q, `${a} ÷ ${d}`);
        assert.equal(t.reduce((s, x) => s + x.parte, 0), a);
        assert.ok(t.every((x) => x.parte === x.c * d && x.c > 0));
    }
});

// ---------- Cada lección de aritmética, con los datos que de verdad produce Asteroides ----------

function paraTodosLosDatos(habilidad, fn, muestras = 150) {
    for (const [grado, lista] of Object.entries(HAB_AST)) {
        if (!lista.includes(habilidad)) continue;
        for (let nivel = 1; nivel <= 3; nivel++) {
            const az = crearAleatorioSembrado(Number(grado) * 100 + nivel);
            for (let i = 0; i < muestras; i++) {
                const p = generarPregunta({ grado: Number(grado), habilidad, nivel, aleatorio: az });
                assert.ok(p.datos, `${habilidad} no entrega datos`);
                fn(p, Number(grado), nivel);
            }
        }
    }
}

test('suma: cada «hazlo» es correcto y la lección termina con el resultado real', () => {
    let con = 0;
    paraTodosLosDatos('suma', (p) => {
        const l = leccionAritmetica('suma', p.datos);
        con += revisarHazlos(l);
        assert.ok(textoCompleto(l).includes(String(p.datos.a + p.datos.b)), `${p.enunciado}`);
        assert.ok(l.pasos.length <= MAX_PASOS);
    });
    assert.ok(con > 0);
});

test('suma: elige la estrategia según el tamaño (recta, completar 10, por partes, columnas)', () => {
    assert.equal(leccionSuma({ a: 3, b: 4 }).titulo, 'Sumar es juntar');
    assert.equal(leccionSuma({ a: 7, b: 8 }).titulo, 'Completar 10 para sumar');
    assert.equal(leccionSuma({ a: 47, b: 28 }).titulo, 'Sumar por partes');
    assert.equal(leccionSuma({ a: 475, b: 368 }).titulo, 'Sumar por columnas');
});

test('resta: «hazlos» correctos y resultado real', () => {
    paraTodosLosDatos('resta', (p) => {
        const l = leccionAritmetica('resta', p.datos);
        revisarHazlos(l);
        assert.ok(textoCompleto(l).includes(String(p.datos.a - p.datos.b)), p.enunciado);
    });
});

test('resta: elige la estrategia según el tamaño y explica el préstamo', () => {
    assert.equal(leccionResta({ a: 9, b: 4 }).titulo, 'Restar es ver cuánto falta');
    assert.equal(leccionResta({ a: 52, b: 27 }).titulo, 'Restar por partes');
    assert.match(textoCompleto(leccionResta({ a: 52, b: 27 })), /decena y la partimos/);
    assert.equal(leccionResta({ a: 4321, b: 1987 }).titulo, 'Restar por columnas');
    assert.match(textoCompleto(leccionResta({ a: 4321, b: 1987 })), /pedimos prestado/);
});

test('multiplicación: «hazlos» correctos y resultado real, con tablas y con números grandes', () => {
    paraTodosLosDatos('multiplicacion', (p) => {
        const l = leccionAritmetica('multiplicacion', p.datos);
        revisarHazlos(l);
        assert.ok(textoCompleto(l).includes(String(p.datos.a * p.datos.b)), p.enunciado);
    });
    assert.equal(leccionMultiplicacion({ a: 6, b: 7 }).titulo, 'Multiplicar es sumar grupos iguales');
    assert.equal(leccionMultiplicacion({ a: 23, b: 4 }).titulo, 'Multiplicar descomponiendo');
});

test('multiplicación: con un factor grande se descompone ESE factor (23 × 4 = 20 × 4 + 3 × 4)', () => {
    const l = leccionMultiplicacion({ a: 23, b: 4 });
    const t = textoCompleto(l);
    assert.match(t, /20 \+ 3/);
    assert.match(t, /4 × 20\./, 'plantea la multiplicación sin resolverla');
    assert.equal(l.pasos[1].hazlo.explicacion, '4 × 20 = 80.', 'y la resuelve después de que el niño acierta');
    assert.match(t, /80 \+ 12 = 92/);
    const dos = leccionMultiplicacion({ a: 37, b: 24 });
    assert.equal(dos.pasos[1].hazlo.explicacion, '37 × 20 = 740.');
    assert.match(textoCompleto(dos), /740 \+ 148 = 888/);
});

test('división: «hazlos» correctos y cociente real, repartiendo o por trozos', () => {
    paraTodosLosDatos('division', (p) => {
        const l = leccionAritmetica('division', p.datos);
        revisarHazlos(l);
        assert.ok(textoCompleto(l).includes(String(p.datos.a / p.datos.d)), p.enunciado);
    });
    assert.equal(leccionDivision({ a: 24, d: 4 }).titulo, 'Dividir es repartir');
    assert.equal(leccionDivision({ a: 126, d: 6 }).titulo, 'Dividir por trozos');
});

test('combinadas: explica el orden, muestra cada paso y el resultado real', () => {
    paraTodosLosDatos('combinadas', (p) => {
        const l = leccionAritmetica('combinadas', p.datos);
        revisarHazlos(l);
        const ultimo = p.datos.pasos[p.datos.pasos.length - 1].expr;
        assert.equal(ultimo, String(p.respuesta), 'el último paso es el resultado real');
        assert.ok(textoCompleto(l).includes(`Resultado: ${p.respuesta}`));
        assert.match(l.pasos[0].texto, /paréntesis/);
    });
});

test('múltiplos: lista la tabla y el «hazlo» es el siguiente múltiplo', () => {
    paraTodosLosDatos('multiplos', (p) => {
        const l = leccionAritmetica('multiplos', p.datos);
        revisarHazlos(l);
        assert.ok(textoCompleto(l).includes([1, 2, 3].map((k) => p.datos.n * k).join(', ')));
    });
});

test('decimales: alinea, calcula la última columna y escribe el resultado bien formateado', () => {
    paraTodosLosDatos('decimales', (p) => {
        const l = leccionAritmetica('decimales', p.datos);
        revisarHazlos(l);
        const { a, b, decimales, esSuma } = p.datos;
        const r = esSuma ? a + b : a - b;
        assert.ok(textoCompleto(l).includes((r / 10 ** decimales).toFixed(decimales)), p.enunciado);
    });
});

test('leccionAritmetica devuelve null si no hay datos o la habilidad no tiene lección', () => {
    assert.equal(leccionAritmetica('suma', null), null);
    assert.equal(leccionAritmetica('inventada', { a: 1 }), null);
});

// ---------- Lección genérica: ejemplo resuelto ----------

const PARTIDAS = [
    { nombre: 'Asteroides', Partida: PartidaAsteroides, grado: 5 },
    { nombre: 'Ortografía', Partida: PartidaOrtografia, grado: 6 },
    { nombre: 'Reloj', Partida: PartidaReloj, grado: 4 },
    { nombre: 'Fracciones', Partida: PartidaFracciones, grado: 6 }
];

for (const { nombre, Partida, grado } of PARTIDAS) {
    test(`${nombre}: «Ver cómo se hace» da una lección válida para cualquier pregunta, con una gemela distinta`, () => {
        for (let semilla = 1; semilla <= 40; semilla++) {
            const partida = new Partida({ grado, aleatorio: crearAleatorioSembrado(semilla) });
            for (let i = 0; i < 6; i++) {
                const { pregunta } = partida.iniciarPregunta(0);
                const gemela = partida.gemela(pregunta);
                assert.equal(gemela.habilidad, pregunta.habilidad);
                assert.notEqual(`${gemela.enunciado}|${gemela.textoRespuesta}`, `${pregunta.enunciado}|${pregunta.textoRespuesta}`, 'la gemela no es la misma pregunta');
                const l = partida.leccionPara(pregunta);
                assert.doesNotThrow(() => validarLeccion(l));
                revisarHazlos(l);
                partida.responder(pregunta.respuesta);
            }
        }
    });

    test(`${nombre}: la lección de introducción es estable (mismo ejemplo siempre) y lleva el prefijo`, () => {
        const partida = new Partida({ grado, aleatorio: crearAleatorioSembrado(5) });
        const { pregunta } = partida.iniciarPregunta(0);
        const a = partida.leccionIntro(pregunta.habilidad);
        const b = partida.leccionIntro(pregunta.habilidad);
        assert.deepEqual(a, b);
        assert.match(a.titulo, /^Antes de empezar: /);
        assert.doesNotThrow(() => validarLeccion(a));
    });
}

test('ejemplo resuelto: muestra el enunciado, la clave y la explicación de la gemela, sin tocar la pregunta original', () => {
    const partida = new PartidaFracciones({ grado: 6, aleatorio: crearAleatorioSembrado(8) });
    const { pregunta } = partida.iniciarPregunta(0);
    const gemela = partida.gemela(pregunta);
    const l = leccionDeEjemplo(gemela, { titulo: 'X' });
    const t = textoCompleto(l);
    assert.ok(t.includes(gemela.pista));
    assert.ok(t.includes(gemela.explicacion));
    assert.equal(l.pasos[0].visual.enunciado, gemela.enunciado);
    assert.ok(!t.includes(pregunta.explicacion) || pregunta.explicacion === gemela.explicacion);
});

test('el ejemplo resuelto conserva los dibujos: figuras de fracciones y relojes', () => {
    const f = new PartidaFracciones({ grado: 3, aleatorio: crearAleatorioSembrado(2) });
    let vio = false;
    for (let i = 0; i < 20 && !vio; i++) {
        f.iniciarPregunta(0);
        const l = f.leccionPara();
        vio = Boolean(l.pasos[0].visual.figuras);
        f.responder(f.pregunta.respuesta);
    }
    assert.ok(vio, 'alguna lección de fracciones de 3.º trae figuras');
    const r = new PartidaReloj({ grado: 2, aleatorio: crearAleatorioSembrado(2) });
    let reloj = false;
    for (let i = 0; i < 20 && !reloj; i++) { r.iniciarPregunta(0); reloj = Boolean(r.leccionPara().pasos[0].visual.relojes); r.escapo(); }
    assert.ok(reloj, 'alguna lección de reloj trae relojes');
});

test('Asteroides usa la lección PROPIA con material (no el ejemplo genérico)', () => {
    const partida = new PartidaAsteroides({ grado: 2, aleatorio: crearAleatorioSembrado(4) });
    const tipos = new Set();
    for (let i = 0; i < 10; i++) {
        partida.iniciarPregunta(0);
        for (const p of partida.leccionPara().pasos) if (p.visual) tipos.add(p.visual.tipo);
        partida.escapo();
    }
    assert.ok(tipos.has('bloques') || tipos.has('recta'), `visuales: ${[...tipos]}`);
});

test('construirLeccion: si la lección propia falla o devuelve null, usa el ejemplo resuelto (nunca lanza)', () => {
    const gemela = { enunciado: 'e', pista: 'p', explicacion: 'x', textoRespuesta: '1', opciones: [] };
    const aviso = console.warn; console.warn = () => {};
    try {
        const porError = construirLeccion({ gemela, propia: () => { throw new Error('boom'); }, titulo: 'T' });
        assert.equal(porError.titulo, 'T');
        const porNulo = construirLeccion({ gemela, propia: () => null, titulo: 'T' });
        assert.equal(porNulo.titulo, 'T');
        const porInvalida = construirLeccion({ gemela, propia: () => ({ titulo: '', pasos: [] }), titulo: 'T' });
        assert.equal(porInvalida.titulo, 'T');
    } finally { console.warn = aviso; }
    assert.equal(construirLeccion({ gemela, prefijoTitulo: 'Antes: ', titulo: 'T' }).titulo, 'Antes: T');
});
