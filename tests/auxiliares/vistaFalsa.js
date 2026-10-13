/** Vista falsa: registra lo que el controlador le pide, sin DOM. */
export function crearVistaFalsa() {
    const vista = {
        pantallas: [],
        avisos: [],
        pausas: [],
        contenedor: { id: 'contenedor-falso' },
        mostrar(nombre, datos) { vista.pantallas.push({ nombre, datos }); },
        contenedorJuego() { return vista.contenedor; },
        mostrarPausa(activa) { vista.pausas.push(activa); },
        aviso(texto, tipo) { vista.avisos.push({ texto, tipo }); },
        lecciones: [],
        respuestaLeccion: 'terminada',
        mostrarLeccion(leccion, opciones) { vista.lecciones.push({ leccion, opciones }); return Promise.resolve(vista.respuestaLeccion); },
        texto: '',
        textoALeer() { return vista.texto; },
        observadores: 0,
        observarTexto(cb) { vista.observadores++; vista.alCambiarTexto = cb; },
        dejarDeObservarTexto() { vista.alCambiarTexto = null; },
        ultima() { return vista.pantallas[vista.pantallas.length - 1]; }
    };
    return vista;
}

/** Audio falso con el mismo contrato que GestorAudio. */
export function crearAudioFalso() {
    return {
        activo: false, inicializado: 0, reanudado: 0, efectos: [],
        inicializar() { this.inicializado++; },
        reanudar() { this.reanudado++; },
        establecerActivo(v) { this.activo = Boolean(v); return this.activo; },
        reproducirEfecto(tipo) { this.efectos.push(tipo); }
    };
}
