/**
 * CONTRATO DE JUEGO
 *
 * Todo juego del portal extiende esta clase. El portal solo conoce esta interfaz:
 * monta, pausa, reanuda y destruye juegos, y recibe el resultado por el evento 'fin'.
 * Así agregar un juego nuevo no obliga a tocar el portal ni los demás juegos.
 *
 * Patrón "método plantilla": los métodos públicos (montar, pausar...) son FINALES en la práctica;
 * controlan las transiciones de estado y llaman a ganchos (alMontar, alPausar...) que cada
 * juego implementa. Un juego no puede olvidarse de actualizar el estado ni de limpiar el bus.
 *
 * Estados: creado → jugando ⇄ pausado → terminado → destruido   (destruir es válido desde cualquiera)
 */
import { BusEventos } from './eventos.js';
import { normalizarResultado } from './resultado.js';

export const AREAS = ['matematicas', 'espanol', 'ciencias', 'medicion'];
export const ESTADOS = ['creado', 'jugando', 'pausado', 'terminado', 'destruido'];

/**
 * Valida los metadatos estáticos que describe un juego.
 * @throws {Error} si falta o es inválido algún campo
 */
export function validarMeta(meta) {
    if (!meta || typeof meta !== 'object') throw new Error('El juego no define `static meta`');
    const { id, nombre, descripcion, area, grados } = meta;
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) {
        throw new Error('meta.id debe ser texto en minúsculas, números y guiones');
    }
    if (typeof nombre !== 'string' || nombre.trim() === '') throw new Error(`${id}: meta.nombre vacío`);
    if (typeof descripcion !== 'string' || descripcion.trim() === '') throw new Error(`${id}: meta.descripcion vacía`);
    if (!AREAS.includes(area)) throw new Error(`${id}: meta.area debe ser una de ${AREAS.join(', ')}`);
    if (!Array.isArray(grados) || grados.length === 0
        || !grados.every((g) => Number.isInteger(g) && g >= 1 && g <= 6)) {
        throw new Error(`${id}: meta.grados debe ser una lista de enteros entre 1 y 6`);
    }
    return meta;
}

export class Juego {
    /**
     * @param {Object} [dependencias]
     * @param {BusEventos} [dependencias.bus]  inyectable para pruebas
     */
    constructor({ bus = new BusEventos() } = {}) {
        this.bus = bus;
        this.estado = 'creado';
        this.contenedor = null;
        this.contexto = null;
    }

    get meta() {
        return this.constructor.meta;
    }

    // ---------- API pública (la usa el portal) ----------

    /**
     * Dibuja el juego dentro de `contenedor` y lo deja jugando.
     * @param {HTMLElement} contenedor
     * @param {Object} contexto  { grado, perfil, audio, ... } lo que el portal le entrega
     */
    montar(contenedor, contexto = {}) {
        if (this.estado !== 'creado') throw new Error(`No se puede montar un juego en estado "${this.estado}"`);
        this.contenedor = contenedor;
        this.contexto = contexto;
        this.alMontar(contenedor, contexto);
        this.estado = 'jugando';
    }

    pausar() {
        if (this.estado !== 'jugando') return;
        this.estado = 'pausado';
        this.alPausar();
    }

    reanudar() {
        if (this.estado !== 'pausado') return;
        this.estado = 'jugando';
        this.alReanudar();
    }

    /**
     * Libera TODO: eventos, timers, nodos del DOM. Es idempotente.
     * Después de esto el juego no puede volver a usarse.
     */
    destruir() {
        if (this.estado === 'destruido') return;
        try {
            this.alDestruir();
        } finally {
            this.estado = 'destruido';
            this.bus.limpiar();
            this.contenedor = null;
            this.contexto = null;
        }
    }

    /** El portal se suscribe aquí: juego.alTerminar((resultado) => ...). Devuelve la función para cancelar. */
    alTerminar(funcion) {
        return this.bus.on('fin', funcion);
    }

    // ---------- Para uso del propio juego ----------

    /**
     * Declara la partida terminada y avisa al portal. Los juegos llaman a esto, no al bus directamente.
     * @param {Object} resultado  ver resultado.js
     */
    finalizar(resultado) {
        if (this.estado !== 'jugando' && this.estado !== 'pausado') return;
        const normalizado = normalizarResultado(resultado);
        this.estado = 'terminado';
        this.bus.emit('fin', normalizado);
    }

    // ---------- Ganchos que implementa cada juego ----------

    alMontar(/* contenedor, contexto */) {
        throw new Error(`${this.constructor.name} debe implementar alMontar()`);
    }

    alPausar() {}

    alReanudar() {}

    alDestruir() {}
}
