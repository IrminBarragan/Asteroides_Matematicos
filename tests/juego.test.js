import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Juego, validarMeta } from '../src/core/juego.js';
import { RegistroJuegos } from '../src/core/registro.js';
import { JuegoEjemplo } from './auxiliares/juegoEjemplo.js';

const metaValida = JuegoEjemplo.meta;

test('validarMeta acepta una meta correcta', () => {
    assert.equal(validarMeta(metaValida), metaValida);
});

test('validarMeta rechaza metas incompletas o inválidas', () => {
    assert.throws(() => validarMeta(undefined), /static meta/);
    assert.throws(() => validarMeta({ ...metaValida, id: 'Con Espacios' }), /meta.id/);
    assert.throws(() => validarMeta({ ...metaValida, nombre: ' ' }), /nombre/);
    assert.throws(() => validarMeta({ ...metaValida, descripcion: '' }), /descripcion/);
    assert.throws(() => validarMeta({ ...metaValida, area: 'deportes' }), /area/);
    assert.throws(() => validarMeta({ ...metaValida, grados: [] }), /grados/);
    assert.throws(() => validarMeta({ ...metaValida, grados: [0, 7] }), /grados/);
});

test('ciclo de vida: creado → jugando → pausado → jugando → destruido', () => {
    const j = new JuegoEjemplo();
    const contenedor = {};
    assert.equal(j.estado, 'creado');
    j.montar(contenedor, { grado: 2 });
    assert.equal(j.estado, 'jugando');
    assert.equal(contenedor.contenido, 'grado 2');
    j.pausar();
    assert.equal(j.estado, 'pausado');
    j.reanudar();
    assert.equal(j.estado, 'jugando');
    j.destruir();
    assert.equal(j.estado, 'destruido');
    assert.deepEqual(j.llamadas, ['montar', 'pausar', 'reanudar', 'destruir']);
    assert.equal(contenedor.contenido, null);
});

test('transiciones inválidas se ignoran sin efectos', () => {
    const j = new JuegoEjemplo();
    j.pausar();          // aún no montado
    j.reanudar();
    assert.deepEqual(j.llamadas, []);
    j.montar({}, {});
    j.reanudar();        // ya está jugando
    j.pausar();
    j.pausar();          // ya pausado: no repite
    assert.deepEqual(j.llamadas, ['montar', 'pausar']);
});

test('no se puede montar dos veces', () => {
    const j = new JuegoEjemplo();
    j.montar({}, {});
    assert.throws(() => j.montar({}, {}), /No se puede montar/);
});

test('destruir es idempotente y limpia el bus (sin fugas)', () => {
    const j = new JuegoEjemplo();
    j.montar({}, {});
    j.alTerminar(() => {});
    assert.equal(j.bus.cantidad('fin'), 1);
    j.destruir();
    j.destruir();
    assert.equal(j.limpiezas, 1);
    assert.equal(j.bus.cantidad('fin'), 0);
});

test('destruir limpia el estado aunque alDestruir falle', () => {
    class Roto extends JuegoEjemplo {
        alDestruir() { throw new Error('boom'); }
    }
    const j = new Roto();
    j.montar({}, {});
    assert.throws(() => j.destruir(), /boom/);
    assert.equal(j.estado, 'destruido');
    assert.equal(j.bus.cantidad('fin'), 0);
});

test('finalizar emite el resultado normalizado una sola vez y pasa a terminado', () => {
    const j = new JuegoEjemplo();
    const recibidos = [];
    j.alTerminar((r) => recibidos.push(r));
    j.montar({}, {});
    j.responder(true); j.responder(true); j.responder(false);
    assert.equal(j.estado, 'terminado');
    assert.equal(recibidos.length, 1);
    assert.equal(recibidos[0].aciertos, 2);
    assert.equal(recibidos[0].estrellas, 1);   // 2/3 = 67% → 1 estrella
    assert.equal(recibidos[0].puntaje, 20);
    j.finalizar({ aciertos: 9, fallos: 0, tiempoMs: 1 }); // segundo intento: ignorado
    assert.equal(recibidos.length, 1);
});

test('finalizar con un resultado inválido lanza y no cambia el estado', () => {
    const j = new JuegoEjemplo();
    j.montar({}, {});
    assert.throws(() => j.finalizar({ aciertos: -1, fallos: 0, tiempoMs: 0 }));
    assert.equal(j.estado, 'jugando');
});

test('finalizar fuera de una partida (sin montar o destruido) se ignora', () => {
    const j = new JuegoEjemplo();
    const recibidos = [];
    j.alTerminar((r) => recibidos.push(r));
    j.finalizar({ aciertos: 1, fallos: 0, tiempoMs: 1 });
    j.montar({}, {});
    j.destruir();
    j.finalizar({ aciertos: 1, fallos: 0, tiempoMs: 1 });
    assert.equal(recibidos.length, 0);
});

test('un juego que no implementa alMontar falla con un mensaje claro', () => {
    class Incompleto extends Juego { static meta = metaValida; }
    assert.throws(() => new Incompleto().montar({}, {}), /alMontar/);
});

test('meta es accesible desde la instancia', () => {
    assert.equal(new JuegoEjemplo().meta.id, 'ejemplo');
});

// ---------- Registro ----------

class OtroJuego extends JuegoEjemplo {
    static meta = { ...metaValida, id: 'otro', nombre: 'Otro', grados: [5, 6] };
}

test('registro: lista, busca por id y filtra por grado', () => {
    const r = new RegistroJuegos().registrar(JuegoEjemplo).registrar(OtroJuego);
    assert.deepEqual(r.listar().map((m) => m.id), ['ejemplo', 'otro']);
    assert.deepEqual(r.porGrado(2).map((m) => m.id), ['ejemplo']);
    assert.deepEqual(r.porGrado(6).map((m) => m.id), ['otro']);
    assert.deepEqual(r.porGrado(4), []);
    assert.equal(r.obtener('otro'), OtroJuego);
    assert.equal(r.obtener('nada'), null);
});

test('registro: rechaza ids repetidos y metas inválidas', () => {
    const r = new RegistroJuegos().registrar(JuegoEjemplo);
    assert.throws(() => r.registrar(JuegoEjemplo), /Ya hay un juego/);
    class Malo extends Juego { static meta = { id: 'x' }; }
    assert.throws(() => r.registrar(Malo));
});

test('registro: crear devuelve instancias nuevas e independientes', () => {
    const r = new RegistroJuegos().registrar(JuegoEjemplo);
    const a = r.crear('ejemplo');
    const b = r.crear('ejemplo');
    assert.notEqual(a, b);
    assert.notEqual(a.bus, b.bus);
    assert.throws(() => r.crear('nada'), /No existe/);
});
