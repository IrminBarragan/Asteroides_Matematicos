/**
 * Planificador de tareas en TIEMPO DE JUEGO.
 *
 * Un `setTimeout` sigue corriendo aunque el juego esté en pausa (y se ejecutaría con el juego detenido).
 * Este planificador solo avanza cuando alguien llama a `avanzar(ms)` —por ejemplo desde el `BucleJuego`—,
 * así que pausar el bucle pausa también las tareas pendientes, sin código extra en cada juego.
 */
export class Planificador {
    constructor() {
        this.tiempo = 0;
        this.tareas = new Map();
        this.siguienteId = 1;
    }

    /**
     * Ejecuta `funcion` cuando hayan pasado `ms` de tiempo de juego.
     * @returns {number} id para cancelar
     */
    programar(ms, funcion) {
        const id = this.siguienteId++;
        this.tareas.set(id, { cuando: this.tiempo + Math.max(0, ms), funcion });
        return id;
    }

    cancelar(id) {
        return this.tareas.delete(id);
    }

    get pendientes() {
        return this.tareas.size;
    }

    /**
     * Avanza el reloj de juego y ejecuta, en orden cronológico, lo que vence en ese lapso.
     * Mientras corre una tarea, el reloj marca SU hora de vencimiento: si programa otra "a 10 ms",
     * cuenta desde ahí. Así el resultado no depende de qué tan grande sea cada avance.
     */
    avanzar(ms) {
        const objetivo = this.tiempo + ms;
        for (;;) {
            let siguiente = null;
            for (const [id, tarea] of this.tareas) {
                if (tarea.cuando <= objetivo && (!siguiente || tarea.cuando < siguiente.tarea.cuando)) {
                    siguiente = { id, tarea };
                }
            }
            if (!siguiente) break;
            this.tareas.delete(siguiente.id);
            this.tiempo = Math.max(this.tiempo, siguiente.tarea.cuando);
            siguiente.tarea.funcion();
        }
        this.tiempo = objetivo;
    }

    limpiar() {
        this.tareas.clear();
    }
}
