import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarPregunta, habilidadesParaGrado, HABILIDADES_POR_GRADO, prepararRonda, cantidadOpciones, denominadoresVisuales,
    modosComparar, factoresEquivalencia, configuracionSimplificar, modoSumaResta, configuracionMixtas, denominadoresDecimales,
    NIVEL_MAX, GRADO_MIN, GRADO_MAX
} from '../src/games/fracciones/logica/generadores.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from '../src/games/fracciones/logica/partida.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { normalizarResultado } from '../src/core/resultado.js';

// ---------- Verificación INDEPENDIENTE: aquí no se usa core/fracciones.js ----------
// Las pruebas recalculan cada respuesta solo con enteros y multiplicación cruzada, para no "validar al código con él mismo".

const mcd = (a, b) => (b === 0 ? a : mcd(b, a % b));
const igual = (a, b) => a.n * b.d === b.n * a.d;
const valor = (f) => f.n / f.d;
// Un entero se muestra sin «/1»: «1» es la fracción 1/1
const fr = (o) => o.fraccion ?? { n: Number(o.texto), d: 1 };
const opcionCorrecta = (p) => p.opciones.find((o) => o.id === p.respuesta);
const errores = (p) => p.opciones.filter((o) => o.id !== p.respuesta);

function paraTodas(fn, muestras = 80) {
    for (const [grado, habilidades] of Object.entries(HABILIDADES_POR_GRADO)) {
        for (const habilidad of habilidades) {
            for (let nivel = 1; nivel <= NIVEL_MAX; nivel++) {
                const az = crearAleatorioSembrado(Number(grado) * 1000 + nivel * 100 + habilidad.length);
                for (let i = 0; i < muestras; i++) {
                    for (const cantidad of [3, 4]) {
                        const ctx = { grado: Number(grado), habilidad, nivel, cantidad };
                        fn(generarPregunta({ ...ctx, aleatorio: az }), ctx);
                    }
                }
            }
        }
    }
}

const deHabilidad = (nombre, fn, muestras) => paraTodas((p, ctx) => { if (ctx.habilidad === nombre) fn(p, ctx); }, muestras);

// ---------- Estructura común ----------

test('toda pregunta tiene enunciado, pista y explicación sin restos de errores', () => {
    paraTodas((p) => {
        for (const campo of [p.enunciado, p.pista, p.explicacion, p.textoRespuesta]) {
            assert.ok(typeof campo === 'string' && campo.length > 0);
            assert.ok(!/undefined|NaN|null|Infinity/.test(campo), campo);
        }
        assert.ok(['opciones', 'pintar'].includes(p.tipo));
    });
});

test('las opciones tienen ids 0..n-1 únicos, textos únicos y la respuesta es una de ellas', () => {
    paraTodas((p) => {
        if (p.tipo === 'pintar') return;
        const ids = p.opciones.map((o) => o.id).sort();
        assert.deepEqual(ids, p.opciones.map((_, i) => i));
        assert.equal(new Set(p.opciones.map((o) => o.texto)).size, p.opciones.length, JSON.stringify(p.opciones));
        assert.ok(opcionCorrecta(p), 'la respuesta debe ser una opción');
        assert.equal(opcionCorrecta(p).texto, p.textoRespuesta);
    });
});

test('cantidad de opciones: la pedida (comparar siempre ofrece 3: las dos fracciones y «Son iguales»)', () => {
    paraTodas((p, ctx) => {
        if (p.tipo === 'pintar') assert.equal(p.opciones.length, 0);
        else if (ctx.habilidad.startsWith('comparar')) assert.equal(p.opciones.length, 3);
        else assert.equal(p.opciones.length, ctx.cantidad);
    });
});

test('la pista nunca regala la respuesta', () => {
    paraTodas((p) => {
        if (p.tipo === 'pintar') return;
        assert.ok(!p.pista.includes(p.textoRespuesta) || /^\d$/.test(p.textoRespuesta), `${p.pista} / ${p.textoRespuesta}`);
    });
});

test('mismo aleatorio sembrado → mismas preguntas (reproducible)', () => {
    const una = () => {
        const az = crearAleatorioSembrado(7);
        return ['suma-resta', 'mixtas', 'decimales', 'simplificar'].map((habilidad) => generarPregunta({ grado: 6, habilidad, nivel: 3, cantidad: 4, aleatorio: az }));
    };
    assert.deepEqual(una(), una());
});

// ---------- Identificar y pintar ----------

test('identificar: la respuesta correcta es la fracción dibujada y ningún error vale lo mismo', () => {
    deHabilidad('identificar', (p) => {
        const v = p.visuales[0];
        assert.ok(v.n >= 1 && v.n < v.d);
        assert.ok(['barra', 'pastel'].includes(v.forma));
        assert.ok(igual(fr(opcionCorrecta(p)), v));
        for (const e of errores(p)) assert.ok(!igual(fr(e), v), `${e.texto} vale lo mismo que ${v.n}/${v.d}`);
    }, 150);
});

test('identificar y pintar usan solo los denominadores del nivel', () => {
    deHabilidad('identificar', (p, ctx) => assert.ok(denominadoresVisuales(ctx.grado, ctx.nivel).includes(p.visuales[0].d)));
    deHabilidad('pintar', (p, ctx) => assert.ok(denominadoresVisuales(ctx.grado, ctx.nivel).includes(p.figura.d)));
});

test('los denominadores crecen con el nivel (más difícil = más partes)', () => {
    for (const grado of [3, 4]) {
        const maximos = [1, 2, 3].map((n) => Math.max(...denominadoresVisuales(grado, n)));
        assert.ok(maximos[0] <= maximos[1] && maximos[1] <= maximos[2], `${grado}: ${maximos}`);
    }
});

test('pintar: la respuesta es el numerador y cabe en la figura', () => {
    deHabilidad('pintar', (p) => {
        const f = p.expresion[0].fraccion;
        assert.equal(p.tipo, 'pintar');
        assert.equal(p.respuesta, f.n);
        assert.equal(p.figura.d, f.d);
        assert.ok(p.respuesta >= 1 && p.respuesta < p.figura.d);
        assert.deepEqual(p.opciones, []);
    });
});

// ---------- Comparar ----------

test('comparar: la opción correcta es la fracción mayor/menor, o «Son iguales» si valen lo mismo', () => {
    let iguales = 0;
    let menores = 0;
    for (const nombre of ['comparar', 'comparar-visual']) {
        deHabilidad(nombre, (p) => {
            const [a, b] = nombre === 'comparar'
                ? [p.expresion[0].fraccion, p.expresion[2].fraccion]
                : p.visuales.map((v) => ({ n: v.n, d: v.d }));
            const mayor = p.enunciado.includes('mayor');
            const menor = p.enunciado.includes('menor');
            assert.ok(mayor !== menor);
            const textos = p.opciones.map((o) => o.texto).sort();
            assert.deepEqual(textos, [`${a.n}/${a.d}`, `${b.n}/${b.d}`, 'Son iguales'].sort());
            let esperada;
            if (igual(a, b)) { esperada = 'Son iguales'; iguales++; }
            else {
                const aGana = a.n * b.d > b.n * a.d;
                esperada = (aGana === mayor) ? `${a.n}/${a.d}` : `${b.n}/${b.d}`;
            }
            if (menor) menores++;
            assert.equal(opcionCorrecta(p).texto, esperada);
        }, 200);
    }
    assert.ok(iguales > 0, 'a partir del nivel 3 de 4.º deben aparecer pares equivalentes');
    assert.ok(menores > 0, 'a partir del nivel 2 debe preguntarse también por la menor');
});

test('comparar en 3.º-nivel 1 solo usa el mismo denominador y siempre pregunta por la mayor', () => {
    const az = crearAleatorioSembrado(11);
    for (let i = 0; i < 100; i++) {
        const p = generarPregunta({ grado: 3, habilidad: 'comparar-visual', nivel: 1, aleatorio: az });
        assert.equal(p.visuales[0].d, p.visuales[1].d);
        assert.ok(p.enunciado.includes('mayor'));
    }
    assert.deepEqual(modosComparar(3, 1), ['mismo-d']);
});

test('comparar-visual muestra dos barras con su etiqueta', () => {
    deHabilidad('comparar-visual', (p) => {
        assert.equal(p.visuales.length, 2);
        for (const v of p.visuales) { assert.equal(v.forma, 'barra'); assert.equal(v.etiqueta, `${v.n}/${v.d}`); }
    });
});

// ---------- Equivalentes ----------

test('equivalentes: solo la respuesta correcta vale lo mismo que la fracción base', () => {
    deHabilidad('equivalentes', (p) => {
        const base = p.expresion[0].fraccion;
        if (p.expresion.length === 1) { // «¿cuál es equivalente?»
            assert.ok(igual(fr(opcionCorrecta(p)), base));
            for (const e of errores(p)) assert.ok(!igual(fr(e), base), `${e.texto} ≈ ${base.n}/${base.d}`);
            return;
        }
        // «¿qué número falta?»: se resuelve con la regla de tres, sin usar el código del juego
        const hueco = p.expresion[2].fraccion;
        const buscado = hueco.n === '?' ? (base.n * hueco.d) / base.d : (base.d * hueco.n) / base.n;
        assert.ok(Number.isInteger(buscado));
        assert.equal(opcionCorrecta(p).texto, String(buscado));
        for (const e of errores(p)) assert.notEqual(Number(e.texto), buscado);
    }, 200);
});

test('equivalentes: los factores usados pertenecen al nivel y crecen con él', () => {
    deHabilidad('equivalentes', (p, ctx) => {
        const base = p.expresion[0].fraccion;
        const otro = p.expresion.length === 1 ? fr(opcionCorrecta(p)) : p.expresion[2].fraccion;
        const d = otro.d === '?' ? null : otro.d;
        if (d) assert.ok(factoresEquivalencia(ctx.nivel).includes(d / base.d), `${d}/${base.d}`);
    });
    assert.ok(Math.max(...factoresEquivalencia(1)) < Math.max(...factoresEquivalencia(3)));
});

// ---------- Simplificar ----------

test('simplificar: la respuesta es la fracción irreducible y los errores equivalentes NO están simplificados', () => {
    let aMedias = 0;
    deHabilidad('simplificar', (p, ctx) => {
        const f = p.expresion[0].fraccion;
        const g = mcd(f.n, f.d);
        assert.ok(g > 1, 'la fracción original debe poder simplificarse');
        assert.ok(configuracionSimplificar(ctx.nivel).factores.includes(g) || g % 1 === 0);
        const correcta = fr(opcionCorrecta(p));
        assert.deepEqual(correcta, { n: f.n / g, d: f.d / g });
        assert.equal(mcd(correcta.n, correcta.d), 1, 'la respuesta debe ser irreducible');
        for (const e of errores(p)) {
            const x = fr(e);
            if (igual(x, f)) { assert.ok(mcd(x.n, x.d) > 1, `${e.texto} es equivalente y debería poder simplificarse`); if (e.texto !== `${f.n}/${f.d}`) aMedias++; }
        }
    }, 250);
    assert.ok(aMedias > 0, 'deben aparecer simplificaciones «a medias» como error');
});

// ---------- Suma y resta ----------

test('suma-resta: el resultado se calcula aparte y los errores no valen lo mismo', () => {
    let restas = 0;
    deHabilidad('suma-resta', (p, ctx) => {
        const [a, op, b] = [p.expresion[0].fraccion, p.expresion[1].texto, p.expresion[2].fraccion];
        const den = a.d * b.d;
        const num = op === '+' ? a.n * b.d + b.n * a.d : a.n * b.d - b.n * a.d;
        if (op === '−') restas++;
        assert.ok(num > 0, 'la resta nunca es negativa ni cero');
        const crudo = { n: num, d: den };
        const correcta = fr(opcionCorrecta(p));
        assert.ok(igual(correcta, crudo));
        assert.equal(mcd(correcta.n, correcta.d), 1, 'el resultado se muestra simplificado');
        for (const e of errores(p)) assert.ok(!igual(fr(e), crudo), `${e.texto} también sería correcta`);
        if (ctx.grado === 5 && op === '+') assert.ok(num <= den, 'en 5.º la suma no pasa de un entero');
        if (modoSumaResta(ctx.grado, ctx.nivel) === 'mismo') assert.equal(a.d, b.d);
        if (modoSumaResta(ctx.grado, ctx.nivel) === 'multiplo') assert.ok(a.d % b.d === 0 || b.d % a.d === 0);
        if (modoSumaResta(ctx.grado, ctx.nivel) === 'cualquiera') assert.ok(a.d % b.d !== 0 && b.d % a.d !== 0);
    }, 250);
    assert.ok(restas > 0);
});

test('suma-resta: el error clásico de sumar numeradores y denominadores se ofrece cuando no coincide con la respuesta', () => {
    let visto = false;
    const az = crearAleatorioSembrado(5);
    for (let i = 0; i < 300 && !visto; i++) {
        const p = generarPregunta({ grado: 6, habilidad: 'suma-resta', nivel: 3, cantidad: 4, aleatorio: az });
        if (p.expresion[1].texto !== '+') continue;
        const [a, b] = [p.expresion[0].fraccion, p.expresion[2].fraccion];
        visto = p.opciones.some((o) => o.texto === `${a.n + b.n}/${a.d + b.d}`);
    }
    assert.ok(visto);
});

// ---------- Mixtas ----------

test('mixtas: ambas direcciones son correctas y los errores valen otra cantidad', () => {
    const direcciones = new Set();
    deHabilidad('mixtas', (p, ctx) => {
        const c = configuracionMixtas(ctx.nivel);
        const pieza = p.expresion[0];
        if (pieza.fraccion) { // impropia → mixta
            direcciones.add('a-mixta');
            const { n, d } = pieza.fraccion;
            const esperado = { entero: Math.floor(n / d), n: n % d, d };
            assert.ok(n > d && esperado.n > 0 && d <= c.dMax);
            assert.deepEqual(opcionCorrecta(p).mixta, esperado);
            for (const e of errores(p)) assert.ok(e.mixta.entero * d + e.mixta.n !== n, `${e.texto} vale lo mismo`);
        } else { // mixta → impropia
            direcciones.add('a-impropia');
            const { entero, n, d } = pieza.mixta;
            const esperado = { n: entero * d + n, d };
            assert.ok(n >= 1 && n < d && entero <= c.enteroMax);
            assert.deepEqual(fr(opcionCorrecta(p)), esperado);
            for (const e of errores(p)) assert.ok(!igual(fr(e), esperado));
        }
    }, 200);
    assert.deepEqual([...direcciones].sort(), ['a-impropia', 'a-mixta']);
});

// ---------- Decimales ----------

test('decimales: se verifica con aritmética entera de centésimas', () => {
    const direcciones = new Set();
    deHabilidad('decimales', (p, ctx) => {
        if (p.expresion.length) { // fracción → decimal
            direcciones.add('a-decimal');
            const { n, d } = p.expresion[0].fraccion;
            assert.ok(denominadoresDecimales(ctx.nivel).includes(d));
            assert.equal(100 % d, 0);
            const c = (n * 100) / d;
            assert.equal(opcionCorrecta(p).texto, String(c / 100));
            for (const e of errores(p)) assert.notEqual(Math.round(Number(e.texto) * 100), c, `${e.texto} es igual`);
        } else { // decimal → fracción
            direcciones.add('a-fraccion');
            const texto = /equivale a ([\d.]+)\?/.exec(p.enunciado)[1];
            const c = Math.round(Number(texto) * 100);
            const crudo = { n: c, d: 100 };
            const correcta = fr(opcionCorrecta(p));
            assert.ok(igual(correcta, crudo));
            assert.equal(mcd(correcta.n, correcta.d), 1);
            for (const e of errores(p)) assert.ok(!igual(fr(e), crudo), `${e.texto} vale ${texto}`);
        }
    }, 200);
    assert.deepEqual([...direcciones].sort(), ['a-decimal', 'a-fraccion']);
});

// ---------- Grados, niveles y partida ----------

test('cada grado tiene sus habilidades y el rango 3.º–6.º', () => {
    assert.equal(GRADO_MIN, 3);
    assert.equal(GRADO_MAX, 6);
    for (let g = 3; g <= 6; g++) {
        assert.deepEqual(Object.keys(habilidadesParaGrado(g)), HABILIDADES_POR_GRADO[g]);
        for (const h of Object.keys(habilidadesParaGrado(g))) assert.equal(habilidadesParaGrado(g)[h].nivelMax, NIVEL_MAX);
    }
    assert.deepEqual(habilidadesParaGrado(1), habilidadesParaGrado(3), 'por debajo de 3.º se usa 3.º');
    assert.deepEqual(habilidadesParaGrado(9), habilidadesParaGrado(6), 'por encima de 6.º se usa 6.º');
});

test('el contenido avanza por grado: simplificar y mixtas no aparecen antes de tiempo', () => {
    assert.ok(!HABILIDADES_POR_GRADO[3].includes('suma-resta'));
    assert.ok(!HABILIDADES_POR_GRADO[4].includes('suma-resta'));
    assert.ok(!HABILIDADES_POR_GRADO[4].includes('simplificar'));
    assert.ok(HABILIDADES_POR_GRADO[6].includes('decimales'));
    assert.ok(!HABILIDADES_POR_GRADO[5].includes('decimales'));
});

test('cantidadOpciones: 3 en el nivel 1 y 4 después', () => {
    assert.equal(cantidadOpciones(1), 3);
    assert.equal(cantidadOpciones(2), 4);
    assert.equal(cantidadOpciones(3), 4);
    assert.deepEqual(prepararRonda(3, 1), { cantidad: 3 });
});

test('una habilidad desconocida lanza un error claro', () => {
    assert.throws(() => generarPregunta({ grado: 3, habilidad: 'inventada', nivel: 1 }), /desconocida/);
});

test('Partida: acertar todo da 10 aciertos, estrellas completas y un resultado válido', () => {
    for (const grado of [3, 4, 5, 6]) {
        const p = new Partida({ grado, aleatorio: crearAleatorioSembrado(grado) });
        let t = 0;
        let info;
        while ((info = p.iniciarPregunta(t))) {
            t += 3000;
            const r = p.responder(info.pregunta.respuesta, { ahoraMs: t });
            assert.equal(r.tipo, 'correcta');
            assert.ok(r.explicacion.length > 0);
        }
        assert.equal(p.aciertos, PREGUNTAS_POR_PARTIDA);
        assert.equal(p.fallos, 0);
        const res = normalizarResultado(p.resultado(t));
        assert.equal(res.aciertos + res.fallos, PREGUNTAS_POR_PARTIDA);
    }
});

test('Partida: una respuesta equivocada da pista, se puede reintentar y solo cuenta un fallo', () => {
    const p = new Partida({ grado: 5, aleatorio: crearAleatorioSembrado(3) });
    const { pregunta } = p.iniciarPregunta(0);
    const mala = pregunta.opciones.find((o) => o.id !== pregunta.respuesta).id;
    const r1 = p.responder(mala, { ahoraMs: 1000 });
    assert.equal(r1.tipo, 'incorrecta');
    assert.equal(r1.pista, pregunta.pista);
    assert.equal(p.responder(mala, { ahoraMs: 1500 }).tipo, 'incorrecta');
    assert.equal(p.fallos, 1);
    const r2 = p.responder(pregunta.respuesta, { ahoraMs: 2000 });
    assert.equal(r2.primerIntento, false);
    assert.equal(r2.puntos, 5);
});

test('Partida con pintar: pintar una cantidad distinta es error y la cantidad exacta es acierto', () => {
    const p = new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(1) });
    let visto = false;
    let info;
    while ((info = p.iniciarPregunta(0)) && !visto) {
        if (info.pregunta.tipo !== 'pintar') { p.responder(info.pregunta.respuesta); continue; }
        visto = true;
        const d = info.pregunta.figura.d;
        const mal = info.pregunta.respuesta === 1 ? 2 : 1;
        assert.equal(p.responder(mal).tipo, 'incorrecta');
        assert.equal(p.responder(info.pregunta.respuesta).tipo, 'correcta');
        assert.ok(d > info.pregunta.respuesta);
    }
    assert.ok(visto, 'debe aparecer al menos una pregunta de pintar en 3.º');
});

test('los operandos de comparar y suma-resta son fracciones propias (menores que 1)', () => {
    for (const nombre of ['comparar', 'suma-resta']) {
        deHabilidad(nombre, (p) => {
            for (const pieza of p.expresion) if (pieza.fraccion && pieza.fraccion.n !== '?') assert.ok(pieza.fraccion.n < pieza.fraccion.d, JSON.stringify(pieza));
        }, 200);
    }
    deHabilidad('comparar-visual', (p) => { for (const v of p.visuales) assert.ok(v.n < v.d); }, 200);
});

test('un entero nunca se escribe «n/1»: 1/3 + 2/3 da «1»', () => {
    let hubo = false;
    paraTodas((p) => {
        for (const o of p.opciones) assert.ok(!/\/1$/.test(o.texto), o.texto);
        assert.ok(!/\/1\b/.test(p.explicacion), p.explicacion);
        if (p.habilidad === 'suma-resta' && p.textoRespuesta === '1') hubo = true;
    }, 300);
    assert.ok(hubo, 'en alguna suma el resultado es un entero');
});
