import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Partida as PartidaAsteroides } from '../src/games/asteroides/logica/partida.js';
import { Partida as PartidaOrtografia } from '../src/games/ortografia/logica/partida.js';
import { Partida as PartidaReloj } from '../src/games/reloj/logica/partida.js';
import { Partida as PartidaFracciones } from '../src/games/fracciones/logica/partida.js';
import { Partida as PartidaCalculo } from '../src/games/calculo/logica/partida.js';
import { Partida as PartidaBloques } from '../src/games/bloques/logica/partida.js';
import { Partida as PartidaCajas } from '../src/games/cajas/logica/partida.js';
import { generarPregunta, TOPE_SUMA } from '../src/games/asteroides/logica/generadores.js';
import { cantidadAsteroides, velocidadBase, FACTOR_TRANQUILO } from '../src/games/asteroides/logica/campo.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { normalizarResultado } from '../src/core/resultado.js';

/** Una respuesta equivocada: otra opción o, en las preguntas sin opciones (arrastrar/pintar), un valor imposible. */
const equivocada = (pregunta) => (pregunta.opciones.find((o) => o.id !== pregunta.respuesta) ?? { id: -999 }).id;

const JUEGOS = [
    { nombre: 'Asteroides', Partida: PartidaAsteroides, gradoMin: 1, gradoMax: 6 },
    { nombre: 'Ortografía', Partida: PartidaOrtografia, gradoMin: 3, gradoMax: 6 },
    { nombre: 'Reloj', Partida: PartidaReloj, gradoMin: 1, gradoMax: 4 },
    { nombre: 'Fracciones', Partida: PartidaFracciones, gradoMin: 3, gradoMax: 6 },
    { nombre: 'Taller de Cálculo', Partida: PartidaCalculo, gradoMin: 1, gradoMax: 6 },
    { nombre: 'Bloques de Valor', Partida: PartidaBloques, gradoMin: 1, gradoMax: 6 },
    { nombre: 'Cajas y Reparto', Partida: PartidaCajas, gradoMin: 1, gradoMax: 6 }
];

for (const { nombre, Partida, gradoMin, gradoMax } of JUEGOS) {
    test(`${nombre}: la misión de inicio funciona con cualquier patrón de respuestas y termina dentro del rango`, () => {
        for (let semilla = 1; semilla <= 60; semilla++) {
            const az = crearAleatorioSembrado(semilla);
            const partida = new Partida({ grado: gradoMax, aleatorio: az, colocacion: { gradoMin, gradoMax } });
            assert.equal(partida.total, 8);
            let info;
            const grados = [];
            while ((info = partida.iniciarPregunta(0))) {
                const { pregunta } = info;
                assert.ok(pregunta.opciones.length >= 2 || pregunta.tipo === 'poner' || pregunta.tipo === 'pintar', 'la pregunta de cada peldaño es válida');
                grados.push(partida.escalon.grado);
                if (az() < 0.5) partida.responder(pregunta.respuesta);
                else { partida.responder(equivocada(pregunta)); partida.responder(pregunta.respuesta); }
            }
            assert.ok(grados.every((g) => g >= gradoMin && g <= gradoMax), `${grados}`);
            const r = partida.resultado(1000);
            assert.ok(r.gradoContenido >= gradoMin && r.gradoContenido <= gradoMax);
            assert.equal(r.aciertos + r.fallos, 8);
            assert.doesNotThrow(() => normalizarResultado(r));
        }
    });

    test(`${nombre}: quien lo sabe todo termina en el tope y quien falla todo, en el piso`, () => {
        const mejor = new Partida({ grado: gradoMax, aleatorio: crearAleatorioSembrado(1), colocacion: { gradoMin, gradoMax } });
        let info;
        while ((info = mejor.iniciarPregunta(0))) mejor.responder(info.pregunta.respuesta);
        assert.equal(mejor.resultado(1).gradoContenido, gradoMax);

        const peor = new Partida({ grado: gradoMax, aleatorio: crearAleatorioSembrado(1), colocacion: { gradoMin, gradoMax } });
        while ((info = peor.iniciarPregunta(0))) {
            peor.responder(equivocada(info.pregunta));
            peor.responder(info.pregunta.respuesta);
        }
        assert.equal(peor.resultado(1).gradoContenido, gradoMin);
    });

    test(`${nombre}: sin misión, la partida normal sigue igual (10 preguntas, habilidades guardadas)`, () => {
        const partida = new Partida({ grado: gradoMax, aleatorio: crearAleatorioSembrado(2) });
        assert.equal(partida.total, 10);
        partida.iniciarPregunta(0);
        assert.ok(partida.resultado(1).habilidades);
    });
}

// ---------- Escalones nuevos por debajo (Asteroides) ----------

test('1.º nivel 1: sumas y restas con números hasta 5 (el nuevo piso)', () => {
    assert.deepEqual(TOPE_SUMA[1], [5, 10, 20]);
    const az = crearAleatorioSembrado(11);
    for (let i = 0; i < 400; i++) {
        for (const habilidad of ['suma', 'resta']) {
            const p = generarPregunta({ grado: 1, habilidad, nivel: 1, aleatorio: az });
            const [a, b] = p.enunciado.match(/\d+/g).map(Number);
            assert.ok(a <= 5 && b <= 5, p.enunciado);
            assert.ok(p.respuesta <= 10 && p.respuesta >= 1);
        }
    }
});

test('los topes de suma crecen con el grado y con el nivel (escalera sin saltos hacia atrás)', () => {
    let previo = 0;
    for (let g = 1; g <= 6; g++) {
        TOPE_SUMA[g].forEach((t, i) => { assert.ok(i === 0 ? t >= previo : t > previo, `grado ${g}: ${t} no supera ${previo}`); previo = t; });
    }
});

// ---------- Modo tranquilo (Asteroides) ----------

test('modo tranquilo: asteroides al 60 % de velocidad y uno menos, sin bajar de 3', () => {
    for (let g = 1; g <= 6; g++) {
        for (let n = 1; n <= 3; n++) {
            assert.equal(velocidadBase(g, n, true), velocidadBase(g, n) * FACTOR_TRANQUILO);
            assert.ok(velocidadBase(g, n, true) < velocidadBase(g, n));
            assert.ok(cantidadAsteroides(g, n, true) >= 3);
            assert.ok(cantidadAsteroides(g, n, true) <= cantidadAsteroides(g, n));
        }
    }
    assert.equal(cantidadAsteroides(4, 3, true), 4);
    assert.equal(cantidadAsteroides(4, 3), 5);
    assert.equal(cantidadAsteroides(1, 1, true), 3, 'ya está en el mínimo');
});

test('Asteroides: tras 2 preguntas falladas seguidas, la ronda siguiente va en modo tranquilo y se quita al acertar', () => {
    const partida = new PartidaAsteroides({ grado: 5, aleatorio: crearAleatorioSembrado(5) });
    const fallar = () => { const i = partida.iniciarPregunta(0); partida.escapo(); return i; };
    const normal = partida.iniciarPregunta(0);
    partida.escapo();
    fallar();
    const tranquila = partida.iniciarPregunta(0);
    assert.equal(tranquila.alivio, true);
    assert.ok(tranquila.velocidad < normal.velocidad * 0.7 || tranquila.nivel < normal.nivel);
    partida.responder(tranquila.pregunta.respuesta);
    const siguiente = partida.iniciarPregunta(0);
    assert.equal(siguiente.alivio, false);
});
