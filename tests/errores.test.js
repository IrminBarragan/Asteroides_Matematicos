import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limpiarErrores, normalizarResultado, MAX_LARGO_TIPO_ERROR, MAX_ERRORES_POR_PARTIDA } from '../src/core/resultado.js';
import { Progreso, AlmacenMemoria, CLAVE_ALMACEN, VERSION_ESQUEMA, esquemaValido, crearDatosIniciales, migrar } from '../src/core/storage.js';
import { PartidaPreguntas, OTRA_EQUIVOCACION, SE_ESCAPO } from '../src/core/partidaPreguntas.js';
import { Partida as PartidaCalculo } from '../src/games/calculo/logica/partida.js';
import { Partida as PartidaBloques } from '../src/games/bloques/logica/partida.js';
import { Partida as PartidaCajas } from '../src/games/cajas/logica/partida.js';
import { generarPregunta as generarCalculo, habilidadesParaGrado as habCalculo } from '../src/games/calculo/logica/generadores.js';
import { generarPregunta as generarBloques, habilidadesParaGrado as habBloques } from '../src/games/bloques/logica/generadores.js';
import { generarPregunta as generarCajas, habilidadesParaGrado as habCajas } from '../src/games/cajas/logica/generadores.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

// ---------- limpiarErrores / normalizarResultado ----------

test('limpiarErrores: deja las equivocaciones válidas, con nombre limpio, y nunca lanza', () => {
    assert.deepEqual(limpiarErrores([{ habilidad: 'suma', tipo: 'olvidó la llevada', veces: 3 }]), [{ habilidad: 'suma', tipo: 'olvidó la llevada', veces: 3 }]);
    assert.deepEqual(limpiarErrores([{ habilidad: 'suma', tipo: '', veces: 1 }]), [{ habilidad: 'suma', tipo: 'otra equivocación', veces: 1 }], 'sin nombre → «otra equivocación»');
    assert.deepEqual(limpiarErrores(undefined), []);
    assert.deepEqual(limpiarErrores('x'), []);
    assert.deepEqual(limpiarErrores([null, 5, { veces: 2 }, { habilidad: 'a', tipo: 't', veces: 0 }, { habilidad: 'a', tipo: 't', veces: 1.5 }, { habilidad: 'a', tipo: 't', veces: -1 }]), []);
    const sucio = limpiarErrores([{ habilidad: 'a<script>', tipo: 'x\u0000y'.padEnd(200, 'z'), veces: 1 }]);
    assert.ok(!sucio[0].habilidad.includes('<'));
    assert.ok(sucio[0].tipo.length <= MAX_LARGO_TIPO_ERROR && !sucio[0].tipo.includes('\u0000'));
    assert.equal(limpiarErrores(Array.from({ length: 500 }, (_, i) => ({ habilidad: `h${i}`, tipo: 't', veces: 1 }))).length, MAX_ERRORES_POR_PARTIDA);
});

test('normalizarResultado: conserva y limpia `errores`, y no lo inventa si no viene', () => {
    const base = { aciertos: 2, fallos: 1, tiempoMs: 10 };
    assert.equal('errores' in normalizarResultado(base), false);
    const r = normalizarResultado({ ...base, errores: [{ habilidad: 'resta', tipo: 'restó al revés', veces: 2 }, { basura: true }] });
    assert.deepEqual(r.errores, [{ habilidad: 'resta', tipo: 'restó al revés', veces: 2 }]);
});

// ---------- La partida cuenta lo que el niño eligió ----------

function partidaSencilla() {
    const preguntas = [
        { habilidad: 'suma', respuesta: 10, textoRespuesta: '10', pista: 'p', opciones: [{ id: 10, texto: '10' }, { id: 5, texto: '5', error: 'sumó en vez de multiplicar' }, { id: 7, texto: '7' }] },
        { habilidad: 'suma', respuesta: 20, textoRespuesta: '20', pista: 'p', opciones: [{ id: 20, texto: '20' }, { id: 9, texto: '9', error: 'sumó en vez de multiplicar' }] },
        { habilidad: 'resta', respuesta: 1, textoRespuesta: '1', pista: 'p', opciones: [{ id: 1, texto: '1' }, { id: 3, texto: '3' }] }
    ];
    let i = 0;
    return new PartidaPreguntas({ grado: 1, habilidades: { suma: { nivelMax: 3 }, resta: { nivelMax: 3 } }, generar: () => preguntas[i++], total: 3 });
}

test('partida: cuenta cada respuesta equivocada con el nombre de su error y las sin nombre como «otra equivocación»', () => {
    const p = partidaSencilla();
    p.iniciarPregunta(0);
    p.responder(5); p.responder(5); p.responder(7); p.responder(10); // dos veces el error con nombre, una sin nombre
    p.iniciarPregunta(0);
    p.responder(9); p.responder(20);
    p.iniciarPregunta(0);
    p.responder(3); p.responder(1);
    const errores = Object.fromEntries(p.resultado(0).errores.map((e) => [`${e.habilidad}/${e.tipo}`, e.veces]));
    assert.deepEqual(errores, { 'suma/sumó en vez de multiplicar': 3, [`suma/${OTRA_EQUIVOCACION}`]: 1, [`resta/${OTRA_EQUIVOCACION}`]: 1 });
});

test('partida: un valor que no es una opción (lo que dio el material) cuenta como «otra equivocación» y acertar no cuenta nada', () => {
    const p = partidaSencilla();
    p.iniciarPregunta(0);
    p.responder(999);
    p.responder(10);
    assert.deepEqual(p.resultado(0).errores, [{ habilidad: 'suma', tipo: OTRA_EQUIVOCACION, veces: 1 }]);
    const limpia = partidaSencilla();
    limpia.iniciarPregunta(0);
    limpia.responder(10);
    assert.deepEqual(limpia.resultado(0).errores, []);
});

test('partida: lo que se escapa (Asteroides, Ortografía) cuenta como «se le escapó»', () => {
    const p = partidaSencilla();
    p.iniciarPregunta(0);
    p.escapo({ ahoraMs: 5 });
    assert.deepEqual(p.resultado(0).errores, [{ habilidad: 'suma', tipo: SE_ESCAPO, veces: 1 }]);
});

test('en la misión de inicio también se cuentan las equivocaciones', () => {
    const p = new PartidaCalculo({ grado: 4, aleatorio: crearAleatorioSembrado(3), colocacion: { gradoMin: 1, gradoMax: 4 } });
    let hubo = 0;
    while (p.hayMasPreguntas) {
        const { pregunta } = p.iniciarPregunta(0);
        p.responder(pregunta.opciones.find((o) => o.id !== pregunta.respuesta).id);
        hubo++;
        p.responder(pregunta.respuesta);
    }
    const total = p.resultado(0).errores.reduce((s, e) => s + e.veces, 0);
    assert.equal(total, hubo);
});

// ---------- Las etiquetas de los generadores ----------

for (const [nombre, generar, habilidades] of [['Taller de Cálculo', generarCalculo, habCalculo], ['Bloques de Valor', generarBloques, habBloques], ['Cajas y Reparto', generarCajas, habCajas]]) {
    test(`${nombre}: toda opción con nombre de error es un error (no la respuesta), con nombre legible y único por opción`, () => {
        let etiquetadas = 0;
        for (const grado of [1, 2, 3, 4, 5, 6]) {
            for (const habilidad of Object.keys(habilidades(grado))) {
                for (const nivel of [1, 2, 3]) {
                    for (let semilla = 1; semilla <= 40; semilla++) {
                        const q = generar({ grado, habilidad, nivel, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla * 31 + nivel), apoyo: 'ninguno' });
                        const conNombre = q.opciones.filter((o) => 'error' in o);
                        assert.ok(conNombre.length <= 1, 'a lo sumo la opción más reveladora lleva nombre');
                        for (const o of conNombre) {
                            assert.notEqual(o.id, q.respuesta, `la respuesta correcta no puede ser un «error»: ${q.enunciado}`);
                            assert.ok(typeof o.error === 'string' && o.error.length >= 8 && o.error.length <= MAX_LARGO_TIPO_ERROR, `nombre ${JSON.stringify(o.error)}`);
                            assert.doesNotMatch(o.error, /undefined|NaN|null/);
                            etiquetadas++;
                        }
                    }
                }
            }
        }
        assert.ok(etiquetadas > 200, `hay etiquetas (${etiquetadas})`);
    });
}

test('las etiquetas dicen lo que realmente hizo el niño: olvidó la llevada y restó al revés', () => {
    for (let semilla = 1; semilla <= 200; semilla++) {
        const s = generarBloques({ grado: 4, habilidad: 'llevada', nivel: 2, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
        const [a, b] = s.enunciado.match(/\d+/g).map(Number);
        const e = s.opciones.find((o) => o.error === 'olvidó la llevada');
        // recalculado a mano: sumar cada columna e ignorar lo que se lleva
        let sinLlevar = 0;
        for (let k = 0; k < 6; k++) sinLlevar += (((Math.floor(a / 10 ** k) % 10) + (Math.floor(b / 10 ** k) % 10)) % 10) * 10 ** k;
        assert.equal(e.id, sinLlevar, s.enunciado);
        const t = generarBloques({ grado: 4, habilidad: 'prestamo', nivel: 2, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
        const [x, y] = t.enunciado.match(/\d+/g).map(Number);
        let alReves = 0;
        for (let k = 0; k < 6; k++) alReves += Math.abs((Math.floor(x / 10 ** k) % 10) - (Math.floor(y / 10 ** k) % 10)) * 10 ** k;
        assert.equal(t.opciones.find((o) => o.error === 'restó al revés cada columna').id, alReves, t.enunciado);
    }
});

test('una partida real de Cajas y Reparto acumula equivocaciones con nombre', () => {
    const p = new PartidaCajas({ grado: 3, aleatorio: crearAleatorioSembrado(8), total: 40 });
    while (p.hayMasPreguntas) {
        const { pregunta } = p.iniciarPregunta(0);
        const mala = pregunta.opciones.find((o) => o.error) ?? pregunta.opciones.find((o) => o.id !== pregunta.respuesta);
        p.responder(mala.id);
        p.responder(pregunta.respuesta);
    }
    const errores = p.resultado(0).errores;
    assert.ok(errores.some((e) => e.tipo === 'sumó en vez de multiplicar'));
    assert.ok(errores.every((e) => e.veces >= 1 && e.habilidad));
    const p2 = new PartidaBloques({ grado: 3, aleatorio: crearAleatorioSembrado(8), total: 10 });
    assert.deepEqual(p2.resultado(0).errores, []);
});

// ---------- Almacenamiento: esquema v5 ----------

const luisa = { apodo: 'Luisa', avatar: 'gato', grado: 4 };

test('migración 4 → 5: los perfiles ganan `errores` vacío y no pierden nada', () => {
    const v4 = { version: 4, ajustes: {}, perfilActivo: 1, siguienteId: 2, perfiles: { 1: { id: 1, apodo: 'Ana', avatar: 'gato', grado: 5, juegos: {}, habilidades: {}, contenido: { reloj: 3 }, lecciones: {}, pegatinas: [], creado: 1 } } };
    const v5 = migrar(v4);
    assert.equal(v5.version, 5);
    assert.deepEqual(v5.perfiles[1].errores, {});
    assert.deepEqual(v5.perfiles[1].contenido, { reloj: 3 });
    assert.equal(v4.perfiles[1].errores, undefined, 'no modifica el original');
    const almacen = new AlmacenMemoria();
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(v4));
    const p = new Progreso(almacen);
    assert.equal(p.recuperadoDeError, false);
    assert.deepEqual(p.perfilActivo().errores, {});
    assert.equal(VERSION_ESQUEMA, 5);
});

test('registrarResultado suma los conteos de equivocaciones por juego, habilidad y tipo (partida tras partida)', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.crearPerfil(luisa);
    const resultado = (errores) => ({ aciertos: 1, fallos: 1, tiempoMs: 1, puntaje: 5, estrellas: 1, errores });
    p.registrarResultado('taller-calculo', resultado([{ habilidad: 'suma', tipo: 'olvidó la llevada', veces: 2 }, { habilidad: 'resta', tipo: 'restó al revés', veces: 1 }]));
    p.registrarResultado('taller-calculo', resultado([{ habilidad: 'suma', tipo: 'olvidó la llevada', veces: 3 }]));
    p.registrarResultado('bloques-valor', resultado([{ habilidad: 'suma', tipo: 'olvidó la llevada', veces: 1 }]));
    p.registrarResultado('reloj', { aciertos: 1, fallos: 0, tiempoMs: 1, puntaje: 5, estrellas: 3 });
    assert.deepEqual(p.perfilActivo().errores, {
        'taller-calculo': { suma: { 'olvidó la llevada': 5 }, resta: { 'restó al revés': 1 } },
        'bloques-valor': { suma: { 'olvidó la llevada': 1 } }
    });
});

test('los conteos sobreviven a recargar y un esquema con `errores` manipulado se rechaza', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.crearPerfil(luisa);
    p.registrarResultado('cajas-reparto', { aciertos: 1, fallos: 1, tiempoMs: 1, puntaje: 5, estrellas: 1, errores: [{ habilidad: 'tabla', tipo: 'sumó en vez de multiplicar', veces: 4 }] });
    assert.deepEqual(new Progreso(almacen).perfilActivo().errores, { 'cajas-reparto': { tabla: { 'sumó en vez de multiplicar': 4 } } });

    const bueno = JSON.parse(almacen.getItem(CLAVE_ALMACEN));
    assert.equal(esquemaValido(bueno), true);
    for (const malo of [{ a: 1 }, { j: { h: 5 } }, { j: { h: { t: -1 } } }, { j: { h: { t: 1.5 } } }, { j: { h: { t: 'x' } } }, []]) {
        const roto = JSON.parse(JSON.stringify(bueno));
        roto.perfiles[1].errores = malo;
        assert.equal(esquemaValido(roto), false, JSON.stringify(malo));
    }
    assert.equal(esquemaValido(crearDatosIniciales()), true);
});

test('registrarResultado ignora errores dañados sin impedir guardar la partida', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.crearPerfil(luisa);
    p.registrarResultado('reloj', { aciertos: 1, fallos: 1, tiempoMs: 1, puntaje: 5, estrellas: 1, errores: [{ habilidad: 'x', tipo: 'y', veces: 'mucho' }, 7] });
    assert.deepEqual(p.perfilActivo().errores, {});
    assert.equal(p.perfilActivo().juegos.reloj.partidas, 1);
});
