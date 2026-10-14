import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarPregunta, habilidadesParaGrado, HABILIDADES_POR_GRADO, ESCALAS, formatoNumero, cantidadDeColumna, descomposicionEnPalabras
} from '../src/games/bloques/logica/generadores.js';
import { Partida } from '../src/games/bloques/logica/partida.js';
import { JuegoBloques } from '../src/games/bloques/juego.js';
import { EstadoBloques } from '../src/core/material.js';
import { contarLlevadas, contarPrestamos, sumaSinLlevar, restaAlReves } from '../src/core/cifras.js';
import { leccionBloques } from '../src/lecciones/bloques.js';
import { validarLeccion } from '../src/lecciones/leccion.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { validarMeta } from '../src/core/juego.js';

/*
 * Verificación INDEPENDIENTE: se leen los números que el niño ve (enunciado, bloques), se recalcula con aritmética
 * propia y se exige que coincida. Nada de esto usa las funciones del generador para decidir si algo es correcto.
 */

const SEMILLAS = 100;
const GRADOS = [1, 2, 3, 4, 5, 6];
const NIVELES = [1, 2, 3];
const SIN_FINO = (t) => t.replace(/ /g, '');
const VALOR_COLUMNA = { 'unidad': 1, 'unidades': 1, 'decena': 10, 'decenas': 10, 'centena': 100, 'centenas': 100, 'unidad de millar': 1000, 'unidades de millar': 1000, 'decena de millar': 10000, 'decenas de millar': 10000, 'centena de millar': 100000, 'centenas de millar': 100000 };
const NOMBRES_COL = Object.keys(VALOR_COLUMNA).sort((a, b) => b.length - a.length).join('|');
const FRASE_COLUMNA = new RegExp(`(\\d+) (${NOMBRES_COL})`, 'g');

/** Hay un acarreo hacia la columna k si los restos de a y b módulo 10^k suman 10^k o más. */
const llevadasIndependiente = (a, b) => { let n = 0; for (let k = 1; k <= 8; k++) if ((a % 10 ** k) + (b % 10 ** k) >= 10 ** k) n++; return n; };
/** Hay un préstamo desde la columna k si el resto de a módulo 10^k es menor que el de b. */
const prestamosIndependiente = (a, b) => { let n = 0; for (let k = 1; k <= 8; k++) if ((a % 10 ** k) < (b % 10 ** k)) n++; return n; };
const cerosDe = (n) => (String(n).match(/0/g) || []).length;

function paraTodas(fn) {
    for (const grado of GRADOS) {
        for (const habilidad of HABILIDADES_POR_GRADO[grado]) {
            for (const nivel of NIVELES) {
                for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
                    const cantidad = semilla % 2 ? 3 : 4;
                    const apoyo = ['completo', 'ligero', 'ninguno'][semilla % 3];
                    const q = generarPregunta({ grado, habilidad, nivel, cantidad, apoyo, aleatorio: crearAleatorioSembrado(semilla * 131 + nivel * 7 + grado) });
                    fn(q, { grado, habilidad, nivel, cantidad, apoyo, semilla });
                }
            }
        }
    }
}

test('meta válida: juego de matemáticas para los seis grados con misión de inicio', () => {
    validarMeta(JuegoBloques.meta);
    assert.equal(JuegoBloques.meta.id, 'bloques-valor');
    assert.deepEqual(JuegoBloques.meta.grados, [1, 2, 3, 4, 5, 6]);
    assert.equal(JuegoBloques.admiteColocacion, true);
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
            assert.equal(SIN_FINO(o.texto), String(o.id), 'el texto de la opción es su valor');
        }
        assert.equal(SIN_FINO(q.textoRespuesta), String(q.respuesta));
        assert.equal(q.apoyo, c.apoyo);
        assert.equal(q.tipo, q.material ? 'bloques' : 'opciones');
        assert.ok(q.pista.length > 20 && q.explicacion.length > 5);
        assert.doesNotMatch(`${q.enunciado}${q.pista}${q.explicacion}`, /undefined|NaN|null|Infinity/, donde);
    });
});

test('leer: los bloques que se ven suman exactamente la respuesta; los ceros dependen del nivel', () => {
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'leer') return;
        const m = q.material;
        assert.equal(m.modo, 'ver', 'al leer, los bloques son la pregunta: se ven con cualquier ayuda');
        assert.equal(m.cuenta.reduce((s, n, i) => s + n * 10 ** i, 0), q.respuesta);
        assert.ok(m.cuenta.every((n) => n >= 0 && n <= 9));
        const D = ESCALAS[c.grado].cifras;
        assert.equal(String(q.respuesta).length, D);
        if (D === 2) assert.ok([() => cerosDe(q.respuesta) === 0 && q.respuesta < 50, () => cerosDe(q.respuesta) === 0 && q.respuesta >= 50, () => cerosDe(q.respuesta) === 1][c.nivel - 1](), `${q.respuesta} nivel ${c.nivel}`);
        else assert.ok([() => cerosDe(q.respuesta) === 0, () => cerosDe(q.respuesta) === 1, () => cerosDe(q.respuesta) >= 2][c.nivel - 1](), `${q.respuesta} nivel ${c.nivel}`);
        vistas++;
    });
    assert.ok(vistas > 300);
});

test('armar: el número que describe el enunciado (leído de sus palabras) es la respuesta y los bloques a construir coinciden', () => {
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'armar') return;
        const partes = [...q.enunciado.matchAll(FRASE_COLUMNA)];
        const valor = partes.reduce((s, m) => s + Number(m[1]) * VALOR_COLUMNA[m[2]], 0);
        assert.equal(valor, q.respuesta, q.enunciado);
        assert.equal(partes.length, String(q.respuesta).length, 'se dice cada columna, también las que valen 0');
        if (c.apoyo === 'ninguno') assert.equal(q.material, null);
        else {
            assert.equal(q.material.modo, 'construir');
            assert.ok(q.material.cuenta.every((n) => n === 0), 'se empieza sin bloques');
            assert.equal(q.material.objetivo.reduce((s, n, i) => s + n * 10 ** i, 0), q.respuesta);
            // Se puede armar de verdad con el estado de bloques
            const e = new EstadoBloques({ columnas: q.material.columnas, inicial: q.material.cuenta });
            q.material.objetivo.forEach((n, col) => { for (let i = 0; i < n; i++) assert.equal(e.agregar(col), true); });
            assert.equal(e.coincideCon(q.material.objetivo), true);
            assert.equal(e.valor(), q.respuesta);
        }
        vistas++;
    });
    assert.ok(vistas > 200);
});

test('concordancia: «1 decena», «2 decenas», «0 unidades»', () => {
    assert.equal(cantidadDeColumna(1, 1), '1 decena');
    assert.equal(cantidadDeColumna(2, 1), '2 decenas');
    assert.equal(cantidadDeColumna(0, 0), '0 unidades');
    assert.equal(cantidadDeColumna(1, 0), '1 unidad');
    assert.equal(cantidadDeColumna(1, 3), '1 unidad de millar');
    assert.equal(cantidadDeColumna(3, 3), '3 unidades de millar');
    assert.equal(descomposicionEnPalabras(307), '3 centenas, 0 decenas y 7 unidades');
    assert.equal(descomposicionEnPalabras(40), '4 decenas y 0 unidades');
    assert.equal(formatoNumero(9999), '9999');
    assert.equal(formatoNumero(12345), '12 345');
    assert.equal(formatoNumero(123456), '123 456');
});

test('posición: se recalcula el valor de la cifra, la suma de valores y el reagrupado a partir del texto', () => {
    const vistos = { 1: 0, 2: 0, 3: 0 };
    paraTodas((q, c) => {
        if (c.habilidad !== 'posicion') return;
        vistos[c.nivel]++;
        const t = SIN_FINO(q.enunciado);
        if (c.nivel === 1) {
            const m = /En el número (\d+), ¿qué valor tiene la cifra (\d)\?/.exec(t);
            assert.ok(m, t);
            const lugar = m[1].length - 1 - m[1].indexOf(m[2]);
            assert.equal(m[1].split(m[2]).length - 1, 1, 'la cifra aparece una sola vez (si no, habría dos respuestas)');
            assert.equal(q.respuesta, Number(m[2]) * 10 ** lugar, t);
        } else if (c.nivel === 2) {
            const m = /¿Qué número es (.+)\?/.exec(t);
            const suma = m[1].split(' + ').reduce((s, x) => s + Number(x), 0);
            assert.equal(q.respuesta, suma, t);
            assert.equal(q.material, null, 'los bloques regalarían la respuesta');
        } else {
            const partes = [...t.matchAll(FRASE_COLUMNA)];
            assert.equal(partes.length, 2, t);
            assert.equal(q.respuesta, partes.reduce((s, m) => s + Number(m[1]) * VALOR_COLUMNA[m[2]], 0), t);
            assert.ok(Number(partes[1][1]) >= 10, 'la columna de abajo se pasa de 9: hay que reagrupar');
        }
    });
    assert.ok(vistos[1] > 100 && vistos[2] > 100 && vistos[3] > 100);
});

test('llevada: la suma, los bloques de partida y la cantidad de llevadas son los que dice el nivel', () => {
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'llevada') return;
        const m = /^(\d+) \+ (\d+) = \?$/.exec(q.enunciado);
        assert.ok(m, q.enunciado);
        const [a, b] = [Number(m[1]), Number(m[2])];
        assert.equal(q.respuesta, a + b);
        const D = ESCALAS[c.grado].cifrasOp;
        assert.ok(a + b < 10 ** D && a >= 10 ** (D - 1), 'cabe en las columnas');
        const llevadas = llevadasIndependiente(a, b);
        if (c.nivel === 1) assert.ok(b < 10 && llevadas === 1, `${a}+${b}`);
        if (c.nivel === 2) assert.ok(b >= 10 && llevadas === 1, `${a}+${b}`);
        if (c.nivel === 3) assert.ok(D >= 3 ? llevadas >= 2 : llevadas === 1, `${a}+${b}`);
        assert.equal(contarLlevadas(a, b), llevadas, 'la función del módulo coincide con el cálculo independiente');
        if (c.apoyo === 'ninguno') { assert.equal(q.material, null); return; }
        const mat = q.material;
        assert.equal(mat.modo, 'juntar');
        // Las columnas de partida son las SUMAS de las cifras de a y de b, sin cambiar nada
        mat.cuenta.forEach((n, i) => assert.equal(n, Math.floor(a / 10 ** i) % 10 + Math.floor(b / 10 ** i) % 10, `columna ${i}`));
        // Se puede resolver de verdad: se cambia 10 por 1 hasta que no quede ninguna columna con 10 o más
        const e = new EstadoBloques({ columnas: mat.columnas, inicial: mat.cuenta });
        assert.equal(e.normalizado, false, 'al empezar hay que cambiar algo');
        let cambios = 0;
        for (let col = 0; col < mat.columnas; col++) while (e.cuenta[col] >= 10 && e.juntar(col)) cambios++;
        assert.equal(e.normalizado, true);
        assert.equal(e.valor(), a + b);
        assert.equal(cambios, llevadas, 'tantos cambios como llevadas');
        vistas++;
    });
    assert.ok(vistas > 250);
});

test('préstamo: la resta, los bloques y los cambios necesarios; siempre se puede resolver con las reglas del material', () => {
    /** Quita `n` bloques de la columna `col`, cambiando 1 por 10 de la columna de la izquierda las veces que haga falta. */
    function quitarEn(e, col, n) {
        for (let i = 0; i < n; i++) {
            if (e.cuenta[col] === 0) {
                let alta = col + 1;
                while (alta < e.columnas && e.cuenta[alta] === 0) alta++;
                assert.ok(alta < e.columnas, 'siempre hay una columna de la izquierda con bloques');
                for (let k = alta; k > col; k--) assert.equal(e.separar(k), true);
            }
            assert.equal(e.quitar(col), true);
        }
    }
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'prestamo') return;
        const m = /^(\d+) − (\d+) = \?$/.exec(q.enunciado);
        assert.ok(m, q.enunciado);
        const [a, b] = [Number(m[1]), Number(m[2])];
        assert.equal(q.respuesta, a - b);
        assert.ok(a > b);
        const D = ESCALAS[c.grado].cifrasOp;
        assert.equal(String(a).length, D);
        const prestamos = prestamosIndependiente(a, b);
        if (c.nivel === 1) assert.ok(b < 10 && prestamos === 1, `${a}-${b}`);
        if (c.nivel === 2) assert.ok(b >= 10 && prestamos === 1, `${a}-${b}`);
        if (c.nivel === 3) assert.ok(D >= 3 ? prestamos >= 2 : prestamos === 1, `${a}-${b}`);
        assert.equal(contarPrestamos(a, b), prestamos);
        if (c.apoyo === 'ninguno') { assert.equal(q.material, null); return; }
        const mat = q.material;
        assert.equal(mat.modo, 'quitar');
        mat.cuenta.forEach((n, i) => assert.equal(n, Math.floor(a / 10 ** i) % 10));
        mat.quitar.forEach((n, i) => assert.equal(n, Math.floor(b / 10 ** i) % 10));
        const e = new EstadoBloques({ columnas: mat.columnas, inicial: mat.cuenta });
        for (let col = 0; col < mat.columnas; col++) quitarEn(e, col, mat.quitar[col]);
        assert.equal(e.quitoExactamente(mat.quitar), true);
        assert.equal(e.valorQuitado(), b);
        assert.equal(e.valor(), a - b);
        vistas++;
    });
    assert.ok(vistas > 250);
});

test('errores típicos: se ofrecen siempre en llevada y préstamo, y no son la respuesta', () => {
    for (let semilla = 1; semilla <= 200; semilla++) {
        for (const nivel of NIVELES) {
            const s = generarPregunta({ grado: 4, habilidad: 'llevada', nivel, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
            const [a, b] = s.enunciado.match(/\d+/g).map(Number);
            assert.ok(s.opciones.some((o) => o.id === sumaSinLlevar(a, b)), `olvidar la llevada: ${s.enunciado}`);
            assert.notEqual(sumaSinLlevar(a, b), a + b);
            const t = generarPregunta({ grado: 4, habilidad: 'prestamo', nivel, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
            const [x, y] = t.enunciado.match(/\d+/g).map(Number);
            assert.ok(t.opciones.some((o) => o.id === restaAlReves(x, y)), `restar al revés: ${t.enunciado}`);
            assert.notEqual(restaAlReves(x, y), x - y);
        }
    }
});

test('habilidades por grado, errores de uso y reproducibilidad', () => {
    assert.deepEqual(Object.keys(habilidadesParaGrado(1)), ['leer', 'armar']);
    assert.ok(Object.keys(habilidadesParaGrado(6)).includes('prestamo'));
    assert.throws(() => generarPregunta({ grado: 1, habilidad: 'llevada', nivel: 1 }), /no existe en el grado/);
    assert.throws(() => generarPregunta({ grado: 3, habilidad: 'otra', nivel: 1 }), /desconocida/);
    assert.equal(generarPregunta({ grado: 99, habilidad: 'posicion', nivel: 99, aleatorio: crearAleatorioSembrado(1) }).habilidad, 'posicion');
    const uno = (s) => generarPregunta({ grado: 3, habilidad: 'llevada', nivel: 3, aleatorio: crearAleatorioSembrado(s), apoyo: 'completo' });
    assert.deepEqual(uno(9), uno(9));
    assert.ok(new Set(Array.from({ length: 40 }, (_, i) => uno(i + 1).enunciado)).size > 25);
});

// ---------- Partida y lecciones ----------

const equivocada = (q) => q.opciones.find((o) => o.id !== q.respuesta).id;

test('partida: la ayuda se retira por habilidad y la misión de inicio no lleva ayuda', () => {
    const p = new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(4), total: 40 });
    const vistos = [];
    while (p.hayMasPreguntas) {
        const { pregunta } = p.iniciarPregunta(0);
        vistos.push(pregunta.apoyo);
        p.responder(pregunta.respuesta);
    }
    assert.equal(vistos[0], 'completo');
    assert.ok(vistos.includes('ninguno'));

    for (let semilla = 1; semilla <= 20; semilla++) {
        const az = crearAleatorioSembrado(semilla);
        const m = new Partida({ grado: 6, aleatorio: az, colocacion: { gradoMin: 1, gradoMax: 6 } });
        while (m.hayMasPreguntas) {
            const { pregunta } = m.iniciarPregunta(0);
            assert.equal(pregunta.apoyo, 'ninguno');
            if (pregunta.habilidad !== 'leer') assert.equal(pregunta.material, null);
            m.responder(az() < 0.5 ? pregunta.respuesta : equivocada(pregunta));
        }
        assert.deepEqual(m.apoyos, {});
    }
});

function revisarHazlos(leccion) {
    const OPS = { '+': (x, y) => x + y, '−': (x, y) => x - y, '×': (x, y) => x * y };
    for (const paso of leccion.pasos) {
        if (!paso.hazlo) continue;
        const m = /^(\d+) ([+−×]) (\d+) = \?$/.exec(paso.hazlo.enunciado);
        assert.ok(m, `forma inesperada: ${paso.hazlo.enunciado}`);
        const esperado = OPS[m[2]](Number(m[1]), Number(m[3]));
        assert.equal(paso.hazlo.respuesta, esperado, paso.hazlo.enunciado);
        assert.ok(paso.hazlo.opciones.includes(esperado));
        assert.ok(!paso.texto.includes(paso.hazlo.enunciado.replace('?', String(esperado))), `trae la respuesta: ${paso.texto}`);
        assert.ok(!new RegExp(`= ${esperado}(?![\\d.])`).test(paso.texto), `trae «= ${esperado}»: ${paso.texto}`);
    }
}

test('lecciones propias: todas las habilidades y niveles dan una lección válida con «hazlo» correctos', () => {
    let lecciones = 0;
    for (const grado of GRADOS) {
        const p = new Partida({ grado, aleatorio: crearAleatorioSembrado(grado * 17), total: 60 });
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
    assert.ok(lecciones >= 300);
    assert.equal(leccionBloques('otra', { n: 1 }), null);
    assert.equal(leccionBloques('leer', null), null);
});

test('lección de préstamo con ceros en medio (503 − 128): los pasos hablan del cambio en cadena', () => {
    const l = leccionBloques('prestamo', { a: 503, b: 128 });
    validarLeccion(l);
    revisarHazlos(l);
    const texto = l.pasos.map((p) => p.texto).join(' ');
    assert.match(texto, /se cambia 1 bloque de la columna siguiente por 10/);
    assert.match(texto, /375/);
    assert.doesNotMatch(texto, /hay -/, 'nunca «hay -1»');
});
