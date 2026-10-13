import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    PALABRAS_ILUSTRADAS, PALABRAS_POR_SILABAS, RIMAS, SINONIMOS, ANTONIMOS, normalizar,
    candidatosImagenPalabra, candidatosSilabaInicial, candidatosConteoSilabas,
    candidatosRimas, candidatosSinonimos, candidatosAntonimos
} from '../src/games/memorama/logica/contenido.js';
import { IDS_ILUSTRACIONES } from '../src/ui/ilustraciones.js';

const todasLasPalabras = [...PALABRAS_ILUSTRADAS, ...PALABRAS_POR_SILABAS];

test('las sílabas de cada palabra, unidas, forman exactamente la palabra', () => {
    for (const p of todasLasPalabras) {
        assert.equal(p.silabas.join(''), p.texto, `${p.texto}: ${p.silabas.join('-')}`);
        assert.ok(p.silabas.every((s) => s.length > 0));
    }
});

test('ninguna palabra está repetida en las listas de palabras', () => {
    const textos = todasLasPalabras.map((p) => p.texto);
    assert.equal(new Set(textos).size, textos.length, 'hay palabras repetidas');
});

test('hay palabras para contar de 1 a 5 sílabas, y varias de cada cantidad (variedad entre partidas)', () => {
    for (let n = 1; n <= 5; n++) {
        const cuantas = todasLasPalabras.filter((p) => p.silabas.length === n).length;
        assert.ok(cuantas >= 3, `solo ${cuantas} palabras con ${n} sílaba(s)`);
    }
    assert.ok(todasLasPalabras.every((p) => p.silabas.length <= 5));
});

test('cada palabra ilustrada tiene un dibujo que realmente existe', () => {
    for (const p of PALABRAS_ILUSTRADAS) assert.ok(IDS_ILUSTRACIONES.includes(p.imagen), `${p.texto}: falta "${p.imagen}"`);
});

test('RIMAS: las dos palabras terminan en la rima indicada (sin acentos) y no son la misma', () => {
    for (const r of RIMAS) {
        assert.ok(r.rima.length >= 2, r.rima);
        assert.notEqual(r.a, r.b);
        assert.ok(normalizar(r.a).endsWith(normalizar(r.rima)), `${r.a} no termina en ${r.rima}`);
        assert.ok(normalizar(r.b).endsWith(normalizar(r.rima)), `${r.b} no termina en ${r.rima}`);
    }
});

test('RIMAS: ninguna palabra rima con una pareja de OTRO grupo (si no, una carta tendría dos parejas)', () => {
    for (const p of RIMAS) {
        for (const q of RIMAS) {
            if (normalizar(p.rima) === normalizar(q.rima)) continue;
            for (const palabra of [q.a, q.b]) {
                assert.ok(!normalizar(palabra).endsWith(normalizar(p.rima)),
                    `"${palabra}" (${q.rima}) también termina en «${p.rima}» (${p.a}/${p.b})`);
            }
        }
    }
});

test('RIMAS: ninguna palabra aparece en dos parejas distintas', () => {
    const palabras = RIMAS.flatMap((r) => [r.a, r.b]);
    assert.equal(new Set(palabras).size, palabras.length);
});

for (const [nombre, lista] of [['SINONIMOS', SINONIMOS], ['ANTONIMOS', ANTONIMOS]]) {
    test(`${nombre}: ninguna palabra aparece en dos parejas y a ≠ b`, () => {
        const palabras = lista.flatMap((p) => [p.a, p.b]);
        assert.equal(new Set(palabras).size, palabras.length, 'una palabra aparece en dos parejas');
        for (const p of lista) assert.notEqual(p.a, p.b);
    });

    test(`${nombre}: hay al menos 6 grupos distintos (el tablero más grande necesita 6 parejas de grupos distintos)`, () => {
        assert.ok(new Set(lista.map((p) => p.grupo)).size >= 6);
    });
}

test('SINONIMOS y ANTONIMOS no se contradicen: ninguna pareja es sinónimo y antónimo a la vez', () => {
    const clave = (p) => [normalizar(p.a), normalizar(p.b)].sort().join('|');
    const sin = new Set(SINONIMOS.map(clave));
    for (const p of ANTONIMOS) assert.ok(!sin.has(clave(p)), `${p.a}/${p.b}`);
});

test('todos los candidatos tienen id único por habilidad, grupo, dos contenidos y una explicación', () => {
    const habilidades = {
        'imagen-palabra': candidatosImagenPalabra(),
        'silaba-inicial-1': candidatosSilabaInicial(1),
        'silaba-inicial-2': candidatosSilabaInicial(2),
        'conteo-silabas': candidatosConteoSilabas(),
        rimas: candidatosRimas(), sinonimos: candidatosSinonimos(), antonimos: candidatosAntonimos()
    };
    for (const [nombre, lista] of Object.entries(habilidades)) {
        assert.equal(new Set(lista.map((c) => c.id)).size, lista.length, `${nombre}: ids repetidos`);
        for (const c of lista) {
            assert.ok(c.grupo && c.a && c.b && c.explicacion.length >= 8, `${nombre}: ${c.id}`);
            assert.ok(!/undefined|NaN/.test(c.explicacion + c.a.texto + c.b.texto));
        }
    }
});

test('sílaba inicial: no incluye palabras de una sola sílaba y el grupo es la primera sílaba', () => {
    for (const grado of [1, 2]) {
        for (const c of candidatosSilabaInicial(grado)) {
            assert.equal(c.b.tipo, 'silaba');
            assert.equal(c.grupo, normalizar(c.b.texto));
            assert.ok(c.explicacion.includes('-'), 'debe mostrar la separación en sílabas');
        }
    }
    assert.ok(candidatosSilabaInicial(1).every((c) => c.a.tipo === 'imagen'), '1.º usa dibujos');
    assert.ok(candidatosSilabaInicial(2).every((c) => c.a.tipo === 'palabra'), '2.º usa palabras');
});

test('conteo de sílabas: el número de la carta coincide con el de la palabra', () => {
    for (const c of candidatosConteoSilabas()) {
        const guardadas = todasLasPalabras.find((p) => `cnt-${normalizar(p.texto)}` === c.id);
        assert.equal(c.b.texto, String(guardadas.silabas.length));
        assert.equal(c.grupo, c.b.texto);
    }
});

test('imagen-palabra: cada pareja une el dibujo de la palabra con esa misma palabra', () => {
    for (const c of candidatosImagenPalabra()) {
        assert.equal(c.a.tipo, 'imagen');
        assert.equal(c.a.texto, c.b.texto);
        assert.match(c.explicacion, /^Es (un|una) /);
    }
});
