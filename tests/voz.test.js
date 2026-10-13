import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Voz, textoParaVoz, elegirVoz } from '../src/core/voz.js';

function crearSintesisFalsa(voces = []) {
    const s = {
        dicho: [], cancelaciones: 0,
        speak(f) { s.dicho.push(f); }, cancel() { s.cancelaciones++; }, getVoices() { return voces; }
    };
    return s;
}
class Declaracion { constructor(texto) { this.text = texto; } }

test('textoParaVoz: fracciones, operaciones y horas se dicen con palabras', () => {
    assert.equal(textoParaVoz('Pinta 3/4 de la figura'), 'Pinta 3 cuartos de la figura');
    assert.equal(textoParaVoz('¿Cuánto es 1/2 + 1/3?'), '¿Cuánto es 1 medio más 1 tercio?');
    assert.equal(textoParaVoz('7 × 3'), '7 por 3');
    assert.equal(textoParaVoz('12 ÷ 4'), '12 entre 4');
    assert.equal(textoParaVoz('9 − 2'), '9 menos 2');
    assert.equal(textoParaVoz('2 + 2 = 4'), '2 más 2 igual a 4');
    assert.equal(textoParaVoz('Son las 3:20 p. m.'), 'Son las 3:20 de la tarde');
    assert.equal(textoParaVoz('Son las 9:00 a. m.'), 'Son las 9:00 de la mañana');
    assert.equal(textoParaVoz('5/12'), '5 entre 12');
});

test('textoParaVoz: no toca el texto normal y tolera valores vacíos', () => {
    assert.equal(textoParaVoz('Elige la palabra correcta'), 'Elige la palabra correcta');
    assert.equal(textoParaVoz('  hola   mundo '), 'hola mundo');
    assert.equal(textoParaVoz(null), '');
    assert.equal(textoParaVoz(undefined), '');
    // una "x" dentro de una palabra no es una multiplicación
    assert.equal(textoParaVoz('examen 3'), 'examen 3');
});

test('elegirVoz: prefiere español de América, luego otros español, y si no hay, nada', () => {
    const en = { lang: 'en-US' };
    const es = { lang: 'es-ES' };
    const mx = { lang: 'es-MX' };
    const us = { lang: 'es_US' };
    assert.equal(elegirVoz([en, es, mx]), mx);
    assert.equal(elegirVoz([en, es]), es);
    assert.equal(elegirVoz([en, us]), us);
    assert.equal(elegirVoz([en]), null);
    assert.equal(elegirVoz([]), null);
    assert.equal(elegirVoz(undefined), null);
    assert.equal(elegirVoz([{ lang: 'esperanto' }]), null, '«es» debe ser el idioma, no el inicio de otro nombre');
});

test('elegirVoz: entre voces en español prefiere las LOCALES (las de internet no suenan sin conexión)', () => {
    const enLinea = { lang: 'es-MX', localService: false };
    const local = { lang: 'es-ES', localService: true };
    assert.equal(elegirVoz([enLinea, local]), local);
    assert.equal(elegirVoz([enLinea]), enLinea, 'si es la única, se usa');
    const localMx = { lang: 'es-MX', localService: true };
    assert.equal(elegirVoz([local, localMx]), localMx);
});

test('Voz.leer: cancela lo anterior, manda a hablar con idioma y velocidad adecuados', () => {
    const sintesis = crearSintesisFalsa([{ lang: 'es-MX', name: 'Paulina' }]);
    const voz = new Voz({ sintesis, Declaracion });
    assert.equal(voz.disponible, true);
    assert.equal(voz.leer('Pinta 1/2'), true);
    assert.equal(sintesis.cancelaciones, 1);
    assert.equal(sintesis.dicho.length, 1);
    assert.equal(sintesis.dicho[0].text, 'Pinta 1 medio');
    assert.equal(sintesis.dicho[0].lang, 'es-MX');
    assert.ok(sintesis.dicho[0].rate < 1);
    assert.equal(sintesis.dicho[0].voice.name, 'Paulina');
});

test('Voz: con la API pero SIN voz en español NO está disponible (no se ofrecen botones mudos)', () => {
    for (const voces of [[], [{ lang: 'en-US' }]]) {
        const voz = new Voz({ sintesis: crearSintesisFalsa(voces), Declaracion });
        assert.equal(voz.disponible, false);
    }
});

test('Voz: las voces que llegan tarde (evento voiceschanged) activan la disponibilidad', () => {
    const oyentes = [];
    const sintesis = crearSintesisFalsa([]);
    sintesis.addEventListener = (nombre, fn) => oyentes.push([nombre, fn]);
    const voz = new Voz({ sintesis, Declaracion });
    assert.equal(voz.disponible, false);
    sintesis.getVoices = () => [{ lang: 'es-MX' }];
    assert.equal(oyentes[0][0], 'voiceschanged');
    oyentes[0][1]();
    assert.equal(voz.disponible, true);
});

test('Voz: sin speechSynthesis NO está disponible y nada falla', () => {
    const voz = new Voz({ sintesis: null, Declaracion: null });
    assert.equal(voz.disponible, false);
    assert.equal(voz.leer('hola'), false);
    assert.doesNotThrow(() => voz.detener());
    assert.equal(new Voz({ sintesis: crearSintesisFalsa(), Declaracion: null }).disponible, false);
});

test('Voz.leer: un texto vacío no habla, y un error del navegador no se propaga', () => {
    const sintesis = crearSintesisFalsa();
    sintesis.getVoices = () => [{ lang: 'es-MX' }];
    const voz = new Voz({ sintesis, Declaracion });
    assert.equal(voz.leer('   '), false);
    assert.equal(sintesis.dicho.length, 0);
    sintesis.speak = () => { throw new Error('boom'); };
    const aviso = console.warn;
    console.warn = () => {};
    try { assert.equal(voz.leer('hola'), false); } finally { console.warn = aviso; }
});

test('Voz.detener cancela la voz', () => {
    const sintesis = crearSintesisFalsa([{ lang: 'es-MX' }]);
    new Voz({ sintesis, Declaracion }).detener();
    assert.equal(sintesis.cancelaciones, 1);
});
