/**
 * Entrada unificada: mouse, táctil y lápiz con un único código (Pointer Events),
 * más teclado por "acciones" en vez de teclas sueltas.
 */

/**
 * Convierte coordenadas de pantalla a las coordenadas lógicas del juego.
 *
 * El canvas se dibuja en un tamaño lógico fijo (p. ej. 900×600) pero el CSS lo
 * escala; sin esta conversión los clics caen en el lugar equivocado.
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {{left:number, top:number, width:number, height:number}} rect  getBoundingClientRect()
 */
export function aCoordenadasLogicas(clientX, clientY, rect, anchoLogico, altoLogico) {
    if (rect.width === 0 || rect.height === 0) {
        return { x: 0, y: 0 };
    }
    return {
        x: (clientX - rect.left) * (anchoLogico / rect.width),
        y: (clientY - rect.top) * (altoLogico / rect.height)
    };
}

export class EntradaPuntero {
    /**
     * @param {HTMLElement} elemento
     * @param {Object} opciones
     * @param {number} opciones.anchoLogico
     * @param {number} opciones.altoLogico
     * @param {Function} [opciones.alPresionar]  ({x, y, tipo}) => void
     * @param {Function} [opciones.alMover]      ({x, y, tipo, presionado}) => void
     * @param {Function} [opciones.alSoltar]     ({x, y, tipo}) => void
     */
    constructor(elemento, { anchoLogico, altoLogico, alPresionar, alMover, alSoltar }) {
        this.elemento = elemento;
        this.anchoLogico = anchoLogico;
        this.altoLogico = altoLogico;
        this.alPresionar = alPresionar;
        this.alMover = alMover;
        this.alSoltar = alSoltar;
        this.presionado = false;
        this.activo = false;

        this.manejadores = {
            pointerdown: (e) => this.alBajar(e),
            pointermove: (e) => this.alDesplazar(e),
            pointerup: (e) => this.alLevantar(e),
            pointercancel: (e) => this.alLevantar(e)
        };
    }

    activar() {
        if (this.activo) return;
        this.activo = true;
        // Sin esto el navegador táctil interpreta el gesto como scroll/zoom y cancela el arrastre
        this.elemento.style.touchAction = 'none';
        for (const [evento, manejador] of Object.entries(this.manejadores)) {
            this.elemento.addEventListener(evento, manejador);
        }
    }

    desactivar() {
        if (!this.activo) return;
        this.activo = false;
        this.presionado = false;
        for (const [evento, manejador] of Object.entries(this.manejadores)) {
            this.elemento.removeEventListener(evento, manejador);
        }
    }

    punto(evento) {
        const punto = aCoordenadasLogicas(
            evento.clientX,
            evento.clientY,
            this.elemento.getBoundingClientRect(),
            this.anchoLogico,
            this.altoLogico
        );
        return { ...punto, tipo: evento.pointerType || 'mouse' };
    }

    alBajar(evento) {
        this.presionado = true;
        // Mantiene los eventos aunque el dedo/mouse salga del elemento durante el arrastre
        try {
            this.elemento.setPointerCapture(evento.pointerId);
        } catch (error) { /* no crítico: no todos los elementos/entornos lo permiten */ }
        if (this.alPresionar) this.alPresionar(this.punto(evento));
    }

    alDesplazar(evento) {
        if (this.alMover) this.alMover({ ...this.punto(evento), presionado: this.presionado });
    }

    alLevantar(evento) {
        const estabaPresionado = this.presionado;
        this.presionado = false;
        if (estabaPresionado && this.alSoltar) this.alSoltar(this.punto(evento));
    }
}

/**
 * Teclado por acciones: el juego pregunta "¿está activa la acción izquierda?"
 * sin saber qué teclas la disparan (flecha, A...), lo que facilita cambiar controles.
 */
export class EntradaTeclado {
    /**
     * @param {Object<string, string[]>} mapa  p. ej. { izquierda: ['ArrowLeft', 'a', 'A'] }
     * @param {EventTarget} [objetivo]         por defecto, document
     * @param {EventTarget} [ventana]          por defecto, window (para detectar pérdida de foco)
     */
    constructor(mapa, objetivo = document, ventana = window) {
        this.mapa = mapa;
        this.objetivo = objetivo;
        this.ventana = ventana;
        this.teclasPresionadas = new Set();
        this.activo = false;
        this.alBajar = (e) => this.teclasPresionadas.add(e.key);
        this.alSubir = (e) => this.teclasPresionadas.delete(e.key);
        // Si la ventana pierde el foco no llega el keyup: sin esto la nave quedaría "pegada"
        this.alPerderFoco = () => this.teclasPresionadas.clear();
    }

    activar() {
        if (this.activo) return;
        this.activo = true;
        this.objetivo.addEventListener('keydown', this.alBajar);
        this.objetivo.addEventListener('keyup', this.alSubir);
        this.ventana.addEventListener('blur', this.alPerderFoco);
    }

    desactivar() {
        if (!this.activo) return;
        this.activo = false;
        this.teclasPresionadas.clear();
        this.objetivo.removeEventListener('keydown', this.alBajar);
        this.objetivo.removeEventListener('keyup', this.alSubir);
        this.ventana.removeEventListener('blur', this.alPerderFoco);
    }

    estaActiva(accion) {
        const teclas = this.mapa[accion] || [];
        return teclas.some((tecla) => this.teclasPresionadas.has(tecla));
    }
}
