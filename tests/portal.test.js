import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Portal } from '../src/portal/portal.js';
import { Progreso, AlmacenMemoria } from '../src/core/storage.js';
import { RegistroJuegos } from '../src/core/registro.js';
import { JuegoEjemplo } from './auxiliares/juegoEjemplo.js';
import { crearVistaFalsa, crearAudioFalso } from './auxiliares/vistaFalsa.js';

class JuegoGrandes extends JuegoEjemplo {
    static meta = { ...JuegoEjemplo.meta, id: 'grandes', nombre: 'Para grandes', grados: [5, 6] };
}

function crear({ almacen = new AlmacenMemoria(), pin } = {}) {
    const vista = crearVistaFalsa();
    const audio = crearAudioFalso();
    const progreso = new Progreso(almacen, { ahora: () => 1_700_000_000_000 });
    const registro = new RegistroJuegos().registrar(JuegoEjemplo).registrar(JuegoGrandes);
    const portal = new Portal({ registro, progreso, audio, vista, pin });
    return { portal, vista, audio, progreso, registro, almacen };
}
const luisa = { apodo: 'Luisa', avatar: 'gato', grado: 3 };
const nombres = (vista) => vista.pantallas.map((p) => p.nombre);
const vaciarMicrotasks = () => new Promise((r) => setTimeout(r, 0));

/** Juega el JuegoEjemplo hasta terminar: 3 respuestas. */
function jugarHastaElFinal(portal, aciertos = 3) {
    for (let i = 0; i < 3; i++) portal.juegoActual.responder(i < aciertos);
}

test('sin perfiles, arranca en la pantalla de crear (sin opción de cancelar)', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    assert.equal(vista.ultima().nombre, 'crear');
    assert.equal(vista.ultima().datos.puedeCancelar, false);
});

test('con perfiles, arranca preguntando quién juega y cierra cualquier sesión previa', () => {
    const { portal, vista, progreso } = crear();
    progreso.crearPerfil(luisa); // queda activo
    portal.iniciar();
    assert.equal(vista.ultima().nombre, 'perfiles');
    assert.equal(progreso.perfilActivo(), null);
});

test('crearPerfil válido lleva al inicio con los juegos de su grado', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    assert.deepEqual(portal.crearPerfil(luisa), { ok: true });
    const { nombre, datos } = vista.ultima();
    assert.equal(nombre, 'inicio');
    assert.equal(datos.perfil.apodo, 'Luisa');
    assert.deepEqual(datos.juegos.map((j) => j.meta.id), ['ejemplo']); // grado 3: no ve "grandes"
    assert.equal(datos.totalJuegos, 2);
});

test('crearPerfil inválido NO lanza: devuelve el error para mostrarlo y no cambia de pantalla', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    const antes = vista.pantallas.length;
    const r = portal.crearPerfil({ apodo: '', avatar: 'gato', grado: 3 });
    assert.equal(r.ok, false);
    assert.match(r.error, /apodo/i);
    assert.equal(vista.pantallas.length, antes);
});

test('"ver todos" muestra también los juegos de otros grados y se puede volver', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    portal.crearPerfil(luisa);
    portal.alternarVerTodos();
    assert.deepEqual(vista.ultima().datos.juegos.map((j) => j.meta.id), ['ejemplo', 'grandes']);
    portal.alternarVerTodos();
    assert.deepEqual(vista.ultima().datos.juegos.map((j) => j.meta.id), ['ejemplo']);
});

test('cambiar de jugador reinicia "ver todos" y muestra los perfiles', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    portal.crearPerfil(luisa);
    portal.alternarVerTodos();
    portal.cerrarSesion();
    assert.equal(vista.ultima().nombre, 'perfiles');
    portal.elegirPerfil(1);
    assert.equal(vista.ultima().datos.verTodos, false);
});

test('elegir un perfil inexistente avisa y vuelve a la lista (no rompe)', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    portal.crearPerfil(luisa);
    portal.cerrarSesion();
    portal.elegirPerfil(999);
    assert.equal(vista.avisos.length, 1);
    assert.equal(vista.ultima().nombre, 'perfiles');
});

test('irAInicio sin perfil activo manda a elegir perfil', () => {
    const { portal, vista } = crear();
    portal.irAInicio();
    assert.equal(vista.ultima().nombre, 'perfiles');
});

// ---------- Partida ----------

test('iniciarJuego monta el juego con el contexto correcto', () => {
    const { portal, vista, audio } = crear();
    portal.iniciar();
    portal.crearPerfil(luisa);
    portal.iniciarJuego('ejemplo');
    assert.equal(vista.ultima().nombre, 'jugando');
    assert.equal(portal.juegoActual.estado, 'jugando');
    assert.equal(vista.contenedor.contenido, 'grado 3');
    assert.equal(portal.juegoActual.contexto.audio, audio);
    assert.equal(portal.juegoActual.contexto.perfil.apodo, 'Luisa');
    assert.ok(audio.inicializado > 0 && audio.reanudado > 0, 'debe despertar el audio con el gesto del niño');
});

test('iniciar un juego inexistente avisa y regresa al inicio', () => {
    const { portal, vista } = crear();
    portal.iniciar();
    portal.crearPerfil(luisa);
    portal.iniciarJuego('no-existe');
    assert.equal(vista.avisos.length, 1);
    assert.equal(vista.ultima().nombre, 'inicio');
});

test('pausar y reanudar actualizan el juego y la vista; alternarPausa va y viene', () => {
    const { portal, vista } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    portal.pausarJuego();
    assert.equal(portal.juegoActual.estado, 'pausado');
    portal.pausarJuego(); // repetido: sin efecto
    portal.alternarPausa();
    assert.equal(portal.juegoActual.estado, 'jugando');
    portal.alternarPausa();
    assert.deepEqual(vista.pausas, [true, false, true]);
});

test('terminar una partida guarda el resultado y muestra resultados tras un microtask', async () => {
    const { portal, vista, progreso, audio } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    const juego = portal.juegoActual;
    jugarHastaElFinal(portal, 3);
    // El resultado ya está guardado aunque la pantalla aún no cambió
    assert.equal(progreso.estadoJuego('ejemplo').partidas, 1);
    assert.equal(vista.ultima().nombre, 'jugando');
    await vaciarMicrotasks();
    const { nombre, datos } = vista.ultima();
    assert.equal(nombre, 'resultados');
    assert.equal(datos.resultado.estrellas, 3);
    assert.equal(datos.esRecord, true);
    assert.equal(datos.estrellasGanadas, 3);
    assert.equal(datos.estrellasTotales, 3);
    assert.equal(juego.estado, 'destruido', 'el juego terminado debe liberarse');
    assert.equal(portal.juegoActual, null);
    assert.ok(audio.efectos.includes('nivel'));
});

test('un resultado sin aciertos (0 estrellas) no suena a celebración', async () => {
    const { portal, audio } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    jugarHastaElFinal(portal, 0);
    await vaciarMicrotasks();
    assert.ok(!audio.efectos.includes('nivel'));
});

test('las habilidades que devuelve el juego se guardan y se entregan en la próxima partida', async () => {
    const { portal, progreso } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    portal.juegoActual.finalizar({ aciertos: 1, fallos: 0, tiempoMs: 5, habilidades: { suma: { nivel: 2 } } });
    await vaciarMicrotasks();
    assert.deepEqual(progreso.obtenerHabilidades('ejemplo'), { suma: { nivel: 2 } });
    portal.jugarOtraVez();
    assert.deepEqual(portal.juegoActual.contexto.habilidades, { suma: { nivel: 2 } });
});

test('jugarOtraVez crea una instancia NUEVA del mismo juego', async () => {
    const { portal } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    const primero = portal.juegoActual;
    jugarHastaElFinal(portal);
    await vaciarMicrotasks();
    portal.jugarOtraVez();
    assert.notEqual(portal.juegoActual, primero);
    assert.equal(portal.juegoActual.meta.id, 'ejemplo');
});

test('salir en plena partida destruye el juego y no guarda nada', () => {
    const { portal, vista, progreso } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    const juego = portal.juegoActual;
    portal.salirDelJuego();
    assert.equal(juego.estado, 'destruido');
    assert.equal(vista.ultima().nombre, 'inicio');
    assert.equal(progreso.estadoJuego('ejemplo').partidas, 0);
});

test('si el niño sale justo después de finalizar, no aparece una pantalla de resultados fantasma', async () => {
    const { portal, vista } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    jugarHastaElFinal(portal);
    portal.salirDelJuego(); // antes de que corra el microtask
    await vaciarMicrotasks();
    assert.equal(vista.ultima().nombre, 'inicio');
});

test('iniciar otro juego mientras hay uno en curso destruye el anterior (sin fugas)', () => {
    const { portal } = crear();
    portal.iniciar(); portal.crearPerfil(luisa);
    portal.iniciarJuego('ejemplo');
    const viejo = portal.juegoActual;
    portal.iniciarJuego('ejemplo');
    assert.equal(viejo.estado, 'destruido');
    assert.equal(viejo.bus.cantidad('fin'), 0);
});

test('un juego que falla al montar muestra un error amable y no deja basura', () => {
    class Roto extends JuegoEjemplo {
        static meta = { ...JuegoEjemplo.meta, id: 'roto' };
        alMontar() { throw new Error('boom'); }
    }
    const { portal, vista, registro } = crear();
    registro.registrar(Roto);
    portal.iniciar(); portal.crearPerfil(luisa);
    const original = console.error; console.error = () => {};
    try { portal.iniciarJuego('roto'); } finally { console.error = original; }
    assert.equal(vista.ultima().nombre, 'error');
    assert.equal(portal.juegoActual, null);
});

test('un resultado que no se puede guardar no impide mostrar la pantalla de resultados', async () => {
    const { portal, vista, progreso } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    progreso.registrarResultado = () => { throw new Error('disco lleno'); };
    const original = console.error; console.error = () => {};
    try {
        jugarHastaElFinal(portal);
        await vaciarMicrotasks();
    } finally { console.error = original; }
    assert.equal(vista.ultima().nombre, 'resultados');
});

// ---------- Sonido ----------

test('el ajuste de sonido persiste y se aplica al audio al arrancar', () => {
    const almacen = new AlmacenMemoria();
    const a = crear({ almacen });
    assert.equal(a.audio.activo, true);
    assert.equal(a.portal.alternarSonido(), false);
    assert.equal(a.audio.activo, false);
    const b = crear({ almacen }); // "recarga de página"
    assert.equal(b.audio.activo, false);
    assert.equal(b.portal.sonidoActivo(), false);
});

// ---------- Modo maestro ----------

test('modo maestro: PIN incorrecto no entra; correcto sí', () => {
    const { portal, vista } = crear({ pin: '1111' });
    portal.iniciar();
    portal.pedirModoMaestro();
    assert.equal(vista.ultima().nombre, 'maestro-pin');
    assert.equal(portal.entrarModoMaestro('0000'), false);
    assert.equal(vista.ultima().nombre, 'maestro-pin');
    assert.equal(portal.entrarModoMaestro(' 1111 '), true);
    assert.equal(vista.ultima().nombre, 'maestro');
});

test('pedir modo maestro durante una partida la cierra', () => {
    const { portal } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    const juego = portal.juegoActual;
    portal.pedirModoMaestro();
    assert.equal(juego.estado, 'destruido');
});

test('datosMaestro resume perfiles, juegos y habilidades', async () => {
    const { portal } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    portal.juegoActual.finalizar({
        aciertos: 2, fallos: 1, tiempoMs: 10,
        habilidades: { suma: { nivel: 2, intentos: [{ ok: true }, { ok: false }, { ok: true }, { ok: true }], total: 6, totalOk: 5 } }
    });
    await vaciarMicrotasks();
    const { perfiles } = portal.datosMaestro();
    assert.equal(perfiles.length, 1);
    assert.equal(perfiles[0].estrellas, 1);
    assert.equal(perfiles[0].juegos[0].nombre, 'Juego de Ejemplo');
    assert.deepEqual(perfiles[0].habilidades[0], {
        juego: 'Juego de Ejemplo', habilidad: 'suma', nivel: 2, intentos: 6, aciertos: 5, dominioReciente: 0.75
    });
});

test('datosMaestro tolera juegos que ya no existen en el registro', () => {
    const { portal, progreso } = crear();
    portal.iniciar(); portal.crearPerfil(luisa);
    progreso.registrarResultado('juego-viejo', { aciertos: 1, fallos: 0, tiempoMs: 1, puntaje: 10, estrellas: 3 });
    assert.equal(portal.datosMaestro().perfiles[0].juegos[0].nombre, 'juego-viejo');
});

test('eliminar y reiniciar todo funcionan y regresan al panel del maestro', () => {
    const { portal, vista } = crear();
    portal.iniciar(); portal.crearPerfil(luisa);
    portal.crearPerfil({ apodo: 'Mateo', avatar: 'perro', grado: 1 });
    portal.eliminarPerfil(1);
    assert.equal(vista.ultima().nombre, 'maestro');
    assert.deepEqual(vista.ultima().datos.perfiles.map((p) => p.apodo), ['Mateo']);
    portal.reiniciarTodo();
    assert.deepEqual(vista.ultima().datos.perfiles, []);
});

test('salir del modo maestro vuelve a "¿quién juega?" (o a crear si no quedó nadie)', () => {
    const { portal, vista } = crear();
    portal.iniciar(); portal.crearPerfil(luisa);
    portal.pedirModoMaestro();
    portal.salirDeModoMaestro();
    assert.equal(vista.ultima().nombre, 'perfiles');
    portal.reiniciarTodo();
    portal.salirDeModoMaestro();
    assert.equal(vista.ultima().nombre, 'crear');
});

test('avisos de inicio cuando no se puede guardar o se recuperaron datos dañados', () => {
    const roto = { getItem: () => null, setItem: () => { throw new Error('lleno'); }, removeItem() {} };
    const { portal, vista } = crear({ almacen: roto });
    portal.iniciar(); portal.crearPerfil(luisa);
    assert.equal(vista.ultima().datos.avisos.length, 1);

    const dañado = new AlmacenMemoria();
    dañado.setItem('portal-juegos-educativos', '{{{');
    const otra = crear({ almacen: dañado });
    otra.portal.iniciar(); otra.portal.crearPerfil(luisa);
    assert.ok(otra.vista.ultima().datos.avisos.some((t) => /dañados/.test(t)));
});

// ---------- CSV ----------

test('csvProgreso incluye BOM, encabezados y una fila por juego jugado', async () => {
    const { portal } = crear();
    portal.iniciar(); portal.crearPerfil(luisa); portal.iniciarJuego('ejemplo');
    jugarHastaElFinal(portal);
    await vaciarMicrotasks();
    const csv = portal.csvProgreso();
    assert.ok(csv.startsWith('﻿jugador,grado,juego,partidas,mejor_puntaje,mejores_estrellas,ultima_partida\r\n'));
    assert.match(csv, /Luisa,3,Juego de Ejemplo,1,30,3,2023-11-14T22:13:20\.000Z\r\n$/);
});

test('el CSV neutraliza apodos que parecen fórmulas de Excel', async () => {
    const { portal, progreso } = crear();
    portal.iniciar();
    portal.crearPerfil({ apodo: '=SUMA(1+1)', avatar: 'gato', grado: 2 });
    progreso.registrarResultado('ejemplo', { aciertos: 1, fallos: 0, tiempoMs: 1, puntaje: 10, estrellas: 3 });
    assert.match(portal.csvProgreso(), /\r\n'=SUMA\(1\+1\),2,/);
});

// ---------- Lectura en voz alta ----------

function crearVozFalsa(disponible = true) {
    return { disponible, leidos: [], detenciones: 0, leer(t) { this.leidos.push(t); return true; }, detener() { this.detenciones++; } };
}

function crearConVoz(voz) {
    const base = crear();
    const portal = new Portal({ registro: base.registro, progreso: base.progreso, audio: base.audio, vista: base.vista, voz });
    return { ...base, portal };
}

test('voz: el portal sabe si hay voz disponible (sin voz, nada se ofrece)', () => {
    assert.equal(crearConVoz(crearVozFalsa(true)).portal.vozDisponible(), true);
    assert.equal(crearConVoz(crearVozFalsa(false)).portal.vozDisponible(), false);
    assert.equal(crear().portal.vozDisponible(), false); // sin dependencia
    const { portal } = crear();
    assert.equal(portal.leerPantalla(), false);
    assert.doesNotThrow(() => portal.alternarLecturaAutomatica());
});

test('voz: «Escuchar» lee el texto que la vista indica', () => {
    const voz = crearVozFalsa();
    const { portal, vista } = crearConVoz(voz);
    portal.iniciar(); portal.crearPerfil(luisa);
    vista.texto = '¿Cuánto es 3/4?';
    assert.equal(portal.leerPantalla(), true);
    assert.deepEqual(voz.leidos, ['¿Cuánto es 3/4?']);
});

test('voz: con lectura automática, cada texto nuevo se lee; sin ella, no', () => {
    const voz = crearVozFalsa();
    const { portal, vista, progreso } = crearConVoz(voz);
    portal.iniciar(); portal.crearPerfil(luisa);
    portal.iniciarJuego('ejemplo');
    assert.equal(vista.observadores, 1, 'el portal observa el texto del juego');

    vista.texto = 'pregunta 1';
    vista.alCambiarTexto();
    assert.deepEqual(voz.leidos, [], 'lectura automática apagada por omisión');

    assert.equal(portal.alternarLecturaAutomatica(), true);
    assert.equal(progreso.ajustes().lecturaAsistida, true);
    assert.deepEqual(voz.leidos, ['pregunta 1'], 'al activarla lee la pregunta actual');

    vista.texto = 'pregunta 2';
    vista.alCambiarTexto();
    assert.deepEqual(voz.leidos, ['pregunta 1', 'pregunta 2']);

    assert.equal(portal.alternarLecturaAutomatica(), false);
    vista.alCambiarTexto();
    assert.equal(voz.leidos.length, 2, 'apagada no lee más');
});

test('voz: en pausa no lee, y pausar, salir o terminar callan la voz', async () => {
    const voz = crearVozFalsa();
    const { portal, vista } = crearConVoz(voz);
    portal.iniciar(); portal.crearPerfil(luisa);
    portal.alternarLecturaAutomatica();
    portal.iniciarJuego('ejemplo');
    const alCambiar = vista.alCambiarTexto;
    const antes = voz.detenciones;
    portal.pausarJuego();
    assert.ok(voz.detenciones > antes, 'pausar calla la voz');
    vista.texto = 'nueva';
    alCambiar();
    assert.deepEqual(voz.leidos, [], 'en pausa no se lee');
    portal.reanudarJuego();
    portal.irAInicio();
    assert.equal(vista.alCambiarTexto, null, 'al salir deja de observar');
    assert.ok(voz.detenciones >= 2);
});
