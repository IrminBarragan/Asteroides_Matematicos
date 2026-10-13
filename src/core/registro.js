/**
 * Registro de juegos disponibles. El portal pregunta aquí qué juegos hay para cada grado.
 */
import { validarMeta } from './juego.js';

export class RegistroJuegos {
    constructor() {
        this.clases = new Map();
    }

    /**
     * @param {Function} ClaseJuego  clase que extiende Juego y define `static meta`
     */
    registrar(ClaseJuego) {
        const meta = validarMeta(ClaseJuego.meta);
        if (this.clases.has(meta.id)) throw new Error(`Ya hay un juego registrado con id "${meta.id}"`);
        this.clases.set(meta.id, ClaseJuego);
        return this;
    }

    obtener(id) {
        return this.clases.get(id) || null;
    }

    /** Metadatos de todos los juegos, en orden de registro. */
    listar() {
        return [...this.clases.values()].map((C) => C.meta);
    }

    /** Juegos que incluyen el grado indicado. */
    porGrado(grado) {
        return this.listar().filter((meta) => meta.grados.includes(grado));
    }

    /** Crea una instancia nueva (cada partida usa una instancia nueva). */
    crear(id, dependencias) {
        const Clase = this.obtener(id);
        if (!Clase) throw new Error(`No existe el juego "${id}"`);
        return new Clase(dependencias);
    }
}
