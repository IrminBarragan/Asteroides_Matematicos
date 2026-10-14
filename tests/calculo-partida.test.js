import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Partida } from '../src/games/calculo/logica/partida.js';
import { JuegoCalculo } from '../src/games/calculo/juego.js';
import { leccionProblema, leccionAritmetica } from '../src/lecciones/aritmetica.js';
import { validarLeccion } from '../src/lecciones/leccion.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { validarMeta } from '../src/core/juego.js';

const equivocada = (q) => q.opciones.find((o) => o.id !== q.respuesta).id;

test('meta válida: juego de matemáticas para los seis grados con misión de inicio', () => {
    validarMeta(JuegoCalculo.meta);
    assert.equal(JuegoCalculo.meta.id, 'taller-calculo');
    assert.deepEqual(JuegoCalculo.meta.grados, [1, 2, 3, 4, 5, 6]);
    assert.equal(JuegoCalculo.admiteColocacion, true);
});

test('andamiaje: se empieza con ayuda completa, baja con cada acierto a la primera y nunca pasa de «ninguno»', () => {
    const p = new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(11) });
    const vistos = [];
    // Solo habilidad «suma» para seguir un hilo: se juega hasta agotar la partida y se anota cómo evoluciona
    while (p.hayMasPreguntas) {
        const { pregunta, nivel } = p.iniciarPregunta(0);
        vistos.push({ habilidad: pregunta.habilidad, apoyo: pregunta.apoyo, nivel });
        p.responder(pregunta.respuesta);
    }
    // La primera pregunta de cada habilidad: «completo» si el nivel es 1 y «ligero» si no (apoyoInicial)
    const primeras = new Map();
    for (const v of vistos) if (!primeras.has(v.habilidad)) primeras.set(v.habilidad, v);
    for (const v of primeras.values()) assert.equal(v.apoyo, v.nivel <= 1 ? 'completo' : 'ligero');
    // Y por habilidad, acertando siempre, el apoyo solo puede bajar
    const orden = ['completo', 'ligero', 'ninguno'];
    for (const h of primeras.keys()) {
        const serie = vistos.filter((v) => v.habilidad === h).map((v) => orden.indexOf(v.apoyo));
        for (let i = 1; i < serie.length; i++) assert.ok(serie[i] >= serie[i - 1], `${h}: ${serie}`);
    }
    assert.ok(vistos.some((v) => v.apoyo === 'ninguno'), 'tras varios aciertos se retira del todo');
});

test('andamiaje: un error sube la ayuda; acertar después del error no la baja', () => {
    const p = new Partida({ grado: 4, aleatorio: crearAleatorioSembrado(5) });
    const { pregunta } = p.iniciarPregunta(0);
    const antes = p.apoyoDe(pregunta.habilidad);
    const r = p.responder(equivocada(pregunta));
    assert.equal(r.tipo, 'incorrecta');
    const tras = p.apoyoDe(pregunta.habilidad);
    assert.equal(tras, antes === 'ninguno' ? 'ligero' : 'completo');
    p.responder(equivocada(pregunta)); // otro error en la MISMA pregunta no sube más
    assert.equal(p.apoyoDe(pregunta.habilidad), tras);
    const ok = p.responder(pregunta.respuesta);
    assert.equal(ok.primerIntento, false);
    assert.equal(p.apoyoDe(pregunta.habilidad), tras, 'recuperar la pregunta no baja la ayuda');
});

test('andamiaje: tras retirarse del todo, un error la devuelve un escalón (a «ligero»)', () => {
    const p = new Partida({ grado: 4, aleatorio: crearAleatorioSembrado(21), total: 80 });
    let comprobado = false;
    while (p.hayMasPreguntas && !comprobado) {
        const { pregunta } = p.iniciarPregunta(0);
        if (p.apoyoDe(pregunta.habilidad) === 'ninguno') {
            p.responder(equivocada(pregunta));
            assert.equal(p.apoyoDe(pregunta.habilidad), 'ligero');
            comprobado = true;
        } else {
            p.responder(pregunta.respuesta);
        }
    }
    assert.ok(comprobado, 'alguna habilidad llegó a «ninguno»');
});

test('andamiaje: cada habilidad lleva su propia ayuda', () => {
    const p = new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(2) });
    const estado = {};
    for (let i = 0; i < 10; i++) {
        const { pregunta } = p.iniciarPregunta(0);
        estado[pregunta.habilidad] = p.apoyoDe(pregunta.habilidad);
        p.responder(equivocada(pregunta));
        p.responder(pregunta.respuesta);
    }
    assert.ok(Object.keys(estado).length >= 2);
    for (const h of Object.keys(estado)) assert.equal(p.apoyoDe(h), 'completo', 'si siempre se equivoca, todas vuelven a ayuda completa');
});

test('misión de inicio: no hay material ni ayuda (se mide, no se enseña) y no cambia el andamiaje', () => {
    for (let semilla = 1; semilla <= 30; semilla++) {
        const az = crearAleatorioSembrado(semilla);
        const p = new Partida({ grado: 6, aleatorio: az, colocacion: { gradoMin: 1, gradoMax: 6 } });
        while (p.hayMasPreguntas) {
            const { pregunta } = p.iniciarPregunta(0);
            assert.equal(pregunta.apoyo, 'ninguno');
            assert.equal(pregunta.material, null);
            assert.equal(pregunta.tipo, 'opciones');
            p.responder(az() < 0.5 ? pregunta.respuesta : equivocada(pregunta));
        }
        assert.deepEqual(p.apoyos, {}, 'no se guardó ninguna ayuda');
        const r = p.resultado(0);
        assert.equal(r.colocacion, true);
        assert.ok(r.gradoContenido >= 1 && r.gradoContenido <= 6);
    }
});

test('la partida normal usa solo las habilidades del grado y un grado fuera de rango se acota', () => {
    const p1 = new Partida({ grado: 1, aleatorio: crearAleatorioSembrado(1) });
    for (let i = 0; i < 10; i++) {
        const { pregunta } = p1.iniciarPregunta(0);
        assert.ok(['suma', 'resta'].includes(pregunta.habilidad));
        assert.equal(pregunta.tipo, pregunta.apoyo === 'ninguno' ? 'opciones' : 'marcos', 'en 1.º el material son los marcos');
        p1.responder(pregunta.respuesta);
    }
    const p9 = new Partida({ grado: 9, aleatorio: crearAleatorioSembrado(1) });
    assert.equal(p9.grado, 6);
    assert.equal(new Partida({ grado: 0, aleatorio: crearAleatorioSembrado(1) }).grado, 1);
});

test('el resultado se normaliza y cuenta aciertos + fallos = preguntas', () => {
    const p = new Partida({ grado: 2, aleatorio: crearAleatorioSembrado(8) });
    let i = 0;
    while (p.hayMasPreguntas) {
        const { pregunta } = p.iniciarPregunta(0);
        if (i++ % 3 === 0) p.responder(equivocada(pregunta));
        p.responder(pregunta.respuesta);
    }
    const r = p.resultado(5000);
    assert.equal(r.aciertos + r.fallos, p.total);
    assert.equal(r.recuperadas, r.fallos, 'todas las falladas se recuperaron');
    assert.ok(r.habilidades && Object.keys(r.habilidades).length >= 2);
});

// ---------- Lecciones ----------

const ECUACION = /^(\d+) ([+−]) (\d+) = \?$/;

function revisarHazlos(leccion) {
    for (const paso of leccion.pasos) {
        if (!paso.hazlo) continue;
        const m = ECUACION.exec(paso.hazlo.enunciado);
        assert.ok(m, `formato del «hazlo»: ${paso.hazlo.enunciado}`);
        const esperado = m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
        assert.equal(paso.hazlo.respuesta, esperado, paso.hazlo.enunciado);
        // El texto del mismo paso no puede traer la ecuación ya resuelta
        const resuelta = paso.hazlo.enunciado.replace('?', String(esperado));
        assert.ok(!paso.texto.includes(resuelta), `se filtró la respuesta: «${paso.texto}»`);
    }
}

test('lecciones propias: cada habilidad y nivel produce una lección válida con «hazlo» correctos', () => {
    for (const grado of [1, 2, 3, 4, 5, 6]) {
        const p = new Partida({ grado, aleatorio: crearAleatorioSembrado(grado * 31) });
        for (let i = 0; i < 10; i++) {
            const { pregunta } = p.iniciarPregunta(0);
            const leccion = p.leccionPara(pregunta);
            validarLeccion(leccion);
            revisarHazlos(leccion);
            const intro = p.leccionIntro(pregunta.habilidad);
            validarLeccion(intro);
            assert.match(intro.titulo, /^Antes de empezar: /);
            p.responder(pregunta.respuesta);
        }
    }
});

test('lección de problemas: lee, decide la operación y calcula con los números del problema', () => {
    const l = leccionProblema({ operacion: 'resta', x: 63, y: 28, historia: 'Ana tiene 63 galletas y regala 28. ¿Cuántas galletas le quedan?', clave: 'Regala: se quita.' });
    validarLeccion(l);
    assert.equal(l.titulo, 'Cómo resolver un problema');
    assert.match(l.pasos[0].texto, /lee con calma/i);
    assert.equal(l.pasos[0].visual.enunciado, 'Ana tiene 63 galletas y regala 28. ¿Cuántas galletas le quedan?');
    assert.match(l.pasos[1].texto, /una resta/);
    const hazlo = l.pasos.find((s) => s.hazlo).hazlo;
    assert.equal(hazlo.enunciado, '63 − 28 = ?');
    assert.equal(hazlo.respuesta, 35);
    assert.ok(hazlo.opciones.includes(35));
    assert.match(leccionProblema({ operacion: 'suma', x: 5, y: 3, historia: 'h', clave: 'c' }).pasos[1].texto, /una suma/);
    assert.equal(leccionAritmetica('problemas', null), null, 'sin datos no hay lección propia');
});
