/**
 * Grupos de objetos: cajas (multiplicar) o platos (repartir) con objetos dentro. Dibuja el estado de `core/material.js`
 * (EstadoGrupos); las reglas no viven aquí.
 *
 *  - modo 'construir' → cada caja tiene «+» y «−» (se pone el mismo número en cada una)
 *  - modo 'repartir'  → hay un montón arriba; cada plato tiene «Dar uno» y «Quitar uno»
 *
 * Todo son botones (ratón, dedo y teclado). Los objetos son círculos con un número fijo de colores por grupo, y el
 * recuento de cada grupo se escribe aparte, así que no depende del color.
 */
import { h, vaciar } from './dom.js';

const COLORES = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#dc2626', '#0891b2'];

export class GruposObjetos {
    /** @param {{estado:import('../core/material.js').EstadoGrupos, modo:'construir'|'repartir', contenedor?:string, cosa?:string, alCambiar?:Function}} p */
    constructor({ estado, modo, contenedor = 'caja', cosa = 'objetos', alCambiar = () => {} }) {
        this.estado = estado;
        this.modo = modo;
        this.contenedor = contenedor;
        this.cosa = cosa;
        this.alCambiar = alCambiar;
        this.activo = true;
        this.grupos = Array.from({ length: estado.grupos }, (_, i) => this.crearGrupo(i));
        this.montonNumero = h('span', { class: 'grupos-obj__monton-numero' });
        this.montonPiezas = h('div', { class: 'grupos-obj__piezas', 'aria-hidden': 'true' });
        this.resumen = h('p', { class: 'grupos-obj__resumen', 'aria-live': 'polite' });
        this.botonDeshacer = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.deshacer() }, 'Deshacer');
        this.botonReiniciar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.reiniciar() }, 'Empezar de nuevo');
        this.elemento = h('div', { class: `grupos-obj grupos-obj--${modo}`, role: 'group', 'aria-label': modo === 'repartir' ? 'Platos para repartir' : 'Grupos de objetos' },
            modo === 'repartir' ? h('div', { class: 'grupos-obj__monton' }, h('p', { class: 'grupos-obj__monton-titulo' }, `Por repartir: `, this.montonNumero), this.montonPiezas) : null,
            h('div', { class: 'grupos-obj__grupos' }, this.grupos.map((g) => g.nodo)),
            this.resumen,
            h('div', { class: 'grupos-obj__acciones' }, this.botonDeshacer, this.botonReiniciar));
        this.render();
    }

    nombre(i) {
        return this.modo === 'repartir' ? `Plato ${i + 1}` : `${this.contenedor[0].toUpperCase()}${this.contenedor.slice(1)} ${i + 1}`;
    }

    crearGrupo(i) {
        const boton = (texto, etiqueta, alClic) => h('button', { class: 'boton boton--secundario boton--chico grupos-obj__boton', type: 'button', 'aria-label': etiqueta, onClick: alClic }, texto);
        const piezas = h('div', { class: 'grupos-obj__piezas', 'aria-hidden': 'true' });
        const numero = h('span', { class: 'grupos-obj__numero', 'aria-hidden': 'true' });
        const mas = boton(this.modo === 'repartir' ? 'Dar uno' : '+', `${this.modo === 'repartir' ? 'Dar uno al' : 'Poner uno en la'} ${this.nombre(i).toLowerCase()}`, () => this.hacer(() => this.estado.agregar(i)));
        const menos = boton(this.modo === 'repartir' ? 'Quitar uno' : '−', `Quitar uno de ${this.nombre(i).toLowerCase()}`, () => this.hacer(() => this.estado.retirar(i)));
        const nodo = h('div', { class: 'grupos-obj__grupo' },
            h('p', { class: 'grupos-obj__nombre' }, this.nombre(i)), piezas, numero,
            h('div', { class: 'grupos-obj__controles' }, menos, mas));
        return { indice: i, nodo, piezas, numero, mas, menos };
    }

    hacer(accion) {
        if (!this.activo || !accion()) return;
        this.render();
        this.alCambiar(this.estado);
    }

    deshacer() {
        if (this.activo && this.estado.deshacer()) { this.render(); this.alCambiar(this.estado); }
    }

    reiniciar() {
        if (!this.activo) return;
        this.estado.reiniciar();
        this.render();
        this.alCambiar(this.estado);
    }

    render() {
        const { cuenta, pool } = this.estado;
        for (const g of this.grupos) {
            const n = cuenta[g.indice];
            vaciar(g.piezas);
            for (let k = 0; k < n; k++) g.piezas.append(h('span', { class: 'grupos-obj__pieza', style: `background:${COLORES[g.indice % COLORES.length]}` }));
            g.numero.textContent = String(n);
            g.mas.disabled = !this.activo || n >= this.estado.maximoPorGrupo || (pool !== null && pool === 0);
            g.menos.disabled = !this.activo || n === 0;
        }
        if (pool !== null) {
            vaciar(this.montonPiezas);
            for (let k = 0; k < pool; k++) this.montonPiezas.append(h('span', { class: 'grupos-obj__pieza grupos-obj__pieza--monton' }));
            this.montonNumero.textContent = String(pool);
        }
        this.resumen.textContent = `${this.grupos.map((g) => `${this.nombre(g.indice)}: ${cuenta[g.indice]}`).join(' · ')}${pool !== null ? ` · Por repartir: ${pool}` : ''}`;
        this.botonDeshacer.disabled = !this.activo || this.estado.pasado.length === 0;
        this.botonReiniciar.disabled = !this.activo || this.estado.pasado.length === 0;
    }

    desactivar() {
        this.activo = false;
        this.render();
    }
}
