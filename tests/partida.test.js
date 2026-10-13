import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    Partida, PREGUNTAS_POR_PARTIDA, PUNTOS_ACIERTO, PUNTOS_RECUPERADO, BONUS_RACHA
} from '../src/games/asteroides/logica/partida.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { normalizarResultado } from '../src/core/resultado.js';

const nueva = (extra = {}) => new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(1), ...extra });
const incorrecta = (p) => p.pregunta.opciones.find((o) => o.id !== p.pregunta.respuesta).id;

test('arranca sin preguntas respondidas y entrega la primera con su configuración', () => {
    const p = nueva();
    assert.equal(p.numero, 0);
    assert.equal(p.hayMasPreguntas, true);
    const r = p.iniciarPregunta(0);
    assert.equal(p.numero, 1);
    assert.equal(r.cantidad, r.pregunta.opciones.length);
    assert.ok(r.velocidad > 0);
    assert.ok(r.nivel >= 1);
});

test('acertar a la primera: suma puntos, racha y cuenta como acierto', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    const r = p.responder(p.pregunta.respuesta, { ahoraMs: 2000 });
    assert.equal(r.tipo, 'correcta');
    assert.equal(r.primerIntento, true);
    assert.equal(r.puntos, PUNTOS_ACIERTO);
    assert.equal(p.aciertos, 1);
    assert.equal(p.racha, 1);
    assert.equal(p.puntaje, PUNTOS_ACIERTO);
});

test('equivocarse NO penaliza: cuenta un fallo, da pista y se puede reintentar', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    const e = p.responder(incorrecta(p));
    assert.equal(e.tipo, 'incorrecta');
    assert.ok(e.pista.length > 10);
    assert.equal(p.fallos, 1);
    assert.equal(p.puntaje, 0, 'un error no resta puntos');
    // Un segundo error en la misma pregunta no cuenta otra vez
    const otra = p.pregunta.opciones.filter((o) => o.id !== p.pregunta.respuesta)[1].id;
    p.responder(otra);
    assert.equal(p.fallos, 1);
    assert.equal(p.resuelta, false, 'la pregunta sigue abierta');
});

test('acertar después de equivocarse da la mitad de puntos, no cuenta como acierto y rompe la racha', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    p.responder(p.pregunta.respuesta); // racha 1
    p.iniciarPregunta(0);
    p.responder(incorrecta(p));
    const r = p.responder(p.pregunta.respuesta);
    assert.equal(r.tipo, 'correcta');
    assert.equal(r.primerIntento, false);
    assert.equal(r.puntos, PUNTOS_RECUPERADO);
    assert.equal(p.puntaje, PUNTOS_ACIERTO + PUNTOS_RECUPERADO, 'el puntaje total suma ambos aciertos, sin descuentos');
    assert.equal(p.aciertos, 1);
    assert.equal(p.fallos, 1);
    assert.equal(p.racha, 0);
});

test('racha de 3 aciertos seguidos da bonus; rachaMaxima recuerda la mejor', () => {
    const p = nueva();
    const puntos = [];
    for (let i = 0; i < 4; i++) {
        p.iniciarPregunta(0);
        puntos.push(p.responder(p.pregunta.respuesta).puntos);
    }
    assert.deepEqual(puntos, [10, 10, 10 + BONUS_RACHA, 10 + BONUS_RACHA]);
    p.iniciarPregunta(0);
    p.responder(incorrecta(p));
    assert.equal(p.racha, 0);
    assert.equal(p.rachaMaxima, 4);
});

test('el multiplicador de "puntos dobles" se aplica a los dos tipos de acierto', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    assert.equal(p.responder(p.pregunta.respuesta, { multiplicador: 2 }).puntos, PUNTOS_ACIERTO * 2);
    p.iniciarPregunta(0);
    p.responder(incorrecta(p));
    assert.equal(p.responder(p.pregunta.respuesta, { multiplicador: 2 }).puntos, PUNTOS_RECUPERADO * 2);
});

test('si la respuesta se escapa: cuenta un fallo, sin quitar vidas ni puntos, y revela la respuesta', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    const r = p.escapo();
    assert.equal(r.tipo, 'escapo');
    assert.equal(r.textoRespuesta, p.pregunta.textoRespuesta);
    assert.equal(p.fallos, 1);
    assert.equal(p.puntaje, 0);
    assert.equal(p.escapo().tipo, 'ignorada', 'no se cuenta dos veces');
});

test('si ya se equivocó y luego se escapa, el fallo no se cuenta doble', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    p.responder(incorrecta(p));
    p.escapo();
    assert.equal(p.fallos, 1);
});

test('después de resolverse la pregunta, responder o escapar se ignora', () => {
    const p = nueva();
    p.iniciarPregunta(0);
    p.responder(p.pregunta.respuesta);
    assert.equal(p.responder(p.pregunta.respuesta).tipo, 'ignorada');
    assert.equal(p.escapo().tipo, 'ignorada');
    assert.equal(p.aciertos, 1);
});

test('sin pregunta abierta, no hay nada que responder', () => {
    const p = nueva();
    assert.equal(p.responder(1).tipo, 'ignorada');
    assert.equal(p.escapo().tipo, 'ignorada');
});

test('la partida SIEMPRE termina: tras N preguntas no hay más, y aciertos + fallos = N sea como sea', () => {
    for (const patron of ['aciertos', 'fallos', 'errores-y-aciertos', 'escapes']) {
        const p = nueva();
        let i = 0;
        while (p.iniciarPregunta(i * 1000)) {
            if (patron === 'aciertos') p.responder(p.pregunta.respuesta);
            else if (patron === 'fallos') p.responder(incorrecta(p)), p.escapo();
            else if (patron === 'escapes') p.escapo();
            else { p.responder(incorrecta(p)); p.responder(p.pregunta.respuesta); }
            i++;
        }
        assert.equal(p.numero, PREGUNTAS_POR_PARTIDA, patron);
        assert.equal(p.aciertos + p.fallos, PREGUNTAS_POR_PARTIDA, patron);
        assert.equal(p.iniciarPregunta(), null);
    }
});

test('el total de preguntas es configurable', () => {
    const p = nueva({ total: 3 });
    let n = 0;
    while (p.iniciarPregunta()) { p.escapo(); n++; }
    assert.equal(n, 3);
});

test('el resultado cumple el formato común de los juegos y trae las habilidades', () => {
    const p = nueva();
    while (p.iniciarPregunta()) p.responder(p.pregunta.respuesta);
    const r = normalizarResultado(p.resultado(65000));
    assert.equal(r.aciertos, 10);
    assert.equal(r.fallos, 0);
    assert.equal(r.estrellas, 3);
    assert.ok(r.puntaje >= 100);
    assert.ok(r.habilidades.suma);
});

test('el motor aprende: tras varios aciertos seguidos en una habilidad sube su nivel', () => {
    const p = new Partida({ grado: 1, aleatorio: crearAleatorioSembrado(3), total: 60 });
    const niveles = new Set();
    while (p.iniciarPregunta()) {
        p.responder(p.pregunta.respuesta);
        niveles.add(p.motor.nivel('suma'));
    }
    assert.ok(niveles.has(2), 'debió subir de nivel');
});

test('restaura las habilidades guardadas del niño (continúa donde se quedó)', () => {
    const guardadas = { suma: { nivel: 3, intentos: [], fallosSeguidos: 0, total: 20, totalOk: 18 } };
    const p = new Partida({ grado: 2, habilidadesGuardadas: guardadas });
    assert.equal(p.motor.nivel('suma'), 3);
    assert.equal(p.motor.nivel('resta'), 1);
});

test('si cambió de grado, las habilidades que no existen en el nuevo grado se ignoran sin error', () => {
    const guardadas = { suma: { nivel: 3 }, division: { nivel: 2 } };
    const p = new Partida({ grado: 1, habilidadesGuardadas: guardadas });
    assert.equal(p.motor.nivel('suma'), 3);
    assert.equal(p.motor.habilidades.division, undefined);
});

test('los distintos grados usan solo sus habilidades', () => {
    const vistas = (grado) => {
        const p = new Partida({ grado, aleatorio: crearAleatorioSembrado(grado), total: 80 });
        const set = new Set();
        while (p.iniciarPregunta()) { set.add(p.pregunta.habilidad); p.escapo(); }
        return [...set].sort();
    };
    assert.deepEqual(vistas(1), ['resta', 'suma']);
    assert.deepEqual(vistas(6), ['combinadas', 'decimales', 'division', 'multiplos']);
});
