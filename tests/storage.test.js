import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    Progreso, AlmacenMemoria, CLAVE_ALMACEN, VERSION_ESQUEMA, MAX_PERFILES, MAX_LARGO_APODO,
    limpiarApodo, esquemaValido, crearDatosIniciales, migrar
} from '../src/core/storage.js';

const nuevo = (almacen = new AlmacenMemoria()) => new Progreso(almacen, { ahora: () => 1000 });
const luisa = { apodo: 'Luisa', avatar: 'gato', grado: 3 };
const resultado = (puntaje, estrellas) => ({ aciertos: 1, fallos: 0, tiempoMs: 1, puntaje, estrellas });

test('sin datos previos arranca vacío y sin perfil activo', () => {
    const p = nuevo();
    assert.equal(p.perfilActivo(), null);
    assert.deepEqual(p.listarPerfiles(), []);
    assert.equal(p.recuperadoDeError, false);
});

test('crear perfil lo deja activo y persiste entre sesiones', () => {
    const almacen = new AlmacenMemoria();
    nuevo(almacen).crearPerfil(luisa);
    const otraSesion = nuevo(almacen);
    assert.equal(otraSesion.perfilActivo().apodo, 'Luisa');
    assert.equal(otraSesion.perfilActivo().grado, 3);
});

test('varios niños comparten el equipo: cada uno conserva su progreso', () => {
    const p = nuevo();
    const a = p.crearPerfil(luisa);
    p.registrarResultado('asteroides', resultado(100, 3));
    const b = p.crearPerfil({ apodo: 'Mateo', avatar: 'perro', grado: 1 });
    p.registrarResultado('asteroides', resultado(20, 1));

    p.seleccionarPerfil(a.id);
    assert.equal(p.estadoJuego('asteroides').mejorPuntaje, 100);
    p.seleccionarPerfil(b.id);
    assert.equal(p.estadoJuego('asteroides').mejorPuntaje, 20);
});

test('validación: apodo vacío, avatar inválido, grado inválido, duplicado', () => {
    const p = nuevo();
    assert.throws(() => p.crearPerfil({ ...luisa, apodo: '   ' }), /vacío/);
    assert.throws(() => p.crearPerfil({ ...luisa, avatar: 'dragon' }), /Avatar/);
    assert.throws(() => p.crearPerfil({ ...luisa, grado: 7 }), /grado/);
    assert.throws(() => p.crearPerfil({ ...luisa, grado: '3' }), /grado/);
    p.crearPerfil(luisa);
    assert.throws(() => p.crearPerfil({ ...luisa, apodo: 'LUISA' }), /Ya existe/);
});

test('límite de perfiles por equipo', () => {
    const p = nuevo();
    for (let i = 0; i < MAX_PERFILES; i++) p.crearPerfil({ apodo: `niño${i}`, avatar: 'gato', grado: 1 });
    assert.throws(() => p.crearPerfil({ apodo: 'extra', avatar: 'gato', grado: 1 }), /Máximo/);
});

test('limpiarApodo quita control y < >, colapsa espacios y acota el largo', () => {
    assert.equal(limpiarApodo('  Ana   María  '), 'Ana María');
    assert.equal(limpiarApodo('<b>Hola</b>'), 'bHola/b'); // quita < y >; el texto se muestra siempre con textContent
    assert.equal(limpiarApodo('a\u0000b\n'), 'ab');
    assert.equal(limpiarApodo('x'.repeat(100)).length, MAX_LARGO_APODO);
    assert.equal(limpiarApodo(null), '');
});

test('los ids no se reutilizan al eliminar perfiles', () => {
    const p = nuevo();
    const a = p.crearPerfil(luisa);
    p.eliminarPerfil(a.id);
    const b = p.crearPerfil(luisa);
    assert.notEqual(a.id, b.id);
});

test('eliminar el perfil activo cierra la sesión', () => {
    const p = nuevo();
    const a = p.crearPerfil(luisa);
    assert.equal(p.eliminarPerfil(a.id), true);
    assert.equal(p.perfilActivo(), null);
    assert.equal(p.eliminarPerfil(999), false);
});

test('registrarResultado: récord, mejores estrellas y contador de partidas', () => {
    const p = nuevo();
    p.crearPerfil(luisa);
    assert.deepEqual(p.registrarResultado('j', resultado(50, 2)), { esRecord: true, estrellasGanadas: 2 });
    assert.deepEqual(p.registrarResultado('j', resultado(30, 1)), { esRecord: false, estrellasGanadas: 0 });
    assert.deepEqual(p.registrarResultado('j', resultado(80, 3)), { esRecord: true, estrellasGanadas: 1 });
    const e = p.estadoJuego('j');
    assert.equal(e.partidas, 3);
    assert.equal(e.mejorPuntaje, 80);
    assert.equal(e.mejorEstrellas, 3);
});

test('estrellasTotales suma la MEJOR marca por juego (repetir un juego no infla el total)', () => {
    const p = nuevo();
    p.crearPerfil(luisa);
    for (let i = 0; i < 10; i++) p.registrarResultado('a', resultado(10, 2));
    p.registrarResultado('b', resultado(10, 3));
    assert.equal(p.estrellasTotales(), 5);
});

test('operaciones del perfil sin sesión lanzan un error claro', () => {
    assert.throws(() => nuevo().registrarResultado('j', resultado(1, 1)), /perfil activo/);
});

test('el estado devuelto es una copia: modificarla no altera el progreso', () => {
    const p = nuevo();
    p.crearPerfil(luisa);
    p.perfilActivo().apodo = 'Hackeado';
    p.listarPerfiles()[0].grado = 6;
    assert.equal(p.perfilActivo().apodo, 'Luisa');
    assert.equal(p.perfilActivo().grado, 3);
});

test('habilidades: se guardan y recuperan por juego y por perfil', () => {
    const p = nuevo();
    p.crearPerfil(luisa);
    assert.equal(p.obtenerHabilidades('j'), null);
    p.guardarHabilidades('j', { suma: { nivel: 2 } });
    assert.deepEqual(p.obtenerHabilidades('j'), { suma: { nivel: 2 } });
});

test('ajustes: solo se aceptan los conocidos y valores sí/no', () => {
    const p = nuevo();
    p.establecerAjuste('sonido', false);
    assert.equal(p.ajustes().sonido, false);
    assert.throws(() => p.establecerAjuste('inexistente', true), /desconocido/);
    assert.throws(() => p.establecerAjuste('sonido', 'si'), /sí\/no/);
});

test('cambiarGrado valida y persiste', () => {
    const almacen = new AlmacenMemoria();
    const p = nuevo(almacen);
    p.crearPerfil(luisa);
    p.cambiarGrado(5);
    assert.equal(nuevo(almacen).perfilActivo().grado, 5);
    assert.throws(() => p.cambiarGrado(0));
});

test('JSON dañado: arranca limpio, avisa y conserva copia del dato dañado', () => {
    const almacen = new AlmacenMemoria();
    almacen.setItem(CLAVE_ALMACEN, '{esto no es json');
    const p = nuevo(almacen);
    assert.equal(p.recuperadoDeError, true);
    assert.deepEqual(p.listarPerfiles(), []);
    assert.equal(almacen.getItem(`${CLAVE_ALMACEN}-danado`), '{esto no es json');
});

test('estructura válida como JSON pero inválida como esquema: se descarta', () => {
    const almacen = new AlmacenMemoria();
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify({ version: 1, ajustes: {}, perfiles: { 1: { id: 1 } }, siguienteId: 2, perfilActivo: null }));
    const p = nuevo(almacen);
    assert.equal(p.recuperadoDeError, true);
});

test('un perfil activo que no existe invalida el esquema', () => {
    const d = crearDatosIniciales();
    d.perfilActivo = 5;
    assert.equal(esquemaValido(d), false);
});

test('datos de una versión futura se tratan como inválidos sin destruirlos', () => {
    const almacen = new AlmacenMemoria();
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify({ ...crearDatosIniciales(), version: VERSION_ESQUEMA + 1 }));
    const p = nuevo(almacen);
    assert.equal(p.recuperadoDeError, true);
    assert.ok(almacen.getItem(`${CLAVE_ALMACEN}-danado`));
});

test('migrar aplica las migraciones en orden hasta la versión objetivo', () => {
    const migraciones = {
        1: (d) => ({ ...d, nuevo: 'v2' }),
        2: (d) => ({ ...d, nuevo2: d.nuevo + '-v3' })
    };
    const r = migrar({ version: 1 }, migraciones, 3);
    assert.equal(r.version, 3);
    assert.equal(r.nuevo2, 'v2-v3');
});

test('migrar falla con claridad si falta un paso', () => {
    assert.throws(() => migrar({ version: 1 }, {}, 2), /No hay migración/);
});

test('si localStorage lanza al guardar (lleno/bloqueado), sigue funcionando en memoria', () => {
    const roto = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem() {} };
    const p = nuevo(roto);
    p.crearPerfil(luisa);
    assert.equal(p.guardadoFallido, true);
    assert.equal(p.perfilActivo().apodo, 'Luisa'); // sigue en memoria
});

test('si localStorage lanza al leer, arranca limpio sin romper', () => {
    const roto = { getItem: () => { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    assert.deepEqual(nuevo(roto).listarPerfiles(), []);
});

test('reiniciarTodo borra perfiles y ajustes', () => {
    const almacen = new AlmacenMemoria();
    const p = nuevo(almacen);
    p.crearPerfil(luisa);
    p.reiniciarTodo();
    assert.deepEqual(nuevo(almacen).listarPerfiles(), []);
});
