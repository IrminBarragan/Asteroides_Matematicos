import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PartidaPreguntas, ERRORES_PARA_ALIVIO } from '../src/core/partidaPreguntas.js';
import { normalizarResultado } from '../src/core/resultado.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

/** Generador de juguete: registra con qué grado/nivel/alivio se le pidió cada pregunta. */
function crear({ colocacion = null, habilidades = { a: { nivelMax: 3 }, b: { nivelMax: 3 } }, total, guardadas = null } = {}) {
    const pedidas = [];
    const partida = new PartidaPreguntas({
        grado: 5,
        habilidades,
        generar: ({ grado, habilidad, nivel, alivio }) => {
            pedidas.push({ grado, habilidad, nivel, alivio });
            return { habilidad, respuesta: 1, textoRespuesta: '1', pista: 'p', opciones: [{ id: 1, texto: '1' }, { id: 2, texto: '2' }], explicacion: 'e' };
        },
        preparar: (grado, nivel, { alivio }) => ({ alivio: Boolean(alivio) }),
        habilidadesGuardadas: guardadas,
        aleatorio: crearAleatorioSembrado(3),
        total,
        colocacion
    });
    return { partida, pedidas };
}
const ok = (p) => { p.iniciarPregunta(0); return p.responder(1); };
const mal = (p) => { p.iniciarPregunta(0); p.responder(2); return p.responder(1); }; // falla y luego se recupera
const escapa = (p) => { p.iniciarPregunta(0); return p.escapo(); };

// ---------- Recuperadas y estrellas ----------

test('una pregunta fallada y luego resuelta cuenta como recuperada (no como acierto)', () => {
    const { partida } = crear();
    ok(partida); mal(partida);
    assert.equal(partida.aciertos, 1);
    assert.equal(partida.fallos, 1);
    assert.equal(partida.recuperadas, 1);
});

test('equivocarse varias veces en la misma pregunta cuenta UNA recuperada', () => {
    const { partida } = crear();
    partida.iniciarPregunta(0);
    partida.responder(2); partida.responder(2); partida.responder(2);
    partida.responder(1);
    assert.equal(partida.fallos, 1);
    assert.equal(partida.recuperadas, 1);
});

test('una pregunta que se escapa es fallo pero NO recuperada', () => {
    const { partida } = crear();
    escapa(partida);
    assert.equal(partida.fallos, 1);
    assert.equal(partida.recuperadas, 0);
});

test('el defecto de la v1: terminar reintentando todo ya da 1 estrella (antes 0)', () => {
    const { partida } = crear({ total: 10 });
    for (let i = 0; i < 10; i++) mal(partida);
    const r = normalizarResultado(partida.resultado(1000));
    assert.equal(r.aciertos, 0);
    assert.equal(r.recuperadas, 10);
    assert.equal(r.estrellas, 1);
});

test('dejar escapar todo sin resolver nada sigue dando 0 estrellas (no se premia no hacer nada)', () => {
    const { partida } = crear({ total: 10 });
    for (let i = 0; i < 10; i++) escapa(partida);
    assert.equal(normalizarResultado(partida.resultado(1)).estrellas, 0);
});

test('aciertos + fallos = preguntas y recuperadas ≤ fallos, siempre', () => {
    const { partida } = crear({ total: 10 });
    const az = crearAleatorioSembrado(9);
    for (let i = 0; i < 10; i++) { const x = az(); if (x < 0.4) ok(partida); else if (x < 0.8) mal(partida); else escapa(partida); }
    const r = partida.resultado(1);
    assert.equal(r.aciertos + r.fallos, 10);
    assert.ok(r.recuperadas <= r.fallos);
    assert.doesNotThrow(() => normalizarResultado(r));
});

// ---------- Alivio ----------

test('tras 2 preguntas falladas seguidas, la siguiente baja un nivel y avisa «alivio»', () => {
    const { partida, pedidas } = crear({ guardadas: { a: { nivel: 3 }, b: { nivel: 3 } } });
    mal(partida); mal(partida);
    ok(partida);
    const ultima = pedidas[pedidas.length - 1];
    assert.equal(ultima.alivio, true);
    assert.equal(ultima.nivel, 2, 'de nivel 3 a 2');
    assert.equal(pedidas[0].alivio, false);
    assert.equal(ERRORES_PARA_ALIVIO, 2);
});

test('con 1 sola pregunta fallada no hay alivio', () => {
    const { partida, pedidas } = crear({ guardadas: { a: { nivel: 3 }, b: { nivel: 3 } } });
    mal(partida); ok(partida);
    assert.equal(pedidas[1].alivio, false);
    assert.equal(pedidas[1].nivel, 3);
});

test('acertar a la primera quita el alivio; recuperar una pregunta NO lo quita', () => {
    const { partida, pedidas } = crear({ guardadas: { a: { nivel: 3 }, b: { nivel: 3 } } });
    mal(partida); mal(partida);        // activa
    mal(partida);                      // sigue activo (era alivio, y falló otra vez)
    ok(partida);                       // acierta a la primera
    ok(partida);
    assert.equal(pedidas[2].alivio, true);
    assert.equal(pedidas[3].alivio, true);
    assert.equal(pedidas[4].alivio, false, 'tras un acierto a la primera ya no hay alivio');
});

test('el alivio nunca baja del nivel 1', () => {
    const { partida, pedidas } = crear();
    mal(partida); mal(partida); ok(partida);
    assert.equal(pedidas[2].nivel, 1);
    assert.equal(pedidas[2].alivio, true);
});

test('el alivio no cambia el nivel guardado del motor', () => {
    const { partida } = crear({ guardadas: { a: { nivel: 3 }, b: { nivel: 3 } } });
    mal(partida); mal(partida); ok(partida);
    const { habilidades } = partida.resultado(1);
    assert.ok(habilidades.a.nivel >= 1);
});

// ---------- Misión de inicio ----------

const colocacionBase = (extra = {}) => ({
    gradoMin: 1, gradoMax: 6,
    habilidadesDeGrado: (g) => ({ [`h${g}`]: { nivelMax: 3 } }),
    ...extra
});

test('la misión tiene 8 preguntas, empieza dos grados por debajo del tope y usa el nivel intermedio', () => {
    const { partida, pedidas } = crear({ colocacion: colocacionBase() });
    assert.equal(partida.total, 8);
    ok(partida);
    assert.equal(pedidas[0].grado, 4);
    assert.equal(pedidas[0].nivel, 2);
    assert.equal(pedidas[0].habilidad, 'h4', 'la habilidad es de ese grado de contenido');
});

test('la misión sube con 2 aciertos y baja con errores, y pide las preguntas del grado de la escalera', () => {
    const { partida, pedidas } = crear({ colocacion: colocacionBase() });
    ok(partida); ok(partida);   // 4 → 5
    mal(partida);               // 5 → 4
    mal(partida);               // 4 → 2 (segundo error seguido)
    ok(partida);
    assert.deepEqual(pedidas.map((p) => p.grado), [4, 4, 5, 4, 2]);
});

test('un niño que sabe todo termina la misión en el tope; uno que no sabe nada, en el piso', () => {
    const sabe = crear({ colocacion: colocacionBase() }).partida;
    for (let i = 0; i < 8; i++) ok(sabe);
    assert.equal(sabe.resultado(1).gradoContenido, 6);
    const nada = crear({ colocacion: colocacionBase() }).partida;
    for (let i = 0; i < 8; i++) mal(nada);
    assert.equal(nada.resultado(1).gradoContenido, 1);
});

test('el resultado de la misión lo marca, informa el grado y NO toca las habilidades guardadas', () => {
    const { partida } = crear({ colocacion: colocacionBase() });
    for (let i = 0; i < 8; i++) ok(partida);
    const r = partida.resultado(5000);
    assert.equal(r.colocacion, true);
    assert.equal(r.habilidades, null, 'sin habilidades: la misión no debe pisar los niveles del niño');
    assert.doesNotThrow(() => normalizarResultado(r));
    assert.equal(partida.motor.habilidades.a.total, 0, 'el motor no registró intentos');
});

test('la misión respeta el rango [gradoMin, gradoMax] del juego', () => {
    const { partida, pedidas } = crear({ colocacion: colocacionBase({ gradoMin: 3, gradoMax: 6 }) });
    for (let i = 0; i < 8; i++) mal(partida);
    assert.ok(pedidas.every((p) => p.grado >= 3 && p.grado <= 6));
    assert.equal(partida.resultado(1).gradoContenido, 3);
});

test('una partida normal NO lleva marca de misión y sí guarda habilidades', () => {
    const { partida } = crear();
    ok(partida);
    const r = partida.resultado(1);
    assert.equal(r.colocacion, undefined);
    assert.ok(r.habilidades.a);
});

test('la misión da estrellas por esforzarse igual que una partida normal', () => {
    const { partida } = crear({ colocacion: colocacionBase() });
    for (let i = 0; i < 8; i++) mal(partida);
    assert.equal(normalizarResultado(partida.resultado(1)).estrellas, 1);
});
