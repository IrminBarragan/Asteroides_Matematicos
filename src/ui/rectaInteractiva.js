/**
 * Recta de saltos: el niño avanza o retrocede con botones de saltos (+1, +10, +100…) y ve el camino dibujado.
 * Dibuja el estado de `core/material.js` (EstadoRecta).
 *
 * La escala se ajusta a lo recorrido (entre el punto más bajo y el más alto que se visitaron), porque una recta fija
 * de 0 a 999 999 dejaría los saltos pequeños invisibles. Por eso el dibujo no es lo único que informa: debajo siempre
 * está el camino escrito («370 → +10 → 380») y la posición actual, que también leen los lectores de pantalla.
 */
import { h, svgDesdeMarkup } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const ANCHO = 600;
const ALTO = 160;
const Y_RECTA = 90;
const MARGEN = 40;

const numero = (n) => String(n);

function el(etiqueta, atributos = {}) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, String(v));
    return nodo;
}

export class RectaInteractiva {
    /** @param {{estado:import('../core/material.js').EstadoRecta, alCambiar?:Function}} p */
    constructor({ estado, alCambiar = () => {} }) {
        this.estado = estado;
        this.alCambiar = alCambiar;
        this.activa = true;
        this.dibujo = svgDesdeMarkup(`<svg xmlns="${NS}" class="recta-int__dibujo" viewBox="0 0 ${ANCHO} ${ALTO}" aria-hidden="true"></svg>`);
        this.posicion = h('p', { class: 'recta-int__posicion', 'aria-live': 'polite' });
        this.cadena = h('p', { class: 'recta-int__cadena' });
        this.botones = [];
        const fila = (signo, direccion) => h('div', { class: `recta-int__fila recta-int__fila--${direccion > 0 ? 'avanza' : 'retrocede'}` },
            estado.saltos.map((s) => {
                const boton = h('button', {
                    class: 'recta-int__salto', type: 'button',
                    'aria-label': `${direccion > 0 ? 'Avanzar' : 'Retroceder'} ${s}`,
                    onClick: () => this.saltar(s, direccion)
                }, `${signo}${s}`);
                this.botones.push(boton);
                return boton;
            }));
        this.botonDeshacer = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.deshacer() }, 'Deshacer');
        this.botonReiniciar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.reiniciar() }, 'Empezar de nuevo');
        this.elemento = h('div', { class: 'recta-int', role: 'group', 'aria-label': 'Recta de saltos' },
            this.dibujo, this.posicion, this.cadena,
            fila('+', 1), fila('−', -1),
            h('div', { class: 'recta-int__acciones' }, this.botonDeshacer, this.botonReiniciar));
        this.render();
    }

    saltar(tamano, direccion) {
        if (!this.activa || !this.estado.saltar(tamano, direccion)) return;
        this.cambio();
    }

    deshacer() {
        if (this.activa && this.estado.deshacer()) this.cambio();
    }

    reiniciar() {
        if (!this.activa) return;
        this.estado.reiniciar();
        this.cambio();
    }

    cambio() {
        this.render();
        this.alCambiar(this.estado.posicion);
    }

    render() {
        const { historial, desde, posicion } = this.estado;
        const puntos = [desde, ...historial.map((s) => s.a)];
        this.posicion.textContent = `Estás en: ${numero(posicion)}`;
        this.cadena.textContent = historial.length === 0
            ? `Empiezas en ${numero(desde)}.`
            : `Empiezas en ${numero(desde)} ${historial.map((s) => `→ ${s.paso > 0 ? '+' : '−'}${Math.abs(s.paso)} → ${numero(s.a)}`).join(' ')}`;
        this.botonDeshacer.disabled = !this.activa || historial.length === 0;
        this.botonReiniciar.disabled = !this.activa || historial.length === 0;
        this.botones.forEach((b) => { b.disabled = !this.activa; });
        this.dibujar(puntos);
    }

    dibujar(puntos) {
        const bajo = Math.min(...puntos);
        const alto = Math.max(...puntos);
        // Sin saltos todavía hay un solo punto: se da holgura según el salto más grande; después, una proporción de lo recorrido
        const holgura = alto === bajo ? Math.max(...this.estado.saltos) / 2 : (alto - bajo) * 0.15;
        const minimo = bajo - holgura;
        const rango = alto + holgura - minimo;
        const x = (v) => MARGEN + ((v - minimo) / rango) * (ANCHO - 2 * MARGEN);
        this.dibujo.replaceChildren();
        this.dibujo.append(el('line', { x1: MARGEN / 2, y1: Y_RECTA, x2: ANCHO - MARGEN / 2, y2: Y_RECTA, class: 'recta-int__linea' }));
        puntos.forEach((v, i) => {
            this.dibujo.append(el('line', { x1: x(v), y1: Y_RECTA - 8, x2: x(v), y2: Y_RECTA + 8, class: 'recta-int__marca' }));
            if (i > 0) {
                const antes = x(puntos[i - 1]);
                const ahora = x(v);
                const alturaArco = Math.min(55, 18 + Math.abs(ahora - antes) / 6);
                this.dibujo.append(el('path', {
                    d: `M ${antes} ${Y_RECTA} Q ${(antes + ahora) / 2} ${Y_RECTA - alturaArco * 2} ${ahora} ${Y_RECTA}`,
                    class: `recta-int__arco recta-int__arco--${v > puntos[i - 1] ? 'avanza' : 'retrocede'}`
                }));
            }
        });
        // Si el inicio y la posición actual quedan muy juntos, el segundo rótulo baja para no encimarse
        const juntos = puntos.length > 1 && Math.abs(x(puntos[puntos.length - 1]) - x(puntos[0])) < 120;
        const rotulo = (v, clase, fila = 0) => {
            const t = el('text', { x: Math.min(Math.max(x(v), 28), ANCHO - 28), y: Y_RECTA + 28 + fila * 28, class: clase, 'text-anchor': 'middle' });
            t.textContent = numero(v);
            this.dibujo.append(t);
        };
        rotulo(puntos[0], 'recta-int__rotulo');
        if (puntos.length > 1) rotulo(puntos[puntos.length - 1], 'recta-int__rotulo recta-int__rotulo--ahora', juntos ? 1 : 0);
        this.dibujo.append(el('circle', { cx: x(puntos[puntos.length - 1]), cy: Y_RECTA, r: 9, class: 'recta-int__ficha' }));
    }

    desactivar() {
        this.activa = false;
        this.render();
    }
}
