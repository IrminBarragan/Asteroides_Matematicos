import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarPregunta, habilidadesParaGrado, HABILIDADES_POR_GRADO, TABLAS, MAX_OBJETOS_MATERIAL } from '../src/games/cajas/logica/generadores.js';
import { Partida } from '../src/games/cajas/logica/partida.js';
import { JuegoCajas } from '../src/games/cajas/juego.js';
import { EstadoGrupos, EstadoCuadricula } from '../src/core/material.js';
import { leccionCajas, leccionResiduo } from '../src/lecciones/cajas.js';
import { validarLeccion } from '../src/lecciones/leccion.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { validarMeta } from '../src/core/juego.js';

/*
 * Verificación INDEPENDIENTE: se leen los números del texto que ve el niño, se recalcula con aritmética propia y se exige
 * que coincida. Y cada pregunta con material se RESUELVE de verdad con las reglas del material.
 */

const SEMILLAS = 100;
const GRADOS = [1, 2, 3, 4, 5, 6];
const NIVELES = [1, 2, 3];

function paraTodas(fn) {
    for (const grado of GRADOS) {
        for (const habilidad of HABILIDADES_POR_GRADO[grado]) {
            for (const nivel of NIVELES) {
                for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
                    const cantidad = semilla % 2 ? 3 : 4;
                    const apoyo = ['completo', 'ligero', 'ninguno'][semilla % 3];
                    const q = generarPregunta({ grado, habilidad, nivel, cantidad, apoyo, aleatorio: crearAleatorioSembrado(semilla * 211 + nivel * 13 + grado) });
                    fn(q, { grado, habilidad, nivel, cantidad, apoyo, semilla });
                }
            }
        }
    }
}

const numeros = (t) => (t.match(/\d+/g) || []).map(Number);

test('meta válida: juego de matemáticas para los seis grados con misión de inicio', () => {
    validarMeta(JuegoCajas.meta);
    assert.equal(JuegoCajas.meta.id, 'cajas-reparto');
    assert.deepEqual(JuegoCajas.meta.grados, [1, 2, 3, 4, 5, 6]);
    assert.equal(JuegoCajas.admiteColocacion, true);
});

test('cada pregunta: respuesta, opciones e ids coherentes y sin textos rotos', () => {
    paraTodas((q, c) => {
        const donde = `${c.habilidad} gc${c.grado} n${c.nivel} #${c.semilla}`;
        const ids = q.opciones.map((o) => o.id);
        assert.equal(q.opciones.length, c.cantidad, donde);
        assert.equal(new Set(ids).size, ids.length, `repetidas ${donde}`);
        assert.equal(ids.filter((id) => id === q.respuesta).length, 1, donde);
        for (const o of q.opciones) {
            assert.ok(Number.isInteger(o.id) && o.id >= 0, donde);
            assert.equal(o.texto, String(o.id));
        }
        assert.equal(q.textoRespuesta, String(q.respuesta));
        assert.equal(q.apoyo, c.apoyo);
        assert.equal(q.tipo, q.material ? 'material' : 'opciones');
        if (c.apoyo === 'ninguno') assert.equal(q.material, null);
        assert.ok(q.pista.length > 20 && q.explicacion.length > 5);
        assert.doesNotMatch(`${q.enunciado}${q.pista}${q.explicacion}`, /undefined|NaN|null|Infinity/, donde);
    });
});

test('grupos: «a cajas con b objetos» — el total, las tablas del nivel y que se pueda armar poniendo b en cada caja', () => {
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'grupos') return;
        const m = /^(\d+) (cajas|bolsas|canastas|charolas) con (\d+) (\S+) cada una\. ¿(Cuántas|Cuántos) \4 hay en total\?$/.exec(q.enunciado);
        assert.ok(m, q.enunciado);
        const [a, b] = [Number(m[1]), Number(m[3])];
        assert.equal(q.respuesta, a * b);
        assert.ok(a * b <= 24 && a >= 2, 'se puede armar de uno en uno');
        const tablas = c.grado === 1 ? [[2], [5, 10], [3, 4]][c.nivel - 1] : [[2, 5, 10], [3, 4], [6, 8]][c.nivel - 1];
        assert.ok(tablas.includes(b), `${q.enunciado} (tablas ${tablas})`);
        assert.ok(q.opciones.some((o) => o.id === a + b) || a + b === a * b, 'el error de sumar en vez de multiplicar se ofrece');
        if (c.apoyo !== 'ninguno') {
            const e = new EstadoGrupos({ grupos: q.material.grupos });
            assert.equal(q.material.grupos, a);
            for (let g = 0; g < a; g++) for (let i = 0; i < q.material.objetivo; i++) assert.equal(e.agregar(g), true);
            assert.equal(e.todosCon(b), true);
            assert.equal(e.total(), q.respuesta);
        }
        vistas++;
    });
    assert.ok(vistas > 200);
});

test('arreglo: filas × columnas del texto, y se arma con los botones de la cuadrícula', () => {
    paraTodas((q, c) => {
        if (c.habilidad !== 'arreglo') return;
        const [f, col] = numeros(q.enunciado);
        assert.equal(q.respuesta, f * col, q.enunciado);
        assert.match(q.enunciado, /filas y \d+ columnas/);
        if (c.apoyo !== 'ninguno') {
            assert.equal(q.material.modo, 'construir');
            const e = new EstadoCuadricula({});
            for (let i = 0; i < q.material.filas; i++) assert.equal(e.masFilas(), true);
            for (let i = 0; i < q.material.columnas; i++) assert.equal(e.masColumnas(), true);
            assert.equal(e.coincideCon(f, col), true);
            assert.equal(e.total(), q.respuesta);
        }
    });
});

test('tabla: el producto, la tabla del nivel y la cuadrícula de ayuda con las medidas correctas', () => {
    paraTodas((q, c) => {
        if (c.habilidad !== 'tabla') return;
        const m = /^(\d+) × (\d+) = \?$/.exec(q.enunciado);
        assert.ok(m, q.enunciado);
        const [a, b] = [Number(m[1]), Number(m[2])];
        assert.equal(q.respuesta, a * b);
        assert.ok(TABLAS[c.grado][c.nivel - 1].includes(a) || TABLAS[c.grado][c.nivel - 1].includes(b), `${q.enunciado}: una de las dos tablas del nivel`);
        if (c.apoyo === 'ninguno' || a > 10 || b > 10) assert.equal(q.material, null);
        else {
            assert.equal(q.material.modo, 'ver');
            assert.deepEqual([q.material.filas, q.material.columnas], [a, b]);
        }
    });
});

test('repartir: cociente y residuo recalculados, lo que se pide y que se pueda repartir de verdad', () => {
    const vistos = { exacto: 0, residuo: 0, sobran: 0, material: 0 };
    paraTodas((q, c) => {
        if (c.habilidad !== 'repartir') return;
        const m = /^Se reparten (\d+) (\S+) en partes iguales entre (\d+) platos\. ¿(Cuántas|Cuántos) \2 (sobran|le tocan a cada plato)\?$/.exec(q.enunciado);
        assert.ok(m, q.enunciado);
        const [N, d] = [Number(m[1]), Number(m[3])];
        const cociente = Math.floor(N / d);
        const resto = N % d;
        assert.equal(q.respuesta, m[5] === 'sobran' ? resto : cociente, q.enunciado);
        if (m[5] === 'sobran') { assert.ok(resto >= 1); vistos.sobran++; }
        if (c.grado <= 2 || (c.grado === 3 && c.nivel === 1)) assert.equal(resto, 0, 'sin residuo al principio');
        if (c.grado === 3 && c.nivel >= 2) assert.ok(resto >= 1);
        if (c.grado >= 4 && c.nivel >= 2) assert.ok(resto >= 1);
        resto === 0 ? vistos.exacto++ : vistos.residuo++;
        if (N <= MAX_OBJETOS_MATERIAL && d <= 6 && N <= 24) {
            if (c.apoyo !== 'ninguno') {
                // Se reparte de verdad: de uno en uno a cada plato, vuelta tras vuelta, hasta que ya no alcance para todos
                const e = new EstadoGrupos({ grupos: q.material.grupos, pool: q.material.pool });
                assert.equal(q.material.pool, N);
                assert.equal(q.material.grupos, d);
                while (e.pool >= d) for (let i = 0; i < d; i++) assert.equal(e.agregar(i), true);
                assert.equal(e.iguales, true);
                assert.equal(e.todosCon(cociente), true);
                assert.equal(e.pool, resto);
                vistos.material++;
            }
        } else assert.equal(q.material, null, 'con tantos objetos no se reparte de uno en uno');
    });
    assert.ok(vistos.exacto > 100 && vistos.residuo > 100 && vistos.sobran > 50 && vistos.material > 100, JSON.stringify(vistos));
});

test('inversa: las tres formas de escribirla dan el mismo cociente, y se llega al total agregando columnas', () => {
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'inversa') return;
        let N;
        let d;
        let m = /^(\d+) ÷ (\d+) = \?$/.exec(q.enunciado);
        if (m) [N, d] = [Number(m[1]), Number(m[2])];
        else if ((m = /^\? × (\d+) = (\d+)$/.exec(q.enunciado)) || (m = /^(\d+) × \? = (\d+)$/.exec(q.enunciado))) [d, N] = [Number(m[1]), Number(m[2])];
        assert.ok(m, q.enunciado);
        assert.equal(N % d, 0, 'división exacta');
        assert.equal(q.respuesta, N / d, q.enunciado);
        assert.ok(TABLAS[c.grado][c.nivel - 1].includes(d), `${q.enunciado}: el divisor es de las tablas del nivel`);
        assert.ok(q.opciones.some((o) => o.id === N - d) || N - d === q.respuesta, 'el error de restar en vez de dividir se ofrece');
        if (c.apoyo !== 'ninguno' && q.material) {
            const e = new EstadoCuadricula({ filas: q.material.filas, filasFijas: true });
            assert.equal(q.material.filas, d);
            assert.equal(q.material.objetivoTotal, N);
            while (e.total() < N) assert.equal(e.masColumnas(), true);
            assert.equal(e.total(), N);
            assert.equal(e.columnas, q.respuesta, 'las columnas que hicieron falta son el cociente');
            vistas++;
        }
    });
    assert.ok(vistas > 80);
});

test('grande: multiplicaciones y divisiones recalculadas; el tipo depende del grado y el nivel', () => {
    const esperado = {
        4: [(a, b, op) => op === '×' && [10, 100, 1000].includes(b), (a, b, op) => op === '×' && b >= 3 && b <= 9 && a >= 12 && a <= 99, (a, b, op) => op === '÷' && a / b >= 11 && a / b <= 99],
        5: [(a, b, op) => op === '×' && b >= 3 && b <= 9 && a >= 12 && a <= 99, (a, b, op) => op === '×' && b >= 3 && b <= 9 && a >= 101 && a <= 999, (a, b, op) => op === '÷' && a / b >= 101 && a / b <= 999],
        6: [(a, b, op) => op === '×' && b % 10 === 0 && b >= 20 && b <= 90, (a, b, op) => op === '×' && b >= 11 && b <= 29, (a, b, op) => op === '÷' && a / b >= 1001 && a / b <= 9999]
    };
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'grande') return;
        const m = /^(\d+) ([×÷]) (\d+) = \?$/.exec(q.enunciado);
        assert.ok(m, q.enunciado);
        const [a, b] = [Number(m[1]), Number(m[3])];
        const esperada = m[2] === '×' ? a * b : a / b;
        assert.ok(Number.isInteger(esperada), 'las divisiones son exactas');
        assert.equal(q.respuesta, esperada, q.enunciado);
        assert.ok(esperado[c.grado][c.nivel - 1](a, b, m[2]), `${q.enunciado} no es del tipo del grado ${c.grado}, nivel ${c.nivel}`);
        assert.equal(q.material, null);
        vistas++;
    });
    assert.ok(vistas > 150);
});

test('errores típicos: se ofrecen siempre y nunca son la respuesta', () => {
    for (let semilla = 1; semilla <= 150; semilla++) {
        const az = () => crearAleatorioSembrado(semilla);
        const r = generarPregunta({ grado: 3, habilidad: 'repartir', nivel: 2, cantidad: 4, aleatorio: az() });
        const [N, d] = numeros(r.enunciado);
        assert.ok(r.opciones.some((o) => o.id === Math.floor(N / d)), 'al preguntar cuántas sobran se ofrece el cociente');
        const p = generarPregunta({ grado: 4, habilidad: 'grande', nivel: 1, cantidad: 4, aleatorio: az() });
        const [a, k] = numeros(p.enunciado);
        assert.ok(p.opciones.some((o) => o.id === a * (k / 10)), `un cero de menos: ${p.enunciado}`);
        const g = generarPregunta({ grado: 3, habilidad: 'inversa', nivel: 2, cantidad: 4, aleatorio: az() });
        assert.notEqual(g.respuesta, numeros(g.enunciado)[0] - numeros(g.enunciado)[1]);
    }
});

test('habilidades por grado, errores de uso y reproducibilidad', () => {
    assert.deepEqual(Object.keys(habilidadesParaGrado(1)), ['grupos', 'repartir']);
    assert.ok(Object.keys(habilidadesParaGrado(6)).includes('grande'));
    assert.throws(() => generarPregunta({ grado: 1, habilidad: 'grande', nivel: 1 }), /no existe en el grado/);
    assert.throws(() => generarPregunta({ grado: 3, habilidad: 'otra', nivel: 1 }), /desconocida/);
    assert.equal(generarPregunta({ grado: 99, habilidad: 'grande', nivel: 99, aleatorio: crearAleatorioSembrado(1) }).habilidad, 'grande');
    const uno = (s) => generarPregunta({ grado: 3, habilidad: 'tabla', nivel: 3, aleatorio: crearAleatorioSembrado(s), apoyo: 'completo' });
    assert.deepEqual(uno(9), uno(9));
    assert.ok(new Set(Array.from({ length: 40 }, (_, i) => uno(i + 1).enunciado)).size > 15);
});

// ---------- Partida y lecciones ----------

const equivocada = (q) => q.opciones.find((o) => o.id !== q.respuesta).id;

test('partida: la ayuda se retira por habilidad y la misión de inicio no lleva ayuda ni material', () => {
    const p = new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(4), total: 40 });
    const vistos = [];
    while (p.hayMasPreguntas) {
        const { pregunta } = p.iniciarPregunta(0);
        vistos.push(pregunta.apoyo);
        p.responder(pregunta.respuesta);
    }
    assert.ok(vistos.includes('ninguno'));
    for (let semilla = 1; semilla <= 20; semilla++) {
        const az = crearAleatorioSembrado(semilla);
        const m = new Partida({ grado: 6, aleatorio: az, colocacion: { gradoMin: 1, gradoMax: 6 } });
        while (m.hayMasPreguntas) {
            const { pregunta } = m.iniciarPregunta(0);
            assert.equal(pregunta.apoyo, 'ninguno');
            assert.equal(pregunta.material, null);
            m.responder(az() < 0.5 ? pregunta.respuesta : equivocada(pregunta));
        }
        assert.deepEqual(m.apoyos, {});
    }
});

function revisarHazlos(leccion) {
    const OPS = { '+': (x, y) => x + y, '−': (x, y) => x - y, '×': (x, y) => x * y, '÷': (x, y) => x / y };
    for (const paso of leccion.pasos) {
        if (!paso.hazlo) continue;
        const m = /^(\d+) ([+−×÷]) (\d+) = \?$/.exec(paso.hazlo.enunciado);
        assert.ok(m, `forma inesperada: ${paso.hazlo.enunciado}`);
        const esperado = OPS[m[2]](Number(m[1]), Number(m[3]));
        assert.equal(paso.hazlo.respuesta, esperado, paso.hazlo.enunciado);
        assert.ok(paso.hazlo.opciones.includes(esperado));
        assert.ok(!paso.texto.includes(paso.hazlo.enunciado.replace('?', String(esperado))), `trae la respuesta: ${paso.texto}`);
        assert.ok(!new RegExp(`= ${esperado}(?![\\d.])`).test(paso.texto), `trae «= ${esperado}»: ${paso.texto}`);
    }
}

test('lecciones: todas las habilidades y niveles dan una lección válida con «hazlo» correctos', () => {
    let lecciones = 0;
    for (const grado of GRADOS) {
        const p = new Partida({ grado, aleatorio: crearAleatorioSembrado(grado * 19), total: 80 });
        while (p.hayMasPreguntas) {
            const { pregunta } = p.iniciarPregunta(0);
            const l = p.leccionPara(pregunta);
            validarLeccion(l);
            revisarHazlos(l);
            validarLeccion(p.leccionIntro(pregunta.habilidad));
            p.responder(pregunta.respuesta);
            lecciones++;
        }
    }
    assert.ok(lecciones >= 400);
    assert.equal(leccionCajas('otra', { a: 1 }), null);
    assert.equal(leccionCajas('tabla', null), null);
});

test('lección del residuo: reparte, comprueba lo repartido y explica por qué el residuo es menor que el divisor', () => {
    const l = leccionResiduo({ N: 13, d: 4, q: 3, r: 1 });
    validarLeccion(l);
    revisarHazlos(l);
    const texto = l.pasos.map((p) => p.texto).join(' ');
    assert.match(texto, /residuo/);
    assert.match(texto, /1 es menor que 4/);
    assert.deepEqual(l.pasos.filter((p) => p.hazlo).map((p) => p.hazlo.enunciado), ['4 × 3 = ?', '13 − 12 = ?']);
    const grande = leccionResiduo({ N: 371, d: 6, q: 61, r: 5 });
    validarLeccion(grande);
    assert.equal(grande.pasos[0].visual.tipo, 'ejemplo', 'con números grandes no se dibujan grupos');
    // Un reparto con residuo usa la lección del residuo; uno exacto, la de dividir
    assert.equal(leccionCajas('repartir', { N: 13, d: 4, q: 3, r: 1 }).titulo, 'Repartir cuando sobran');
    assert.notEqual(leccionCajas('repartir', { N: 12, d: 4, q: 3, r: 0 }).titulo, 'Repartir cuando sobran');
});
