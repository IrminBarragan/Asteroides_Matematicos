/**
 * Bus de eventos mínimo (patrón Observer / publicar-suscribir).
 *
 * Sirve para que las piezas se comuniquen sin conocerse: un juego avisa
 * "terminé" y el portal decide qué hacer, sin que el juego importe al portal.
 */
export class BusEventos {
    constructor() {
        this.oyentes = new Map();
    }

    /**
     * Suscribe una función a un evento.
     * @returns {Function} función que cancela la suscripción
     */
    on(evento, funcion) {
        if (typeof funcion !== 'function') {
            throw new TypeError('El oyente debe ser una función');
        }
        if (!this.oyentes.has(evento)) {
            this.oyentes.set(evento, new Set());
        }
        this.oyentes.get(evento).add(funcion);
        return () => this.off(evento, funcion);
    }

    /**
     * Suscribe una función que se ejecuta una sola vez.
     */
    once(evento, funcion) {
        const cancelar = this.on(evento, (datos) => {
            cancelar();
            funcion(datos);
        });
        return cancelar;
    }

    off(evento, funcion) {
        const conjunto = this.oyentes.get(evento);
        if (!conjunto) return;
        conjunto.delete(funcion);
        if (conjunto.size === 0) {
            this.oyentes.delete(evento);
        }
    }

    /**
     * Emite un evento. Un oyente que falla no impide que los demás se ejecuten.
     */
    emit(evento, datos) {
        const conjunto = this.oyentes.get(evento);
        if (!conjunto) return;
        // Copia: un oyente puede cancelarse a sí mismo mientras se recorre
        for (const funcion of [...conjunto]) {
            try {
                funcion(datos);
            } catch (error) {
                console.error(`Error en un oyente del evento "${evento}":`, error);
            }
        }
    }

    /**
     * Cantidad de oyentes de un evento (útil para comprobar que no hay fugas).
     */
    cantidad(evento) {
        const conjunto = this.oyentes.get(evento);
        return conjunto ? conjunto.size : 0;
    }

    limpiar() {
        this.oyentes.clear();
    }
}
