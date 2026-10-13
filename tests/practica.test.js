import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarPregunta, generarDistractores, topeNumeros, HABILIDADES } from '../src/games/practica/logica.js';
import { JuegoPractica } from '../src/games/practica/juego.js';
import { validarMeta } from '../src/core/juego.js';
import { IDS_AVATARES } from '../src/ui/avatares.js';
import { AVATARES } from '../src/core/storage.js';

test('el tope de números crece con el grado y con el nivel', () => {
    for (let nivel = 1; nivel <= 3; nivel++) {
        for (let g = 1; g < 6; g++) assert.ok(topeNumeros(g + 1, nivel) > topeNumeros(g, nivel));
    }
    for (let g = 1; g <= 6; g++) assert.ok(topeNumeros(g, 3) > topeNumeros(g, 1));
});

test('el tope tiene un mínimo razonable y tolera grados/niveles fuera de rango', () => {
    assert.ok(topeNumeros(1, 1) >= 5);
    assert.equal(topeNumeros(99, 99), topeNumeros(6, 3));
    assert.equal(topeNumeros(-1, 0), topeNumeros(1, 1));
});

test('distractores: 3, únicos, enteros >= 0 y distintos de la respuesta (incluida la respuesta 0)', () => {
    for (const respuesta of [0, 1, 2, 7, 10, 99, 1000, 4999]) {
        for (let i = 0; i < 100; i++) {
            const d = generarDistractores(respuesta);
            assert.equal(d.length, 3, `respuesta ${respuesta}`);
            assert.equal(new Set(d).size, 3);
            for (const n of d) {
                assert.ok(Number.isInteger(n) && n >= 0, `n=${n}`);
                assert.notEqual(n, respuesta);
            }
        }
    }
});

test('toda pregunta es correcta, tiene 4 opciones únicas que incluyen la respuesta, y respeta el tope', () => {
    for (let grado = 1; grado <= 6; grado++) {
        for (const habilidad of Object.keys(HABILIDADES)) {
            for (let nivel = 1; nivel <= 3; nivel++) {
                for (let i = 0; i < 150; i++) {
                    const q = generarPregunta({ grado, habilidad, nivel });
                    const [a, op, b] = q.enunciado.split(' ');
                    const esperado = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
                    assert.equal(q.respuesta, esperado, q.enunciado);
                    assert.ok(q.respuesta >= 0, `negativo: ${q.enunciado}`);
                    assert.equal(q.opciones.length, 4);
                    assert.equal(new Set(q.opciones).size, 4);
                    assert.ok(q.opciones.includes(q.respuesta));
                    assert.ok(Number(a) <= topeNumeros(grado, nivel) && Number(b) <= topeNumeros(grado, nivel));
                    assert.ok(q.pista.length > 10);
                }
            }
        }
    }
});

test('la habilidad correcta produce el operador correcto', () => {
    assert.match(generarPregunta({ grado: 2, habilidad: 'suma', nivel: 1 }).enunciado, / \+ /);
    assert.match(generarPregunta({ grado: 2, habilidad: 'resta', nivel: 1 }).enunciado, / − /);
});

test('las preguntas son reproducibles con un generador aleatorio dado', () => {
    const crear = () => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
    const a = generarPregunta({ grado: 3, habilidad: 'suma', nivel: 2, aleatorio: crear() });
    const b = generarPregunta({ grado: 3, habilidad: 'suma', nivel: 2, aleatorio: crear() });
    assert.deepEqual(a, b);
});

test('una habilidad desconocida falla con un error claro', () => {
    assert.throws(() => generarPregunta({ grado: 1, habilidad: 'algebra', nivel: 1 }), /desconocida/);
});

test('el juego de práctica cumple el contrato de metadatos', () => {
    assert.doesNotThrow(() => validarMeta(JuegoPractica.meta));
    assert.deepEqual(JuegoPractica.meta.grados, [1, 2, 3, 4, 5, 6]);
});

test('los avatares dibujables coinciden exactamente con los que acepta el almacenamiento', () => {
    assert.deepEqual([...IDS_AVATARES].sort(), [...AVATARES].sort());
});
