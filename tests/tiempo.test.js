import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizarHora12, codigoHora, anguloMinutero, anguloHorario, anguloDesdeCentro, minutosDesdeAngulo, horaDesdeAngulo,
    diferenciaAngular, elegirMano, formatoDigital, formato24, formato12ConPeriodo, periodoDelDia, a24, a12,
    minutosDelDia, desdeMinutosDelDia, formatoDuracion, textoEnPalabras
} from '../src/core/tiempo.js';

// ---------- Ángulos ----------

test('el minutero avanza 6° por minuto y da la vuelta a los 60', () => {
    assert.equal(anguloMinutero(0), 0);
    assert.equal(anguloMinutero(15), 90);
    assert.equal(anguloMinutero(30), 180);
    assert.equal(anguloMinutero(45), 270);
    assert.equal(anguloMinutero(59), 354);
});

test('el horario avanza 30° por hora y 0.5° por minuto (a las 3:30 está entre el 3 y el 4)', () => {
    assert.equal(anguloHorario(12, 0), 0);
    assert.equal(anguloHorario(3, 0), 90);
    assert.equal(anguloHorario(3, 30), 105);
    assert.equal(anguloHorario(6, 0), 180);
    assert.equal(anguloHorario(11, 59), 359.5);
    assert.equal(anguloHorario(12, 30), 15, 'las 12 se tratan como 0');
});

test('anguloDesdeCentro: 0° arriba, 90° derecha, 180° abajo, 270° izquierda (sentido horario, y hacia abajo en pantalla)', () => {
    assert.equal(anguloDesdeCentro(0, -10), 0);
    assert.equal(anguloDesdeCentro(10, 0), 90);
    assert.equal(anguloDesdeCentro(0, 10), 180);
    assert.equal(anguloDesdeCentro(-10, 0), 270);
    assert.ok(Math.abs(anguloDesdeCentro(10, -10) - 45) < 1e-9);
    assert.ok(Math.abs(anguloDesdeCentro(-10, -10) - 315) < 1e-9);
});

test('ida y vuelta: ángulo → minutos recupera los minutos de cada posición (con cualquier paso que los contenga)', () => {
    for (let m = 0; m < 60; m++) assert.equal(minutosDesdeAngulo(anguloMinutero(m), 1), m);
    for (let m = 0; m < 60; m += 5) assert.equal(minutosDesdeAngulo(anguloMinutero(m), 5), m);
    for (const m of [0, 15, 30, 45]) assert.equal(minutosDesdeAngulo(anguloMinutero(m), 15), m);
    for (const m of [0, 30]) assert.equal(minutosDesdeAngulo(anguloMinutero(m), 30), m);
});

test('minutosDesdeAngulo redondea al paso más cercano y da la vuelta en 359°→0', () => {
    assert.equal(minutosDesdeAngulo(359, 1), 0, '359° es 59.8 minutos → se redondea a 60 = 0');
    assert.equal(minutosDesdeAngulo(359, 5), 0);
    assert.equal(minutosDesdeAngulo(14, 15), 0, '14° está más cerca de 0 que de 90');
    assert.equal(minutosDesdeAngulo(50, 15), 15);
    assert.equal(minutosDesdeAngulo(89, 30), 0, 'con paso de 30 min el corte entre 0 y 30 está a los 90°');
    assert.equal(minutosDesdeAngulo(91, 30), 30);
    assert.equal(minutosDesdeAngulo(269, 30), 30);
    assert.equal(minutosDesdeAngulo(271, 30), 0, 'pasados los 270° el más cercano es el 12 (360°)');
    assert.equal(minutosDesdeAngulo(-3, 1), 0);
});

test('horaDesdeAngulo: cada marca de hora cada 30°; las 12 en 0° y en 360°', () => {
    for (let h = 1; h <= 12; h++) assert.equal(horaDesdeAngulo((h % 12) * 30), h);
    assert.equal(horaDesdeAngulo(359), 12);
    assert.equal(horaDesdeAngulo(14), 12);
    assert.equal(horaDesdeAngulo(16), 1);
});

test('diferenciaAngular toma el camino más corto', () => {
    assert.equal(diferenciaAngular(350, 10), 20);
    assert.equal(diferenciaAngular(0, 180), 180);
    assert.equal(diferenciaAngular(90, 45), 45);
    assert.equal(diferenciaAngular(10, 350), 20);
});

test('elegirMano: lejos del centro siempre es el minutero; cerca, la manecilla más cercana al toque', () => {
    const base = { anguloHorario: 90, anguloMinutero: 180, largoHorario: 48 };
    assert.equal(elegirMano({ ...base, angulo: 92, radio: 80 }), 'minuto', 'aunque apunte al horario, a 80 px solo llega el minutero');
    assert.equal(elegirMano({ ...base, angulo: 92, radio: 30 }), 'hora');
    assert.equal(elegirMano({ ...base, angulo: 178, radio: 30 }), 'minuto');
    assert.equal(elegirMano({ ...base, angulo: 135, radio: 30 }), 'hora', 'empate exacto → el horario');
});

test('elegirMano cuando las manecillas se superponen (12:00): cerca del centro agarra el horario', () => {
    const base = { anguloHorario: 0, anguloMinutero: 0, largoHorario: 48 };
    assert.equal(elegirMano({ ...base, angulo: 3, radio: 20 }), 'hora');
    assert.equal(elegirMano({ ...base, angulo: 3, radio: 70 }), 'minuto');
});

// ---------- Formatos ----------

test('formatos digitales', () => {
    assert.equal(formatoDigital(3, 5), '3:05');
    assert.equal(formatoDigital(12, 0), '12:00');
    assert.equal(formatoDigital(0, 30), '12:30', '0 h es las 12 en el reloj de 12 h');
    assert.equal(formatoDigital(15, 20), '3:20');
    assert.equal(formato24(7, 5), '07:05');
    assert.equal(formato24(0, 0), '00:00');
    assert.equal(formato24(23, 59), '23:59');
    assert.equal(formato12ConPeriodo(15, 20), '3:20 p. m.');
    assert.equal(formato12ConPeriodo(0, 30), '12:30 a. m.');
    assert.equal(formato12ConPeriodo(12, 0), '12:00 p. m.');
});

test('periodo del día', () => {
    assert.equal(periodoDelDia(0), 'de la madrugada');
    assert.equal(periodoDelDia(5), 'de la madrugada');
    assert.equal(periodoDelDia(6), 'de la mañana');
    assert.equal(periodoDelDia(11), 'de la mañana');
    assert.equal(periodoDelDia(12), 'de la tarde');
    assert.equal(periodoDelDia(18), 'de la tarde');
    assert.equal(periodoDelDia(19), 'de la noche');
    assert.equal(periodoDelDia(23), 'de la noche');
});

test('12 h ↔ 24 h con los casos límite (12 a. m. = 0, 12 p. m. = 12)', () => {
    assert.equal(a24(12, false), 0);
    assert.equal(a24(12, true), 12);
    assert.equal(a24(1, false), 1);
    assert.equal(a24(3, true), 15);
    assert.equal(a24(11, true), 23);
    assert.deepEqual(a12(0), { h: 12, pm: false });
    assert.deepEqual(a12(12), { h: 12, pm: true });
    assert.deepEqual(a12(15), { h: 3, pm: true });
    assert.deepEqual(a12(23), { h: 11, pm: true });
});

test('ida y vuelta 24 h → 12 h → 24 h para las 24 horas del día', () => {
    for (let h24 = 0; h24 < 24; h24++) {
        const { h, pm } = a12(h24);
        assert.ok(h >= 1 && h <= 12);
        assert.equal(a24(h, pm), h24, `h24 = ${h24}`);
    }
});

test('codigoHora: las 12 y las 0 son lo mismo; horas distintas dan códigos distintos', () => {
    assert.equal(codigoHora(12, 0), codigoHora(0, 0));
    const codigos = new Set();
    for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m++) codigos.add(codigoHora(h, m));
    assert.equal(codigos.size, 720, 'cada hora de 12 h tiene un código distinto');
});

// ---------- Minutos del día y duraciones ----------

test('minutos del día: ida y vuelta y vuelta al día siguiente', () => {
    assert.equal(minutosDelDia(15, 20), 920);
    assert.deepEqual(desdeMinutosDelDia(920), { h24: 15, m: 20 });
    assert.deepEqual(desdeMinutosDelDia(1440), { h24: 0, m: 0 });
    assert.deepEqual(desdeMinutosDelDia(23 * 60 + 50 + 30), { h24: 0, m: 20 });
    assert.deepEqual(desdeMinutosDelDia(-10), { h24: 23, m: 50 });
    for (let t = 0; t < 1440; t++) {
        const { h24, m } = desdeMinutosDelDia(t);
        assert.equal(minutosDelDia(h24, m), t);
    }
});

test('formatoDuracion', () => {
    assert.equal(formatoDuracion(25), '25 minutos');
    assert.equal(formatoDuracion(1), '1 minuto');
    assert.equal(formatoDuracion(60), '1 hora');
    assert.equal(formatoDuracion(75), '1 hora y 15 minutos');
    assert.equal(formatoDuracion(120), '2 horas');
    assert.equal(formatoDuracion(150), '2 horas y 30 minutos');
    assert.equal(formatoDuracion(61), '1 hora y 1 minuto');
});

// ---------- La hora con palabras ----------

test('textoEnPalabras: en punto, y cuarto, y media, y X, menos X', () => {
    assert.equal(textoEnPalabras(3, 0), 'las tres en punto');
    assert.equal(textoEnPalabras(1, 0), 'la una en punto');
    assert.equal(textoEnPalabras(12, 0), 'las doce en punto');
    assert.equal(textoEnPalabras(3, 15), 'las tres y cuarto');
    assert.equal(textoEnPalabras(1, 15), 'la una y cuarto');
    assert.equal(textoEnPalabras(3, 30), 'las tres y media');
    assert.equal(textoEnPalabras(7, 5), 'las siete y cinco');
    assert.equal(textoEnPalabras(7, 10), 'las siete y diez');
    assert.equal(textoEnPalabras(7, 20), 'las siete y veinte');
    assert.equal(textoEnPalabras(7, 25), 'las siete y veinticinco');
    assert.equal(textoEnPalabras(3, 45), 'las cuatro menos cuarto');
    assert.equal(textoEnPalabras(12, 45), 'la una menos cuarto', 'después de las 12 viene la una');
    assert.equal(textoEnPalabras(11, 50), 'las doce menos diez');
    assert.equal(textoEnPalabras(12, 55), 'la una menos cinco');
    assert.equal(textoEnPalabras(6, 35), 'las siete menos veinticinco');
    assert.equal(textoEnPalabras(6, 40), 'las siete menos veinte');
});

test('textoEnPalabras: todas las combinaciones válidas dan un texto distinto y sin valores raros', () => {
    const textos = new Set();
    for (let h = 1; h <= 12; h++) {
        for (let m = 0; m < 60; m += 5) {
            const t = textoEnPalabras(h, m);
            assert.ok(!/undefined|NaN/.test(t), `${h}:${m} → ${t}`);
            textos.add(t);
        }
    }
    assert.equal(textos.size, 144, 'cada hora (múltiplo de 5 min) tiene una forma única de decirse');
});

test('textoEnPalabras rechaza minutos que no son múltiplos de 5', () => {
    assert.throws(() => textoEnPalabras(3, 12), /múltiplos de 5/);
});

test('normalizarHora12', () => {
    assert.deepEqual([0, 1, 11, 12, 13, 24].map(normalizarHora12), [12, 1, 11, 12, 1, 12]);
});
