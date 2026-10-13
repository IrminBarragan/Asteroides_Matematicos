import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarPregunta, habilidadesParaGrado, HABILIDADES_POR_GRADO, prepararRonda, segundosDeCaida, cantidadOpciones,
    explicacionPalabra, explicacionAcento, erroresPosibles, PISTAS, NIVEL_MAX
} from '../src/games/ortografia/logica/generadores.js';
import { ACENTUACION } from '../src/games/ortografia/logica/contenido.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from '../src/games/ortografia/logica/partida.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { normalizarResultado } from '../src/core/resultado.js';

const TODAS = [...new Set(Object.values(HABILIDADES_POR_GRADO).flat())];

function paraTodas(fn, muestras = 80) {
    for (const habilidad of TODAS) {
        for (let nivel = 1; nivel <= NIVEL_MAX; nivel++) {
            const az = crearAleatorioSembrado(habilidad.length * 100 + nivel);
            for (let i = 0; i < muestras; i++) {
                for (const cantidad of [2, 3]) fn(generarPregunta({ grado: 5, habilidad, nivel, cantidad, aleatorio: az }), { habilidad, nivel, cantidad });
            }
        }
    }
}

// ---------- Preguntas ----------

test('toda pregunta tiene la respuesta correcta entre sus opciones, opciones únicas y la cantidad pedida (o 2 si no hay más)', () => {
    paraTodas((q, { cantidad }) => {
        const textos = q.opciones.map((o) => o.texto);
        assert.equal(new Set(textos.map((t) => t.toLowerCase())).size, textos.length, `repetidas: ${textos}`);
        assert.ok(textos.length >= 2 && textos.length <= cantidad, `${textos.length} opciones (pidió ${cantidad})`);
        assert.equal(q.opciones.find((o) => o.id === q.respuesta).texto, q.textoRespuesta);
        assert.equal(q.respuesta, 0);
        assert.ok(new Set(q.opciones.map((o) => o.id)).size === q.opciones.length);
    });
});

test('en las preguntas de palabra, el enunciado es fijo y la única opción correcta es la palabra bien escrita', () => {
    paraTodas((q) => {
        if (q.tipo !== 'palabra') return;
        assert.equal(q.enunciado, '¿Cuál está bien escrita?');
        const errores = erroresPosibles(q.habilidad, q.textoRespuesta);
        for (const o of q.opciones) {
            if (o.id !== q.respuesta) assert.ok(errores.includes(o.texto), `«${o.texto}» no es un error válido de «${q.textoRespuesta}»`);
        }
    });
});

test('en las preguntas de oración, hay un espacio por completar y las opciones son las del ejercicio', () => {
    paraTodas((q) => {
        if (q.tipo !== 'oracion') return;
        assert.equal((q.enunciado.match(/___/g) || []).length, 1);
        assert.ok(q.opciones.every((o) => o.texto.length >= 1));
    });
});

test('el tipo de pregunta corresponde a la habilidad', () => {
    paraTodas((q, { habilidad }) => {
        const esOracion = ['homofonos', 'diacriticos', 'porques'].includes(habilidad);
        assert.equal(q.tipo, esOracion ? 'oracion' : 'palabra', habilidad);
    }, 5);
});

test('la pista y la explicación existen, no están vacías y la explicación nombra la respuesta', () => {
    paraTodas((q) => {
        assert.ok(q.pista.length > 15, `pista: ${q.pista}`);
        assert.ok(q.explicacion.length > 15);
        assert.ok(!/undefined|NaN|\[object/.test(q.pista + q.explicacion + q.enunciado));
        assert.ok(q.explicacion.toLowerCase().includes(q.textoRespuesta.toLowerCase()), `«${q.textoRespuesta}» ∉ «${q.explicacion}»`);
    });
});

test('la pista NO revela la respuesta (la explicación completa sí, pero después)', () => {
    // Los textos genéricos pueden coincidir con una palabra del juego (p. ej. "sílaba"); eso no regala nada.
    // Lo que importa es que una REGLA escrita para una palabra concreta no la nombre.
    const genericas = new Set(Object.values(PISTAS));
    paraTodas((q) => {
        if (q.tipo !== 'palabra' || genericas.has(q.pista)) return;
        assert.ok(!q.pista.toLowerCase().includes(q.textoRespuesta.toLowerCase()), `la pista contiene «${q.textoRespuesta}»: ${q.pista}`);
    });
});

test('una palabra cuya regla nombra a la propia palabra ("vivir lleva v") usa la pista genérica', () => {
    const az = crearAleatorioSembrado(1);
    let vistas = 0;
    for (let i = 0; i < 4000 && vistas < 3; i++) {
        const q = generarPregunta({ grado: 3, habilidad: 'b-v', nivel: 1, aleatorio: az });
        if (q.textoRespuesta !== 'vivir') continue;
        vistas++;
        assert.equal(q.pista, PISTAS['b-v']);
        assert.match(q.explicacion, /excepción/, 'la explicación completa sí lleva la regla');
    }
    assert.ok(vistas > 0, 'no salió "vivir" en las muestras');
});

test('la posición de la respuesta correcta varía (no siempre es la primera opción mostrada)', () => {
    const az = crearAleatorioSembrado(4);
    const posiciones = new Set();
    for (let i = 0; i < 200; i++) {
        const q = generarPregunta({ grado: 3, habilidad: 'b-v', nivel: 2, cantidad: 3, aleatorio: az });
        posiciones.add(q.opciones.findIndex((o) => o.id === q.respuesta));
    }
    assert.equal(posiciones.size, 3);
});

test('hay variedad: en 100 preguntas del mismo nivel aparecen muchas palabras distintas', () => {
    const az = crearAleatorioSembrado(8);
    const vistas = new Set();
    for (let i = 0; i < 100; i++) vistas.add(generarPregunta({ grado: 3, habilidad: 'b-v', nivel: 1, aleatorio: az }).textoRespuesta);
    assert.ok(vistas.size >= 8, `solo ${vistas.size} palabras distintas`);
});

test('las preguntas son reproducibles con la misma semilla', () => {
    const q = (s) => generarPregunta({ grado: 6, habilidad: 'homofonos', nivel: 2, aleatorio: crearAleatorioSembrado(s) });
    assert.deepEqual(q(3), q(3));
});

test('nivel y cantidad fuera de rango se acotan; una habilidad desconocida falla con error claro', () => {
    assert.doesNotThrow(() => generarPregunta({ grado: 3, habilidad: 'b-v', nivel: 99, cantidad: 99 }));
    assert.doesNotThrow(() => generarPregunta({ grado: 3, habilidad: 'b-v', nivel: -1, cantidad: 0 }));
    assert.throws(() => generarPregunta({ grado: 3, habilidad: 'matematicas', nivel: 1 }), /desconocida/);
});

// ---------- Explicaciones ----------

test('explicación de acentuación: dice la clase, el final de la palabra y si lleva tilde', () => {
    const e = (palabra) => ACENTUACION.find((x) => x.palabra === palabra);
    assert.match(explicacionAcento(e('canción')), /aguda.*«n».*lleva tilde/s);
    assert.match(explicacionAcento(e('canción')), /can-CIÓN/);
    assert.match(explicacionAcento(e('reloj')), /aguda.*«j»|aguda.*consonante distinta/s);
    assert.match(explicacionAcento(e('reloj')), /no lleva tilde/);
    assert.match(explicacionAcento(e('árbol')), /grave.*NO terminan en n, s ni vocal.*Por eso lleva tilde/s);
    assert.match(explicacionAcento(e('mesa')), /grave.*vocal.*no lleva tilde/s);
    assert.match(explicacionAcento(e('teléfono')), /esdrújula.*todas las esdrújulas llevan tilde/s);
    assert.match(explicacionAcento(e('lunes')), /grave.*«s».*no lleva tilde/s);
});

test('explicaciones por letra: b/v, g/j, h, c/s/z, ll/y', () => {
    assert.match(explicacionPalabra('b-v', 'ventana'), /con v/);
    assert.match(explicacionPalabra('b-v', 'bicicleta'), /con b/);
    assert.match(explicacionPalabra('g-j', 'jirafa'), /con j/);
    assert.match(explicacionPalabra('g-j', 'gente'), /con g/);
    assert.match(explicacionPalabra('h', 'huevo', 'Regla.'), /con h.*Regla\./);
    assert.match(explicacionPalabra('h', 'amigo'), /sin h/);
    assert.match(explicacionPalabra('h', 'ocho'), /sin h/, 'la h de "ch" no cuenta');
    assert.match(explicacionPalabra('c-s-z', 'cebolla'), /«c» va antes de e, i/);
    assert.match(explicacionPalabra('c-s-z', 'zapato'), /«z» va antes de a, o, u/);
    assert.match(explicacionPalabra('ll-y', 'calle'), /con ll/);
    assert.match(explicacionPalabra('ll-y', 'playa'), /con y/);
});

// ---------- Ajustes y cobertura ----------

test('cobertura por grado: 3.º b/v g/j h · 4.º + c/s/z ll/y · 5.º acentuación · 6.º homófonos, diacríticos, porque', () => {
    assert.deepEqual(HABILIDADES_POR_GRADO[3], ['b-v', 'g-j', 'h']);
    assert.ok(HABILIDADES_POR_GRADO[4].includes('c-s-z') && HABILIDADES_POR_GRADO[4].includes('ll-y'));
    assert.ok(HABILIDADES_POR_GRADO[5].includes('acentuacion'));
    for (const h of ['homofonos', 'diacriticos', 'porques']) assert.ok(HABILIDADES_POR_GRADO[6].includes(h));
    assert.deepEqual(Object.keys(habilidadesParaGrado(1)), HABILIDADES_POR_GRADO[3]); // acota hacia 3.º
    assert.deepEqual(Object.keys(habilidadesParaGrado(99)), HABILIDADES_POR_GRADO[6]);
});

test('el ritmo: los más chicos tienen más tiempo, y cada nivel va un poco más rápido; 2 opciones al inicio y 3 después', () => {
    for (let n = 1; n <= 3; n++) for (let g = 3; g < 6; g++) assert.ok(segundosDeCaida(g, n) > segundosDeCaida(g + 1, n));
    for (let g = 3; g <= 6; g++) for (let n = 1; n < 3; n++) assert.ok(segundosDeCaida(g, n) > segundosDeCaida(g, n + 1));
    assert.ok(segundosDeCaida(3, 1) >= 20 && segundosDeCaida(6, 3) >= 10, 'ni imposible de leer ni aburrido');
    assert.deepEqual([1, 2, 3].map(cantidadOpciones), [2, 3, 3]);
    assert.deepEqual(prepararRonda(4, 2), { cantidad: 3, segundos: segundosDeCaida(4, 2) });
});

// ---------- Partida ----------

const nueva = (extra = {}) => new Partida({ grado: 4, aleatorio: crearAleatorioSembrado(1), ...extra });
const incorrecta = (p) => p.pregunta.opciones.find((o) => o.id !== p.pregunta.respuesta).id;

test('la partida de ortografía termina tras las preguntas y entrega ajustes de ronda y explicación', () => {
    const p = nueva();
    let n = 0;
    for (let info = p.iniciarPregunta(); info; info = p.iniciarPregunta()) {
        assert.ok(info.cantidad >= 2 && info.segundos > 0 && info.pregunta);
        const r = p.responder(p.pregunta.respuesta);
        assert.equal(r.tipo, 'correcta');
        assert.ok(r.explicacion.length > 15);
        n++;
    }
    assert.equal(n, PREGUNTAS_POR_PARTIDA);
    assert.equal(p.aciertos, PREGUNTAS_POR_PARTIDA);
});

test('equivocarse da la pista (sin revelar la respuesta); si la palabra se escapa, se devuelve la explicación completa', () => {
    const p = nueva();
    p.iniciarPregunta();
    const e = p.responder(incorrecta(p));
    assert.equal(e.tipo, 'incorrecta');
    assert.ok(!e.pista.toLowerCase().includes(p.pregunta.textoRespuesta.toLowerCase()));
    const esc = p.escapo();
    assert.equal(esc.tipo, 'escapo');
    assert.equal(esc.textoRespuesta, p.pregunta.textoRespuesta);
    assert.ok(esc.explicacion.includes(p.pregunta.textoRespuesta));
    assert.equal(p.fallos, 1, 'un error y un escape en la misma pregunta cuentan una sola vez');
});

test('el grado se acota a 3.º–6.º y el resultado cumple el formato común', () => {
    assert.equal(new Partida({ grado: 1 }).grado, 3);
    assert.equal(new Partida({ grado: 99 }).grado, 6);
    const p = nueva();
    while (p.iniciarPregunta()) p.responder(p.pregunta.respuesta);
    const r = normalizarResultado(p.resultado(70000));
    assert.equal(r.estrellas, 3);
    assert.ok(Object.keys(r.habilidades).length >= 3);
});

test('cada grado usa solo sus habilidades', () => {
    const vistas = (grado) => {
        const p = new Partida({ grado, aleatorio: crearAleatorioSembrado(grado), total: 80 });
        const s = new Set();
        while (p.iniciarPregunta()) { s.add(p.pregunta.habilidad); p.escapo(); }
        return [...s].sort();
    };
    assert.deepEqual(vistas(3), [...HABILIDADES_POR_GRADO[3]].sort());
    assert.deepEqual(vistas(6), [...HABILIDADES_POR_GRADO[6]].sort());
});
