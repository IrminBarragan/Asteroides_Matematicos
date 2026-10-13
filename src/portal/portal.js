/**
 * Controlador del portal (patrón MVC: esta clase es el "controlador + modelo de pantalla").
 *
 * NO toca el DOM. Decide qué pantalla toca mostrar y con qué datos, y se lo pide a una "vista"
 * inyectada. Así todo el flujo (perfiles → juegos → resultados → modo maestro) se prueba en Node
 * sin navegador, y la vista (DOM) es una capa delgada que solo dibuja y reenvía acciones.
 *
 * Interfaz que debe cumplir la vista:
 *   mostrar(nombre, datos)   dibuja una pantalla
 *   contenedorJuego()        devuelve el elemento donde se montará el juego (tras mostrar('jugando'))
 *   mostrarPausa(activa)     muestra u oculta la capa de pausa
 *   aviso(texto, tipo)       mensaje breve ('info' | 'error')
 */
import { aCSV } from './csv.js';
import { PIN_MAESTRO } from './config.js';

export class Portal {
    /**
     * @param {Object} dependencias
     * @param {import('../core/registro.js').RegistroJuegos} dependencias.registro
     * @param {import('../core/storage.js').Progreso} dependencias.progreso
     * @param {import('../core/gestorAudio.js').GestorAudio} dependencias.audio
     * @param {Object} dependencias.vista
     * @param {string} [dependencias.pin]
     */
    constructor({ registro, progreso, audio, vista, pin = PIN_MAESTRO }) {
        this.registro = registro;
        this.progreso = progreso;
        this.audio = audio;
        this.vista = vista;
        this.pin = pin;

        this.pantalla = null;
        this.verTodos = false;
        this.juegoActual = null;
        this.metaActual = null;
        this.ultimoJuegoId = null;
        this.pausado = false;
        this.audio.establecerActivo(this.progreso.ajustes().sonido);
    }

    // ---------- Arranque y navegación ----------

    /** Al abrir la página siempre se pregunta "¿quién juega?": el equipo lo comparten varios niños. */
    iniciar() {
        if (this.progreso.listarPerfiles().length === 0) {
            this.irACrearPerfil();
        } else {
            this.progreso.cerrarSesion();
            this.irAPerfiles();
        }
    }

    mostrar(nombre, datos = {}) {
        this.pantalla = nombre;
        this.vista.mostrar(nombre, datos);
    }

    irAPerfiles() {
        this.limpiarJuego();
        this.mostrar('perfiles', { perfiles: this.progreso.listarPerfiles() });
    }

    irACrearPerfil() {
        this.limpiarJuego();
        this.mostrar('crear', { puedeCancelar: this.progreso.listarPerfiles().length > 0 });
    }

    irAInicio() {
        this.limpiarJuego();
        if (!this.progreso.perfilActivo()) return this.irAPerfiles();
        this.mostrar('inicio', this.datosInicio());
    }

    datosInicio() {
        const perfil = this.progreso.perfilActivo();
        const metas = this.verTodos ? this.registro.listar() : this.registro.porGrado(perfil.grado);
        const avisos = [];
        if (this.progreso.guardadoFallido) {
            avisos.push('No se pudo guardar el progreso en este equipo. Puedes jugar, pero no se recordará.');
        }
        if (this.progreso.recuperadoDeError) {
            avisos.push('Había datos dañados y se reiniciaron. Pide ayuda a tu maestro si falta algo.');
        }
        return {
            perfil,
            estrellas: this.progreso.estrellasTotales(),
            verTodos: this.verTodos,
            totalJuegos: this.registro.listar().length,
            juegos: metas.map((meta) => ({ meta, estado: this.progreso.estadoJuego(meta.id) })),
            avisos
        };
    }

    alternarVerTodos() {
        this.verTodos = !this.verTodos;
        this.irAInicio();
    }

    // ---------- Perfiles ----------

    /**
     * @returns {{ok: boolean, error?: string}} no lanza: la vista muestra el mensaje al niño
     */
    crearPerfil({ apodo, avatar, grado }) {
        this.despertarAudio();
        try {
            this.progreso.crearPerfil({ apodo, avatar, grado });
        } catch (error) {
            return { ok: false, error: error.message };
        }
        this.verTodos = false;
        this.irAInicio();
        return { ok: true };
    }

    elegirPerfil(id) {
        this.despertarAudio();
        try {
            this.progreso.seleccionarPerfil(id);
        } catch (error) {
            this.vista.aviso(error.message, 'error');
            return this.irAPerfiles();
        }
        this.verTodos = false;
        this.irAInicio();
    }

    cerrarSesion() {
        this.progreso.cerrarSesion();
        this.irAPerfiles();
    }

    // ---------- Sonido ----------

    sonidoActivo() {
        return this.progreso.ajustes().sonido;
    }

    alternarSonido() {
        this.despertarAudio();
        const nuevo = !this.sonidoActivo();
        this.progreso.establecerAjuste('sonido', nuevo);
        this.audio.establecerActivo(nuevo);
        return nuevo;
    }

    /** Los navegadores solo permiten audio tras un gesto del usuario: se despierta en acciones del niño. */
    despertarAudio() {
        this.audio.inicializar();
        this.audio.reanudar();
    }

    // ---------- Partida ----------

    iniciarJuego(id) {
        this.despertarAudio();
        const perfil = this.progreso.perfilActivo();
        const Clase = this.registro.obtener(id);
        if (!perfil || !Clase) {
            this.vista.aviso('No se pudo abrir ese juego.', 'error');
            return this.irAInicio();
        }

        this.limpiarJuego();
        this.ultimoJuegoId = id;
        this.metaActual = Clase.meta;
        this.pausado = false;
        this.mostrar('jugando', { meta: Clase.meta });

        const juego = this.registro.crear(id);
        this.juegoActual = juego;
        juego.alTerminar((resultado) => this.terminarPartida(juego, resultado));
        try {
            juego.montar(this.vista.contenedorJuego(), {
                grado: perfil.grado,
                perfil,
                audio: this.audio,
                habilidades: this.progreso.obtenerHabilidades(id)
            });
        } catch (error) {
            console.error(`Error al montar el juego "${id}":`, error);
            this.limpiarJuego();
            this.mostrar('error', { mensaje: 'Algo salió mal al abrir el juego. Vuelve a intentarlo.' });
        }
    }

    pausarJuego() {
        if (!this.juegoActual || this.pausado) return;
        this.juegoActual.pausar();
        this.pausado = true;
        this.vista.mostrarPausa(true);
    }

    reanudarJuego() {
        if (!this.juegoActual || !this.pausado) return;
        this.juegoActual.reanudar();
        this.pausado = false;
        this.vista.mostrarPausa(false);
    }

    alternarPausa() {
        if (this.pausado) this.reanudarJuego(); else this.pausarJuego();
    }

    salirDelJuego() {
        this.irAInicio();
    }

    jugarOtraVez() {
        if (this.ultimoJuegoId) this.iniciarJuego(this.ultimoJuegoId);
        else this.irAInicio();
    }

    /**
     * El resultado se guarda de inmediato (no se pierde), pero la pantalla cambia en un microtask:
     * el juego sigue ejecutando su propio método `finalizar()` y no debe ser destruido "bajo sus pies".
     */
    terminarPartida(juego, resultado) {
        if (juego !== this.juegoActual) return;
        const meta = this.metaActual;
        let registro;
        try {
            registro = this.progreso.registrarResultado(meta.id, resultado);
            if (resultado.habilidades) this.progreso.guardarHabilidades(meta.id, resultado.habilidades);
        } catch (error) {
            console.error('No se pudo guardar el resultado:', error);
            registro = { esRecord: false, estrellasGanadas: 0 };
        }
        queueMicrotask(() => {
            if (juego !== this.juegoActual) return; // el niño salió justo en ese instante
            this.limpiarJuego();
            if (resultado.estrellas > 0) this.audio.reproducirEfecto('nivel');
            this.mostrar('resultados', {
                meta,
                resultado,
                esRecord: registro.esRecord,
                estrellasGanadas: registro.estrellasGanadas,
                estrellasTotales: this.progreso.estrellasTotales()
            });
        });
    }

    /** Destruye el juego en curso (si lo hay). Es seguro llamarlo siempre. */
    limpiarJuego() {
        const juego = this.juegoActual;
        this.juegoActual = null;
        this.pausado = false;
        if (juego) {
            try {
                juego.destruir();
            } catch (error) {
                console.error('Error al destruir el juego:', error);
            }
        }
    }

    // ---------- Modo maestro ----------

    pedirModoMaestro() {
        this.limpiarJuego();
        this.mostrar('maestro-pin');
    }

    entrarModoMaestro(pinIngresado) {
        if (String(pinIngresado).trim() !== this.pin) return false;
        this.irAModoMaestro();
        return true;
    }

    irAModoMaestro() {
        this.mostrar('maestro', this.datosMaestro());
    }

    nombreJuego(id) {
        const Clase = this.registro.obtener(id);
        return Clase ? Clase.meta.nombre : id;
    }

    /** Resumen por perfil para la pantalla del maestro. */
    datosMaestro() {
        const activo = this.progreso.perfilActivo();
        const perfiles = this.progreso.listarPerfiles().map((perfil) => ({
            id: perfil.id,
            apodo: perfil.apodo,
            avatar: perfil.avatar,
            grado: perfil.grado,
            estrellas: Object.values(perfil.juegos).reduce((s, j) => s + j.mejorEstrellas, 0),
            juegos: Object.entries(perfil.juegos).map(([id, j]) => ({
                id, nombre: this.nombreJuego(id), ...j
            })),
            habilidades: this.filasHabilidades(perfil)
        }));
        return { perfiles, ajustes: this.progreso.ajustes(), activoId: activo ? activo.id : null };
    }

    filasHabilidades(perfil) {
        const filas = [];
        for (const [juegoId, instantanea] of Object.entries(perfil.habilidades)) {
            for (const [habilidad, h] of Object.entries(instantanea)) {
                const ventana = Array.isArray(h.intentos) ? h.intentos : [];
                filas.push({
                    juego: this.nombreJuego(juegoId),
                    habilidad,
                    nivel: h.nivel,
                    intentos: h.total,
                    aciertos: h.totalOk,
                    dominioReciente: ventana.length === 0 ? null : ventana.filter((i) => i.ok).length / ventana.length
                });
            }
        }
        return filas;
    }

    eliminarPerfil(id) {
        this.progreso.eliminarPerfil(id);
        this.irAModoMaestro();
    }

    reiniciarTodo() {
        this.progreso.reiniciarTodo();
        this.verTodos = false;
        this.irAModoMaestro();
    }

    salirDeModoMaestro() {
        this.iniciar();
    }

    // ---------- Exportación ----------

    csvProgreso() {
        const filas = [];
        for (const perfil of this.progreso.listarPerfiles()) {
            for (const [id, j] of Object.entries(perfil.juegos)) {
                filas.push([
                    perfil.apodo, perfil.grado, this.nombreJuego(id), j.partidas, j.mejorPuntaje, j.mejorEstrellas,
                    j.ultimaPartida ? new Date(j.ultimaPartida).toISOString() : ''
                ]);
            }
        }
        return aCSV(['jugador', 'grado', 'juego', 'partidas', 'mejor_puntaje', 'mejores_estrellas', 'ultima_partida'], filas);
    }

    csvHabilidades() {
        const filas = [];
        for (const perfil of this.progreso.listarPerfiles()) {
            for (const f of this.filasHabilidades(perfil)) {
                filas.push([
                    perfil.apodo, perfil.grado, f.juego, f.habilidad, f.nivel, f.intentos, f.aciertos,
                    f.dominioReciente === null ? '' : Math.round(f.dominioReciente * 100)
                ]);
            }
        }
        return aCSV(['jugador', 'grado', 'juego', 'habilidad', 'nivel', 'intentos', 'aciertos', 'dominio_reciente_pct'], filas);
    }
}
