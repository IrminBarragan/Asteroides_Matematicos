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
import { ajustarGradoContenido } from '../adaptativo/colocacion.js';
import { elegirPegatina, pegatinasGanadas } from '../core/pegatinas.js';

export class Portal {
    /**
     * @param {Object} dependencias
     * @param {import('../core/registro.js').RegistroJuegos} dependencias.registro
     * @param {import('../core/storage.js').Progreso} dependencias.progreso
     * @param {import('../core/gestorAudio.js').GestorAudio} dependencias.audio
     * @param {Object} dependencias.vista
     * @param {import('../core/voz.js').Voz} [dependencias.voz]  lectura en voz alta (opcional: sin ella no hay botones)
     * @param {string} [dependencias.pin]
     */
    constructor({ registro, progreso, audio, vista, voz = null, musica = null, equipoLento = false, aleatorio = Math.random, pin = PIN_MAESTRO }) {
        this.registro = registro;
        this.progreso = progreso;
        this.audio = audio;
        this.vista = vista;
        this.voz = voz;
        this.musica = musica;
        this.equipoLento = equipoLento;
        this.aleatorio = aleatorio;
        this.pin = pin;

        this.pantalla = null;
        this.verTodos = false;
        this.juegoActual = null;
        this.metaActual = null;
        this.ultimoJuegoId = null;
        this.pausado = false;
        this.enLeccion = false;
        this.audio.establecerActivo(this.progreso.ajustes().sonido);
        // La mascota y el confeti reaccionan a los efectos de sonido que piden los juegos (acierto, fallo, nivel)
        if (typeof audio.alEfecto === 'function') audio.alEfecto((tipo) => this.alEfecto(tipo));
    }

    // ---------- Arranque y navegación ----------

    /** Al abrir la página siempre se pregunta "¿quién juega?": el equipo lo comparten varios niños. */
    iniciar() {
        this.vista.aplicarAjustes({ ligero: this.modoLigero() });
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
        this.sincronizarMusica();
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

    // ---------- Música, mascota y movimiento ----------

    /** ¿La maestra permitió música en este equipo? (apagada por omisión: hay bocinas, no audífonos) */
    musicaPermitida() {
        return this.progreso.ajustes().musicaPermitida;
    }

    /** Suena solo si está permitida Y el niño no la apagó. */
    musicaActiva() {
        const a = this.progreso.ajustes();
        return a.musicaPermitida && a.musica;
    }

    /** Aplica los ajustes a la música y pone la pista que toca según la pantalla (juego o menú). */
    sincronizarMusica() {
        if (!this.musica) return;
        const a = this.progreso.ajustes();
        this.musica.establecerVolumen(a.volumenMusica);
        this.musica.establecerActiva(this.musicaActiva());
        if (this.musicaActiva()) this.musica.reproducir(this.pantalla === 'jugando' ? 'juego' : 'menu');
    }

    alternarMusica() {
        this.despertarAudio();
        const nuevo = !this.progreso.ajustes().musica;
        this.progreso.establecerAjuste('musica', nuevo);
        this.sincronizarMusica();
        return nuevo;
    }

    /** Modo maestro: permitir o no la música en este equipo. */
    permitirMusica(permitida) {
        this.progreso.establecerAjuste('musicaPermitida', Boolean(permitida));
        this.despertarAudio();
        this.irAModoMaestro();
    }

    establecerVolumenMusica(volumen) {
        this.progreso.establecerAjuste('volumenMusica', volumen);
        this.sincronizarMusica();
        this.irAModoMaestro();
    }

    /** Modo ligero: lo pidió la maestra o el equipo parece lento. */
    modoLigero() {
        return this.progreso.ajustes().modoLigero || this.equipoLento;
    }

    alternarModoLigero() {
        this.progreso.establecerAjuste('modoLigero', !this.progreso.ajustes().modoLigero);
        this.vista.aplicarAjustes({ ligero: this.modoLigero() });
        this.irAModoMaestro();
    }

    /** La mascota y el confeti reaccionan a los efectos que piden los juegos. */
    alEfecto(tipo) {
        if (tipo === 'acierto') this.vista.reaccionar('acierto');
        else if (tipo === 'fallo') this.vista.reaccionar('error');
        else if (tipo === 'nivel') { this.vista.reaccionar('nivel'); this.vista.confeti(30); }
    }

    /** Habla (lectura en voz alta) bajando un momento la música para que se entienda. */
    hablar(texto) {
        if (this.musica) this.musica.atenuar(6000);
        return this.voz.leer(texto);
    }

    // ---------- Álbum de pegatinas ----------

    /** Otorga las pegatinas de una partida (1 por esforzarse, 2 con las 3 estrellas). @returns {number[]} ids nuevos */
    otorgarPegatinas(estrellas) {
        const nuevas = [];
        try {
            for (let i = 0; i < pegatinasGanadas(estrellas); i++) {
                const id = elegirPegatina(this.progreso.pegatinas(), this.aleatorio);
                if (id !== null && this.progreso.agregarPegatina(id)) nuevas.push(id);
            }
        } catch (error) {
            console.error('No se pudo guardar la pegatina:', error);
        }
        return nuevas;
    }

    irAAlbum() {
        this.limpiarJuego();
        const perfil = this.progreso.perfilActivo();
        if (!perfil) return this.irAPerfiles();
        this.mostrar('album', { perfil, poseidas: this.progreso.pegatinas() });
    }

    // ---------- Lectura en voz alta ----------

    vozDisponible() {
        return Boolean(this.voz && this.voz.disponible);
    }

    lecturaAutomatica() {
        return this.progreso.ajustes().lecturaAsistida;
    }

    /** Activa o desactiva leer cada pregunta nueva sin que el niño toque nada. Devuelve el nuevo valor. */
    alternarLecturaAutomatica() {
        const nuevo = !this.lecturaAutomatica();
        this.progreso.establecerAjuste('lecturaAsistida', nuevo);
        if (!this.vozDisponible()) return nuevo;
        if (nuevo) this.leerPantalla(); else this.voz.detener();
        return nuevo;
    }

    /** Lee en voz alta la pregunta que hay en pantalla (botón «Escuchar»). */
    leerPantalla() {
        if (!this.vozDisponible()) return false;
        const texto = this.vista.textoALeer();
        return texto ? this.hablar(texto) : false;
    }

    /** La vista avisa cuando cambia el texto de la pregunta. */
    alCambiarTexto() {
        if (this.juegoActual && !this.pausado && this.lecturaAutomatica()) this.leerPantalla();
    }

    /** Los navegadores solo permiten audio tras un gesto del usuario: se despierta en acciones del niño. */
    despertarAudio() {
        this.audio.inicializar();
        this.audio.reanudar();
        this.sincronizarMusica(); // la música solo puede empezar tras el primer gesto del niño
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

        // El SISTEMA decide el grado de contenido (no el grado escolar del niño): ver adaptativo/colocacion.js
        const nivel = this.nivelDeInicio(Clase, perfil);
        if (nivel.colocacion) this.vista.aviso('¡Misión de inicio! Vamos a ver hasta dónde llegas.', 'info');

        const juego = this.registro.crear(id);
        this.juegoActual = juego;
        juego.alTerminar((resultado) => this.terminarPartida(juego, resultado));
        try {
            juego.montar(this.vista.contenedorJuego(), {
                grado: nivel.grado,
                gradoEscolar: perfil.grado,
                colocacion: nivel.colocacion,
                perfil,
                audio: this.audio,
                habilidades: nivel.colocacion ? null : this.progreso.obtenerHabilidades(id),
                // Enseñanza: el juego pide lecciones y el portal las muestra (pausando el juego)
                ensenar: (leccion, extra = {}) => this.ensenar(leccion, {
                    registro: extra.habilidad ? () => this.progreso.registrarLeccion(id, extra.habilidad) : null
                }),
                presentarHabilidad: (habilidad, construir) => this.presentarHabilidad(id, habilidad, construir)
            });
            this.vista.observarTexto(() => this.alCambiarTexto());
        } catch (error) {
            console.error(`Error al montar el juego "${id}":`, error);
            this.limpiarJuego();
            this.mostrar('error', { mensaje: 'Algo salió mal al abrir el juego. Vuelve a intentarlo.' });
        }
    }

    /**
     * Rango de grados de contenido de un juego para este niño: desde el menor que ofrece el juego hasta el grado del
     * niño (no se le sube por encima de lo que le toca) acotado al mayor que ofrece el juego.
     */
    escaleraDe(Clase, perfil) {
        const grados = Clase.meta.grados;
        const gradoMin = Math.min(...grados);
        const gradoMax = Math.max(gradoMin, Math.min(perfil.grado, Math.max(...grados)));
        return { gradoMin, gradoMax };
    }

    /**
     * Con qué contenido juega este niño este juego:
     *  - juegos que admiten misión de inicio: el grado de contenido guardado, o la misión si aún no la hizo;
     *  - los demás (p. ej. el Memorama): su grado escolar.
     * @returns {{grado:number, colocacion:Object|null}}
     */
    nivelDeInicio(Clase, perfil) {
        if (!Clase.admiteColocacion) return { grado: perfil.grado, colocacion: null };
        const escalera = this.escaleraDe(Clase, perfil);
        const guardado = this.progreso.obtenerGradoContenido(Clase.meta.id);
        if (guardado === null) return { grado: escalera.gradoMax, colocacion: { ...escalera } };
        return { grado: Math.min(Math.max(guardado, escalera.gradoMin), escalera.gradoMax), colocacion: null };
    }

    // ---------- Enseñanza (lecciones dentro del juego) ----------

    /**
     * Muestra una lección y mantiene el juego en pausa mientras está abierta.
     * Se puede llamar mientras el juego aún se está montando: la pausa se difiere un instante (hasta que esté «jugando»).
     * @returns {Promise<'terminada'|'cerrada'|'omitida'>}
     */
    async ensenar(leccion, { omitible = false, registro = null } = {}) {
        if (!this.juegoActual || this.enLeccion) return 'omitida';
        const juego = this.juegoActual;
        this.enLeccion = true;
        const estabaPausado = this.pausado;
        await Promise.resolve();
        if (juego !== this.juegoActual) { this.enLeccion = false; return 'omitida'; }
        juego.pausar();
        if (this.voz) this.voz.detener();
        if (registro) registro();
        let resultado = 'cerrada';
        try {
            resultado = await this.vista.mostrarLeccion(leccion, { omitible, leer: this.vozDisponible() ? (t) => this.hablar(t) : null });
        } finally {
            this.enLeccion = false;
        }
        if (juego === this.juegoActual && !estabaPausado && !this.pausado) juego.reanudar();
        return resultado;
    }

    /** La primera vez que aparece una habilidad se muestra su lección de introducción (omitible); después, nunca. */
    presentarHabilidad(juegoId, habilidad, construir) {
        if (this.progreso.leccionesVistas(juegoId, habilidad) > 0) return Promise.resolve('omitida');
        let leccion;
        try {
            leccion = construir();
        } catch (error) {
            console.error('No se pudo preparar la lección:', error);
            return Promise.resolve('omitida');
        }
        return this.ensenar(leccion, { omitible: true, registro: () => this.progreso.registrarLeccion(juegoId, habilidad) });
    }

    pausarJuego() {
        if (!this.juegoActual || this.pausado) return;
        this.juegoActual.pausar();
        this.pausado = true;
        if (this.voz) this.voz.detener();
        if (this.musica) this.musica.pausar();
        this.vista.mostrarPausa(true);
    }

    reanudarJuego() {
        if (!this.juegoActual || !this.pausado) return;
        this.juegoActual.reanudar();
        this.pausado = false;
        if (this.musica) this.musica.reanudar();
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
        const cambioContenido = this.actualizarGradoContenido(meta, resultado);
        const pegatinasNuevas = this.otorgarPegatinas(resultado.estrellas);
        queueMicrotask(() => {
            if (juego !== this.juegoActual) return; // el niño salió justo en ese instante
            this.limpiarJuego();
            if (resultado.estrellas > 0) this.audio.reproducirEfecto('victoria'); // aparte de «nivel»: este no debe disparar la reacción de «subió de nivel»
            this.celebrar(resultado.estrellas, pegatinasNuevas.length);
            this.mostrar('resultados', {
                meta,
                resultado,
                colocacion: Boolean(resultado.colocacion),
                subioContenido: cambioContenido === 'subio',
                pegatinasNuevas,
                esRecord: registro.esRecord,
                estrellasGanadas: registro.estrellasGanadas,
                estrellasTotales: this.progreso.estrellasTotales()
            });
        });
    }

    /**
     * Guarda el grado de contenido decidido por la misión, o lo ajusta tras una partida normal.
     * @returns {'subio'|'bajo'|null}
     */
    actualizarGradoContenido(meta, resultado) {
        const Clase = this.registro.obtener(meta.id);
        if (!Clase || !Clase.admiteColocacion) return null;
        try {
            if (resultado.colocacion) {
                this.progreso.guardarGradoContenido(meta.id, resultado.gradoContenido);
                return null;
            }
            const perfil = this.progreso.perfilActivo();
            const { gradoMin, gradoMax } = this.escaleraDe(Clase, perfil);
            const actual = this.progreso.obtenerGradoContenido(meta.id) ?? gradoMax;
            const { grado, cambio } = ajustarGradoContenido({ grado: actual, gradoMin, gradoMax, resultado });
            if (cambio) {
                this.progreso.guardarGradoContenido(meta.id, grado);
                this.progreso.reiniciarHabilidades(meta.id); // los niveles por habilidad eran del grado anterior
            }
            return cambio;
        } catch (error) {
            console.error('No se pudo actualizar el grado de contenido:', error);
            return null;
        }
    }

    /** Fiesta al terminar: confeti con 2–3 estrellas, destello por cada pegatina y fanfarria si hubo estrellas. */
    celebrar(estrellas, pegatinas) {
        if (estrellas >= 2) this.vista.confeti(estrellas === 3 ? 60 : 36);
        if (pegatinas > 0) this.audio.reproducirEfecto('estrella');
        if (estrellas > 0 && this.musica) this.musica.fanfarria();
    }

    /** Destruye el juego en curso (si lo hay). Es seguro llamarlo siempre. */
    limpiarJuego() {
        const juego = this.juegoActual;
        this.juegoActual = null;
        this.pausado = false;
        this.vista.dejarDeObservarTexto();
        if (this.voz) this.voz.detener();
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
                id, nombre: this.nombreJuego(id), contenido: perfil.contenido[id] ?? null, ...j
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

    /** Modo maestro: el niño vuelve a hacer la misión de inicio (conserva sus estrellas). */
    repetirMision(id) {
        this.progreso.reiniciarColocacion(id);
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
                    j.ultimaPartida ? new Date(j.ultimaPartida).toISOString() : '', perfil.contenido[id] ?? ''
                ]);
            }
        }
        return aCSV(['jugador', 'grado', 'juego', 'partidas', 'mejor_puntaje', 'mejores_estrellas', 'ultima_partida', 'grado_contenido'], filas);
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
