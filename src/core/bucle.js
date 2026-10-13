/**
 * Bucle de juego con paso de tiempo FIJO.
 *
 * Problema que resuelve: si la lógica se actualiza una vez por cuadro de pantalla,
 * el juego corre 2.4 veces más rápido en un monitor de 144 Hz que en uno de 60 Hz.
 * Aquí la lógica avanza en pasos de duración constante (por defecto 1/60 s) sin
 * importar la frecuencia de la pantalla; el dibujo sí ocurre una vez por cuadro.
 *
 * Referencia: "Fix Your Timestep" (Glenn Fiedler).
 */
export const PASO_60_FPS = 1000 / 60;

export class BucleJuego {
    /**
     * @param {Object} opciones
     * @param {Function} opciones.actualizar  (pasoMs) => void, lógica; se llama 0..n veces por cuadro
     * @param {Function} opciones.dibujar     (interpolacion) => void, una vez por cuadro
     * @param {number} [opciones.paso]        duración de cada paso lógico en ms
     * @param {number} [opciones.maxDelta]    tope de tiempo acumulable por cuadro (evita saltos tras pausas)
     * @param {Function} [opciones.raf]       requestAnimationFrame (inyectable para pruebas)
     * @param {Function} [opciones.caf]       cancelAnimationFrame (inyectable para pruebas)
     */
    constructor({ actualizar, dibujar, paso = PASO_60_FPS, maxDelta = 250, raf, caf }) {
        if (typeof actualizar !== 'function' || typeof dibujar !== 'function') {
            throw new TypeError('BucleJuego necesita las funciones actualizar y dibujar');
        }
        this.actualizar = actualizar;
        this.dibujar = dibujar;
        this.paso = paso;
        this.maxDelta = maxDelta;
        this.raf = raf || ((fn) => window.requestAnimationFrame(fn));
        this.caf = caf || ((id) => window.cancelAnimationFrame(id));

        this.corriendo = false;
        this.idCuadro = null;
        this.ultimoTiempo = null;
        this.acumulado = 0;
        this.cuadro = (tiempo) => this.procesarCuadro(tiempo);
    }

    iniciar() {
        if (this.corriendo) return;
        this.corriendo = true;
        this.ultimoTiempo = null; // se fija en el primer cuadro: evita un salto enorme de tiempo
        this.acumulado = 0;
        this.idCuadro = this.raf(this.cuadro);
    }

    /**
     * Detiene el bucle. Al volver a iniciar no se "recupera" el tiempo perdido.
     */
    detener() {
        this.corriendo = false;
        if (this.idCuadro !== null) {
            this.caf(this.idCuadro);
            this.idCuadro = null;
        }
    }

    procesarCuadro(tiempo) {
        if (!this.corriendo) return;

        if (this.ultimoTiempo === null) {
            this.ultimoTiempo = tiempo;
        }
        const delta = Math.min(tiempo - this.ultimoTiempo, this.maxDelta);
        this.ultimoTiempo = tiempo;
        this.acumulado += delta;

        while (this.acumulado >= this.paso) {
            this.actualizar(this.paso);
            this.acumulado -= this.paso;
            // Si la lógica detuvo el bucle (p. ej. fin de partida), no seguir
            if (!this.corriendo) return;
        }

        this.dibujar(this.acumulado / this.paso);
        if (this.corriendo) {
            this.idCuadro = this.raf(this.cuadro);
        }
    }
}
