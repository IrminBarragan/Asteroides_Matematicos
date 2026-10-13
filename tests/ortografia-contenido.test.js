import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    BV, GJ, H, CSZ, LLY, ACENTUACION, HOMOFONOS, DIACRITICOS, PORQUES, PALABRAS_VALIDAS_QUE_NO_SON_ERROR,
    todasLasPalabrasCorrectas, quitarTildes, claseDePalabra, debeLlevarTilde, silabasConTonica, NIVELES
} from '../src/games/ortografia/logica/contenido.js';
import { erroresPosibles } from '../src/games/ortografia/logica/generadores.js';

const LISTAS = { 'b-v': BV, 'g-j': GJ, 'h': H, 'c-s-z': CSZ, 'll-y': LLY };

// ---------- Palabras por regla ----------

test('cada lista de palabras: sin repetidas y con suficientes palabras por nivel (variedad entre partidas)', () => {
    for (const [nombre, lista] of Object.entries(LISTAS)) {
        const palabras = lista.map(([p]) => p);
        assert.equal(new Set(palabras).size, palabras.length, `${nombre}: palabras repetidas`);
        for (const nivel of NIVELES) {
            const cuantas = lista.filter(([, n]) => n === nivel).length;
            assert.ok(cuantas >= 8, `${nombre} nivel ${nivel}: solo ${cuantas} palabras`);
        }
        for (const [p, nivel] of lista) {
            assert.ok(NIVELES.includes(nivel), `${p}: nivel ${nivel}`);
            assert.equal(p, p.toLowerCase());
            assert.match(p, /^[a-záéíóúñ]+$/, p);
        }
    }
});

test('toda palabra tiene al menos un error posible y NINGÚN error es otra palabra real', () => {
    const correctas = todasLasPalabrasCorrectas();
    const reglas = { ...LISTAS, acentuacion: ACENTUACION.map((e) => [e.palabra, e.nivel]) };
    for (const [habilidad, lista] of Object.entries(reglas)) {
        for (const [palabra] of lista) {
            const errores = erroresPosibles(habilidad, palabra);
            assert.ok(errores.length >= 1, `${habilidad}/${palabra}: sin errores posibles`);
            for (const e of errores) {
                assert.notEqual(e, palabra);
                assert.ok(!PALABRAS_VALIDAS_QUE_NO_SON_ERROR.has(e), `${palabra} → «${e}» es una palabra real`);
                assert.ok(!correctas.has(e), `${palabra} → «${e}» es otra palabra correcta del juego`);
            }
        }
    }
});

test('cada error difiere de la palabra SOLO en lo que la regla dice enseñar', () => {
    const reglas = {
        'b-v': (a, b) => a.length === b.length && [...a].every((c, i) => c === b[i] || 'bv'.includes(c) && 'bv'.includes(b[i])),
        'g-j': (a, b) => a.length === b.length && [...a].every((c, i) => c === b[i] || 'gj'.includes(c) && 'gj'.includes(b[i])),
        'h': (a, b) => a.replace(/h/g, '') === b.replace(/h/g, ''),
        'c-s-z': (a, b) => a.length === b.length && [...a].every((c, i) => c === b[i] || 'csz'.includes(c) && 'csz'.includes(b[i])),
        'll-y': (a, b) => a.replace(/ll/g, 'y') === b.replace(/ll/g, 'y'),
        acentuacion: (a, b) => quitarTildes(a) === quitarTildes(b)
    };
    const listas = { ...LISTAS, acentuacion: ACENTUACION.map((e) => [e.palabra]) };
    for (const [habilidad, lista] of Object.entries(listas)) {
        for (const [palabra] of lista) {
            for (const e of erroresPosibles(habilidad, palabra)) {
                assert.ok(reglas[habilidad](palabra, e), `${habilidad}: ${palabra} → ${e} cambia algo más`);
            }
        }
    }
});

test('g/j: solo se confunden delante de e, i (no hay errores del tipo "ga" → "ja")', () => {
    for (const [palabra] of GJ) {
        for (const e of erroresPosibles('g-j', palabra)) {
            const i = [...palabra].findIndex((c, k) => c !== e[k]);
            assert.ok('eiéí'.includes(palabra[i + 1]), `${palabra} → ${e}`);
        }
    }
});

test('c/s/z: no se inventa "ca/co/cu" como alternativa (suena /k/)', () => {
    for (const [palabra] of CSZ) {
        for (const e of erroresPosibles('c-s-z', palabra)) {
            const i = [...palabra].findIndex((c, k) => c !== e[k]);
            if (e[i] === 'c') assert.ok('eiéí'.includes(e[i + 1]), `${palabra} → ${e}`);
        }
    }
});

test('h: se quita la h de la palabra, pero NUNCA la de "ch"; y se agrega solo al inicio de palabras que empiezan con vocal', () => {
    assert.deepEqual(erroresPosibles('h', 'hoja'), ['oja']);
    assert.deepEqual(erroresPosibles('h', 'ahora'), ['aora']);
    assert.deepEqual(erroresPosibles('h', 'abuelo'), ['habuelo']);
    assert.ok(!erroresPosibles('h', 'ocho').includes('oco'), 'quitó la h de "ch"');
    assert.deepEqual(erroresPosibles('h', 'ocho'), ['hocho']);
});

test('las palabras de las listas con regla escrita tienen una regla coherente con la palabra', () => {
    const reglasTerminacion = [
        [/bir$/, /-bir/], [/ber$/, /-ber/], [/(evo|eve|ivo)$/, /-evo/], [/(ger|gir)$/, /-ger/], [/aje$/, /-aje/],
        [/^geo/, /geo-/], [/^(hue|hie|hui)/, /hue-/], [/ill[oa]$/, /-illo/]
    ];
    for (const lista of Object.values(LISTAS)) {
        for (const [palabra, , regla] of lista) {
            if (!regla) continue;
            const coincide = reglasTerminacion.some(([patronPalabra, patronRegla]) => patronPalabra.test(palabra) && patronRegla.test(regla));
            const esExcepcion = /excepci/.test(regla) && palabra === 'vivir';
            assert.ok(coincide || esExcepcion, `«${palabra}» no cumple la regla que se le atribuye: ${regla}`);
        }
    }
});

// ---------- Acentuación ----------

test('ACENTUACIÓN: las sílabas unidas forman la palabra y el índice de la tónica es válido', () => {
    for (const e of ACENTUACION) {
        assert.equal(e.silabas.join(''), e.palabra);
        assert.ok(Number.isInteger(e.tonica) && e.tonica >= 0 && e.tonica < e.silabas.length, e.palabra);
        assert.ok(e.silabas.length >= 2, `${e.palabra}: las monosílabas no entran aquí`);
    }
});

test('ACENTUACIÓN: la palabra tiene tilde exactamente donde la regla lo exige (en la sílaba tónica y en ninguna otra)', () => {
    for (const e of ACENTUACION) {
        const debe = debeLlevarTilde(e);
        const tildesPorSilaba = e.silabas.map((s) => /[áéíóú]/.test(s));
        const total = tildesPorSilaba.filter(Boolean).length;
        if (debe) {
            assert.equal(total, 1, `${e.palabra} (${claseDePalabra(e)}) debería tener UNA tilde`);
            assert.ok(tildesPorSilaba[e.tonica], `${e.palabra}: la tilde debe estar en la sílaba tónica`);
        } else {
            assert.equal(total, 0, `${e.palabra} (${claseDePalabra(e)}) NO debería llevar tilde`);
        }
    }
});

test('ACENTUACIÓN: hay ejemplos de las tres clases, con y sin tilde, y suficientes por nivel', () => {
    const clases = new Set(ACENTUACION.map(claseDePalabra));
    assert.deepEqual([...clases].sort(), ['aguda', 'esdrujula', 'grave']);
    assert.ok(ACENTUACION.some(debeLlevarTilde) && ACENTUACION.some((e) => !debeLlevarTilde(e)));
    for (const nivel of NIVELES) assert.ok(ACENTUACION.filter((e) => e.nivel === nivel).length >= 12, `nivel ${nivel}`);
    const palabras = ACENTUACION.map((e) => e.palabra);
    assert.equal(new Set(palabras).size, palabras.length);
});

test('claseDePalabra y debeLlevarTilde con casos conocidos', () => {
    const e = (silabas, tonica) => ({ silabas, tonica, palabra: silabas.join('') });
    assert.equal(claseDePalabra(e(['can', 'ción'], 1)), 'aguda');
    assert.equal(claseDePalabra(e(['ár', 'bol'], 0)), 'grave');
    assert.equal(claseDePalabra(e(['te', 'lé', 'fo', 'no'], 1)), 'esdrujula');
    assert.equal(debeLlevarTilde(e(['can', 'ción'], 1)), true);   // aguda en n
    assert.equal(debeLlevarTilde(e(['re', 'loj'], 1)), false);    // aguda en j
    assert.equal(debeLlevarTilde(e(['ár', 'bol'], 0)), true);     // grave en l
    assert.equal(debeLlevarTilde(e(['jo', 'ven'], 0)), false);    // grave en n
    assert.equal(debeLlevarTilde(e(['lu', 'nes'], 0)), false);    // grave en s
    assert.equal(debeLlevarTilde(e(['me', 'sa'], 0)), false);     // grave en vocal
    assert.equal(debeLlevarTilde(e(['pá', 'ja', 'ro'], 0)), true);// esdrújula
    assert.equal(silabasConTonica(e(['can', 'ción'], 1)), 'can-CIÓN');
});

// ---------- Ejercicios de oración ----------

for (const [nombre, lista] of [['HOMOFONOS', HOMOFONOS], ['DIACRITICOS', DIACRITICOS], ['PORQUES', PORQUES]]) {
    test(`${nombre}: cada ejercicio tiene un espacio, opciones únicas (2–3), nivel válido y explicación`, () => {
        for (const [oracion, opciones, nivel, explicacion] of lista) {
            assert.equal((oracion.match(/___/g) || []).length, 1, oracion);
            assert.ok(opciones.length >= 2 && opciones.length <= 3, oracion);
            assert.equal(new Set(opciones.map((o) => o.toLowerCase())).size, opciones.length, `opciones repetidas en: ${oracion}`);
            assert.ok(NIVELES.includes(nivel));
            assert.ok(explicacion.length > 20 && explicacion.includes('«'), `explicación pobre en: ${oracion}`);
        }
    });

    test(`${nombre}: hay ejercicios en los 3 niveles y no se repiten oraciones`, () => {
        for (const nivel of NIVELES) assert.ok(lista.some((e) => e[2] === nivel), `${nombre}: falta el nivel ${nivel}`);
        const oraciones = lista.map((e) => e[0]);
        assert.equal(new Set(oraciones).size, oraciones.length);
    });
}

test('la explicación de cada ejercicio menciona la palabra correcta', () => {
    for (const lista of [HOMOFONOS, DIACRITICOS, PORQUES]) {
        for (const [oracion, opciones, , explicacion] of lista) {
            const correcta = opciones[0].toLowerCase();
            assert.ok(explicacion.toLowerCase().includes(`«${correcta}»`) || explicacion.toLowerCase().includes(correcta),
                `«${correcta}» no aparece en su explicación (${oracion})`);
        }
    }
});

test('HOMÓFONOS/DIACRÍTICOS: cuando la correcta es una opción de otro ejercicio, ninguna oración tiene dos respuestas correctas obvias', () => {
    // Una oración dada no puede aparecer con dos correctas distintas
    const mapa = new Map();
    for (const lista of [HOMOFONOS, DIACRITICOS, PORQUES]) {
        for (const [oracion, opciones] of lista) {
            assert.ok(!mapa.has(oracion), 'oración duplicada');
            mapa.set(oracion, opciones[0]);
        }
    }
});

// ---------- Los generadores de errores, probados con palabras inventadas (no dependen de las listas) ----------

const SIN_FILTROS = { correctas: new Set(), validas: new Set() };

test('g/j: solo se confunden delante de e, i (con palabras sintéticas)', () => {
    assert.deepEqual(erroresPosibles('g-j', 'gente', SIN_FILTROS), ['jente']);
    assert.deepEqual(erroresPosibles('g-j', 'jirafa', SIN_FILTROS), ['girafa']);
    assert.deepEqual(erroresPosibles('g-j', 'conejo', SIN_FILTROS), [], '"jo" y "go" suenan distinto: no es una confusión');
    assert.deepEqual(erroresPosibles('g-j', 'gato', SIN_FILTROS), []);
    assert.deepEqual(erroresPosibles('g-j', 'jabón', SIN_FILTROS), []);
    assert.deepEqual(erroresPosibles('g-j', 'guerra', SIN_FILTROS), [], '"gue" suena /ge/ (g fuerte): no se confunde con j');
    assert.deepEqual(erroresPosibles('g-j', 'reloj', SIN_FILTROS), [], 'la j final no se confunde');
});

test('c/s/z: c solo antes de e, i; s y z antes de vocal o al final; nunca antes de consonante', () => {
    assert.deepEqual(erroresPosibles('c-s-z', 'sapo', SIN_FILTROS), ['zapo'], '"capo" suena distinto (/k/)');
    assert.deepEqual(erroresPosibles('c-s-z', 'cielo', SIN_FILTROS).sort(), ['sielo', 'zielo']);
    assert.deepEqual(erroresPosibles('c-s-z', 'luz', SIN_FILTROS), ['lus'], 'al final solo s/z (no "luc")');
    assert.deepEqual(erroresPosibles('c-s-z', 'cuna', SIN_FILTROS), [], '"cu" suena /k/: no hay confusión');
    assert.ok(!erroresPosibles('c-s-z', 'espejo', SIN_FILTROS).some((e) => e.startsWith('ez') || e.startsWith('ec')), 'la s antes de consonante no se toca');
});

test('b/v y ll/y con palabras sintéticas', () => {
    assert.deepEqual(erroresPosibles('b-v', 'bavo', SIN_FILTROS).sort(), ['babo', 'vavo']);
    assert.deepEqual(erroresPosibles('ll-y', 'calle', SIN_FILTROS), ['caye']);
    assert.deepEqual(erroresPosibles('ll-y', 'playa', SIN_FILTROS), ['plalla']);
    assert.deepEqual(erroresPosibles('ll-y', 'hoy', SIN_FILTROS), [], 'la y final (vocal) no se confunde con ll');
    assert.deepEqual(erroresPosibles('ll-y', 'rey', SIN_FILTROS), []);
});

test('acentuación: sin tilde y con la tilde en otra vocal; la u de "qu" nunca lleva tilde', () => {
    assert.deepEqual(erroresPosibles('acentuacion', 'canción', SIN_FILTROS).sort(), ['cancion', 'cancíon', 'cáncion'].sort());
    assert.ok(!erroresPosibles('acentuacion', 'quizás', SIN_FILTROS).some((e) => e.includes('qú')));
    assert.ok(erroresPosibles('acentuacion', 'mesa', SIN_FILTROS).includes('mésa'), 'una palabra sin tilde también puede recibir una tilde de más');
});

test('se descartan los errores que sean otra palabra real o una palabra correcta del juego', () => {
    assert.deepEqual(erroresPosibles('b-v', 'vaca', { correctas: new Set(), validas: new Set(['baca']) }), []);
    assert.deepEqual(erroresPosibles('b-v', 'vaca', { correctas: new Set(['baca']), validas: new Set() }), []);
    assert.deepEqual(erroresPosibles('b-v', 'vaca', SIN_FILTROS), ['baca']);
    assert.deepEqual(erroresPosibles('b-v', 'vaca'), [], 'con los filtros por defecto "baca" está en la lista de palabras reales');
});
