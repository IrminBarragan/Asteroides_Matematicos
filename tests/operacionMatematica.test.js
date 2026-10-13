import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OperacionMatematica } from '../src/games/asteroides/operacionMatematica.js';
import { CONFIG } from '../src/games/asteroides/configuracion.js';

const MUESTRAS = 400;
const SIMBOLO = { suma: '+', resta: '-', multiplicacion: '×', division: '÷' };

function calcular(op) {
    switch (op.operador) {
        case 'suma': return op.operando1 + op.operando2;
        case 'resta': return op.operando1 - op.operando2;
        case 'multiplicacion': return op.operando1 * op.operando2;
        case 'division': return op.operando1 / op.operando2;
    }
}

test('operadores disponibles crecen con el nivel', () => {
    assert.deepEqual(new OperacionMatematica(1).obtenerOperadoresDisponibles(), ['suma']);
    assert.deepEqual(new OperacionMatematica(2).obtenerOperadoresDisponibles(), ['suma', 'resta']);
    assert.deepEqual(new OperacionMatematica(3).obtenerOperadoresDisponibles(), ['suma', 'resta', 'multiplicacion']);
    assert.deepEqual(new OperacionMatematica(5).obtenerOperadoresDisponibles(),
        ['suma', 'resta', 'multiplicacion', 'division']);
});

test('el resultado guardado coincide con la operación, en todos los niveles', () => {
    for (let nivel = 1; nivel <= CONFIG.NIVELES.NIVEL_MAX; nivel++) {
        for (let i = 0; i < MUESTRAS; i++) {
            const op = new OperacionMatematica(nivel);
            assert.equal(op.resultado, calcular(op), `nivel ${nivel}: ${op.obtenerTexto()}`);
        }
    }
});

test('nunca hay resultados negativos ni fraccionarios', () => {
    for (let nivel = 1; nivel <= CONFIG.NIVELES.NIVEL_MAX; nivel++) {
        for (let i = 0; i < MUESTRAS; i++) {
            const op = new OperacionMatematica(nivel);
            assert.ok(Number.isInteger(op.resultado), `no entero: ${op.obtenerTexto()}`);
            assert.ok(op.resultado >= 0, `negativo: ${op.obtenerTexto()}`);
        }
    }
});

test('la división es exacta y nunca divide entre cero', () => {
    for (let i = 0; i < MUESTRAS; i++) {
        const op = new OperacionMatematica(5);
        if (op.operador !== 'division') continue;
        assert.ok(op.operando2 >= 2);
        assert.equal(op.operando1 % op.operando2, 0);
    }
});

test('los operandos están dentro del rango del nivel 1', () => {
    for (let i = 0; i < MUESTRAS; i++) {
        const op = new OperacionMatematica(1);
        const { min, max } = CONFIG.RANGOS_NUMERICOS[1];
        assert.ok(op.operando1 >= min && op.operando1 <= max);
        assert.ok(op.operando2 >= min && op.operando2 <= max);
    }
});

test('obtenerTexto muestra el símbolo correcto y oculta la respuesta', () => {
    const op = new OperacionMatematica(1);
    const texto = op.obtenerTexto();
    assert.ok(texto.includes(SIMBOLO[op.operador]));
    assert.ok(texto.endsWith('= ?'));
});

test('esRespuestaCorrecta solo acepta el resultado', () => {
    const op = new OperacionMatematica(2);
    assert.equal(op.esRespuestaCorrecta(op.resultado), true);
    assert.equal(op.esRespuestaCorrecta(op.resultado + 1), false);
});

test('los distractores son únicos, enteros, no negativos y distintos de la respuesta', () => {
    for (let nivel = 1; nivel <= CONFIG.NIVELES.NIVEL_MAX; nivel++) {
        for (let i = 0; i < 100; i++) {
            const op = new OperacionMatematica(nivel);
            const cantidad = CONFIG.ASTEROIDE.CANTIDAD_MAXIMA - 1;
            const malas = op.generarRespuestasIncorrectas(cantidad);
            assert.equal(malas.length, cantidad);
            assert.equal(new Set(malas).size, cantidad, 'hay distractores repetidos');
            for (const n of malas) {
                assert.ok(Number.isInteger(n) && n >= 0);
                assert.notEqual(n, op.resultado);
            }
        }
    }
});

test('generar distractores no escribe en la consola (no debe filtrar la respuesta)', () => {
    const original = console.log;
    let llamadas = 0;
    console.log = () => { llamadas++; };
    try {
        new OperacionMatematica(3).generarRespuestasIncorrectas(3);
    } finally {
        console.log = original;
    }
    assert.equal(llamadas, 0);
});
