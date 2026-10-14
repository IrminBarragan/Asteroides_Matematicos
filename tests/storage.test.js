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

// ---------- v0.2: grado de contenido y migración 1 → 2 ----------

test('migración 1 → 2: un perfil guardado con la v0.1 se conserva y gana `contenido` vacío', () => {
    const almacen = new AlmacenMemoria();
    const v1 = {
        version: 1, ajustes: { sonido: false, lecturaAsistida: true }, perfilActivo: 1, siguienteId: 2,
        perfiles: { 1: { id: 1, apodo: 'Ana', avatar: 'gato', grado: 6, juegos: { reloj: { partidas: 2, mejorPuntaje: 90, mejorEstrellas: 2 } }, habilidades: { reloj: { 'leer-hora': { nivel: 2 } } }, creado: 5 } }
    };
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(v1));
    const p = new Progreso(almacen);
    assert.equal(p.recuperadoDeError, false);
    const ana = p.perfilActivo();
    assert.equal(ana.apodo, 'Ana');
    assert.equal(ana.juegos.reloj.partidas, 2, 'no se pierde el progreso');
    assert.equal(ana.habilidades.reloj['leer-hora'].nivel, 2);
    assert.deepEqual(ana.contenido, {});
    assert.deepEqual(ana.lecciones, {});
    assert.equal(p.ajustes().sonido, false);
    assert.equal(p.datos.version, VERSION_ESQUEMA);
});

test('migrar no modifica el objeto original y rehace el paso con varios perfiles', () => {
    const v1 = { version: 1, perfiles: { 1: { id: 1 }, 2: { id: 2 } } };
    const v2 = migrar(v1);
    assert.equal(v1.version, 1);
    assert.equal(v1.perfiles[1].contenido, undefined);
    assert.deepEqual(v2.perfiles[1].contenido, {});
    assert.deepEqual(v2.perfiles[2].contenido, {});
    assert.deepEqual(v2.perfiles[1].lecciones, {});
    assert.equal(v2.version, VERSION_ESQUEMA);
});

test('un perfil nuevo empieza sin grado de contenido (la misión de inicio lo decidirá)', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 4 });
    assert.equal(p.obtenerGradoContenido('asteroides'), null);
});

test('guardar y leer el grado de contenido; solo 1..6 enteros', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    p.guardarGradoContenido('asteroides', 3);
    assert.equal(p.obtenerGradoContenido('asteroides'), 3);
    assert.equal(p.obtenerGradoContenido('reloj'), null, 'cada juego tiene el suyo');
    for (const malo of [0, 7, 2.5, '3', null, NaN]) assert.throws(() => p.guardarGradoContenido('asteroides', malo), /1 a 6/);
});

test('el grado de contenido persiste entre cargas', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    p.guardarGradoContenido('asteroides', 2);
    const otro = new Progreso(almacen);
    otro.seleccionarPerfil(1);
    assert.equal(otro.obtenerGradoContenido('asteroides'), 2);
});

test('datos con un grado de contenido inválido se tratan como dato dañado (no confiable)', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    const datos = JSON.parse(almacen.getItem(CLAVE_ALMACEN));
    datos.perfiles[1].contenido = { asteroides: 99 };
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
    const recargado = new Progreso(almacen);
    assert.equal(recargado.recuperadoDeError, true);
    assert.equal(recargado.listarPerfiles().length, 0);
    assert.ok(almacen.getItem(`${CLAVE_ALMACEN}-danado`), 'se conserva copia del dato dañado');
});

test('reiniciarHabilidades borra solo las de ese juego', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    p.guardarHabilidades('a', { x: { nivel: 2 } });
    p.guardarHabilidades('b', { y: { nivel: 3 } });
    p.reiniciarHabilidades('a');
    assert.equal(p.obtenerHabilidades('a'), null);
    assert.ok(p.obtenerHabilidades('b'));
});

test('reiniciarColocacion borra el contenido y las habilidades del niño (misión de nuevo), no sus estrellas', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    p.registrarResultado('a', { puntaje: 10, estrellas: 2 });
    p.guardarGradoContenido('a', 3);
    p.guardarHabilidades('a', { x: { nivel: 2 } });
    assert.equal(p.reiniciarColocacion(1), true);
    assert.equal(p.obtenerGradoContenido('a'), null);
    assert.equal(p.obtenerHabilidades('a'), null);
    assert.equal(p.estrellasTotales(), 2);
    assert.equal(p.reiniciarColocacion(99), false);
});

// ---------- v0.2: lecciones vistas y migración 2 → 3 ----------

test('migración 2 → 3: los perfiles de la v0.2 conservan su contenido y ganan `lecciones`', () => {
    const almacen = new AlmacenMemoria();
    const v2 = {
        version: 2, ajustes: { sonido: true, lecturaAsistida: false }, perfilActivo: 1, siguienteId: 2,
        perfiles: { 1: { id: 1, apodo: 'Ana', avatar: 'gato', grado: 6, juegos: {}, habilidades: {}, contenido: { asteroides: 3 }, creado: 5 } }
    };
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(v2));
    const p = new Progreso(almacen);
    assert.equal(p.recuperadoDeError, false);
    assert.equal(p.obtenerGradoContenido('asteroides'), 3, 'el grado de contenido no se pierde');
    assert.equal(p.leccionesVistas('asteroides', 'suma'), 0);
});

test('las lecciones se cuentan por juego y habilidad y persisten', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    assert.equal(p.leccionesVistas('asteroides', 'suma'), 0);
    p.registrarLeccion('asteroides', 'suma');
    p.registrarLeccion('asteroides', 'suma');
    p.registrarLeccion('reloj', 'suma');
    assert.equal(p.leccionesVistas('asteroides', 'suma'), 2);
    assert.equal(p.leccionesVistas('reloj', 'suma'), 1, 'son independientes por juego');
    const otro = new Progreso(almacen);
    otro.seleccionarPerfil(1);
    assert.equal(otro.leccionesVistas('asteroides', 'suma'), 2);
});

test('un conteo de lecciones inválido se trata como dato dañado', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 6 });
    const datos = JSON.parse(almacen.getItem(CLAVE_ALMACEN));
    datos.perfiles[1].lecciones = { 'a:b': -3 };
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
    assert.equal(new Progreso(almacen).recuperadoDeError, true);
});

// ---------- v0.2: música, modo ligero, pegatinas y migración 3 → 4 ----------

test('ajustes por omisión: la música NO está permitida (hay bocinas en el aula) y el volumen es bajo', () => {
    const p = new Progreso(new AlmacenMemoria());
    const a = p.ajustes();
    assert.equal(a.musicaPermitida, false);
    assert.equal(a.musica, true, 'si la maestra la permite, empieza encendida');
    assert.equal(a.modoLigero, false);
    assert.ok(a.volumenMusica > 0 && a.volumenMusica <= 0.5);
});

test('datos guardados con ajustes de versiones anteriores se completan con los valores por omisión', () => {
    const almacen = new AlmacenMemoria();
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify({
        version: 1, ajustes: { sonido: false }, perfilActivo: null, siguienteId: 1, perfiles: {}
    }));
    const a = new Progreso(almacen).ajustes();
    assert.equal(a.sonido, false, 'conserva lo que había');
    assert.equal(a.musicaPermitida, false, 'y completa lo nuevo');
    assert.equal(a.lecturaAsistida, false);
});

test('ajustes con tipo equivocado guardados en disco se ignoran (no se confía en localStorage)', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.datos.ajustes.musicaPermitida = 'sí';
    p.datos.ajustes.volumenMusica = 7;
    p.datos.ajustes.inventado = true;
    const a = p.ajustes();
    assert.equal(a.musicaPermitida, false);
    assert.equal(a.volumenMusica, 0.3);
    assert.equal('inventado' in a, false);
});

test('establecerAjuste: booleanos sí/no y volumen entre 0 y 1', () => {
    const p = new Progreso(new AlmacenMemoria());
    p.establecerAjuste('musicaPermitida', true);
    p.establecerAjuste('volumenMusica', 0.5);
    assert.equal(p.ajustes().musicaPermitida, true);
    assert.equal(p.ajustes().volumenMusica, 0.5);
    assert.throws(() => p.establecerAjuste('musicaPermitida', 1), /sí\/no/);
    assert.throws(() => p.establecerAjuste('volumenMusica', true), /volumen/);
    assert.throws(() => p.establecerAjuste('volumenMusica', 1.5), /volumen/);
    assert.throws(() => p.establecerAjuste('volumenMusica', -0.1), /volumen/);
    assert.throws(() => p.establecerAjuste('volumenMusica', NaN), /volumen/);
    assert.throws(() => p.establecerAjuste('otro', true), /desconocido/);
});

test('migración 3 → 4: los perfiles de la v0.2 anterior conservan todo y ganan un álbum vacío', () => {
    const almacen = new AlmacenMemoria();
    const v3 = {
        version: 3, ajustes: { sonido: true, lecturaAsistida: false }, perfilActivo: 1, siguienteId: 2,
        perfiles: { 1: { id: 1, apodo: 'Ana', avatar: 'gato', grado: 6, juegos: {}, habilidades: {}, contenido: { asteroides: 3 }, lecciones: { 'a:b': 2 }, creado: 5 } }
    };
    almacen.setItem(CLAVE_ALMACEN, JSON.stringify(v3));
    const p = new Progreso(almacen);
    assert.equal(p.recuperadoDeError, false);
    assert.deepEqual(p.pegatinas(), []);
    assert.equal(p.obtenerGradoContenido('asteroides'), 3);
    assert.equal(p.leccionesVistas('a', 'b'), 2);
});

test('el álbum: agregar pegatinas, sin repetir, y persiste', () => {
    const almacen = new AlmacenMemoria();
    const p = new Progreso(almacen);
    p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 4 });
    assert.equal(p.agregarPegatina(7), true);
    assert.equal(p.agregarPegatina(7), false, 'no se repite');
    assert.equal(p.agregarPegatina(0), true);
    assert.deepEqual(p.pegatinas(), [7, 0]);
    for (const malo of [-1, 30, 1.5, '3', null]) assert.throws(() => p.agregarPegatina(malo), /inválida/);
    const otro = new Progreso(almacen); otro.seleccionarPerfil(1);
    assert.deepEqual(otro.pegatinas(), [7, 0]);
});

test('un álbum dañado (repetidos o fuera del catálogo) se trata como dato dañado', () => {
    for (const malo of [[1, 1], [99], ['x'], 'no-lista']) {
        const almacen = new AlmacenMemoria();
        const p = new Progreso(almacen);
        p.crearPerfil({ apodo: 'Luis', avatar: 'perro', grado: 4 });
        const datos = JSON.parse(almacen.getItem(CLAVE_ALMACEN));
        datos.perfiles[1].pegatinas = malo;
        almacen.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
        assert.equal(new Progreso(almacen).recuperadoDeError, true, JSON.stringify(malo));
    }
});
