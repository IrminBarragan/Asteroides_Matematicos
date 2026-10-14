/**
 * Bloques de valor posicional: una columna por valor (unidades a la derecha) con bloques que se ponen, se cambian o se
 * quitan. Dibuja el estado de `core/material.js` (EstadoBloques); las reglas no viven aquí.
 *
 *  - modo 'ver'       → solo se muestran (leer un número)
 *  - modo 'construir' → botones «+» y «−» por columna (armar un número)
 *  - modo 'juntar'    → «Cambiar 10 por 1» (la llevada de una suma)
 *  - modo 'quitar'    → «Quitar uno» y «Cambiar 1 por 10» (el préstamo de una resta)
 *
 * Todo son botones: funciona con ratón, dedo y teclado. (No se arrastra: en una pantalla táctil de aula, un botón
 * grande se acierta más que un arrastre, y el teclado queda cubierto sin código extra.)
 * Las piezas no dependen solo del color: cada columna tiene su forma (cuadrito, barra, plano, cubo).
 */
import { h, vaciar } from './dom.js';

const NOMBRES = ['unidades', 'decenas', 'centenas', 'unidades de millar'];
const NOMBRES_UNO = ['unidad', 'decena', 'centena', 'unidad de millar'];

export class BloquesValor {
    /** @param {{estado:import('../core/material.js').EstadoBloques, modo:'ver'|'construir'|'juntar'|'quitar', alCambiar?:Function}} p */
    constructor({ estado, modo, alCambiar = () => {} }) {
        this.estado = estado;
        this.modo = modo;
        this.alCambiar = alCambiar;
        this.activo = true;
        this.columnas = [];
        for (let c = estado.columnas - 1; c >= 0; c--) this.columnas.push(this.crearColumna(c));
        this.resumen = h('p', { class: 'bloques-valor__resumen', 'aria-live': 'polite' });
        this.botonDeshacer = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.deshacer() }, 'Deshacer');
        this.botonReiniciar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.reiniciar() }, 'Empezar de nuevo');
        this.elemento = h('div', { class: `bloques-valor bloques-valor--${modo}`, role: 'group', 'aria-label': 'Bloques de valor posicional' },
            h('div', { class: 'bloques-valor__columnas' }, this.columnas.map((c) => c.nodo)),
            this.resumen,
            modo === 'ver' ? null : h('div', { class: 'bloques-valor__acciones' }, this.botonDeshacer, this.botonReiniciar));
        this.render();
    }

    crearColumna(c) {
        const boton = (texto, etiqueta, alClic, clase = '') => h('button', { class: `boton boton--secundario boton--chico bloques-valor__boton ${clase}`.trim(), type: 'button', 'aria-label': etiqueta, onClick: alClic }, texto);
        const piezas = h('div', { class: 'bloques-valor__piezas', 'aria-hidden': 'true' });
        const numero = h('span', { class: 'bloques-valor__numero', 'aria-hidden': 'true' });
        const controles = [];
        const botones = {};
        if (this.modo === 'construir') {
            botones.mas = boton('+', `Poner ${NOMBRES_UNO[c] === 'unidad' ? 'una unidad' : `una ${NOMBRES_UNO[c]}`}`, () => this.hacer(() => this.estado.agregar(c)));
            botones.menos = boton('−', `Quitar ${NOMBRES_UNO[c] === 'unidad' ? 'una unidad' : `una ${NOMBRES_UNO[c]}`}`, () => this.hacer(() => this.estado.retirar(c)));
            controles.push(botones.menos, botones.mas);
        }
        if (this.modo === 'juntar' && c + 1 < this.estado.columnas) {
            botones.juntar = boton(`10 → 1`, `Cambiar 10 ${NOMBRES[c]} por 1 ${NOMBRES_UNO[c + 1]}`, () => this.hacer(() => this.estado.juntar(c)), 'bloques-valor__cambio');
            controles.push(botones.juntar);
        }
        if (this.modo === 'quitar') {
            botones.quitar = boton('Quitar uno', `Quitar una pieza de las ${NOMBRES[c]}`, () => this.hacer(() => this.estado.quitar(c)));
            controles.push(botones.quitar);
            if (c >= 1) {
                botones.separar = boton('1 → 10', `Cambiar 1 ${NOMBRES_UNO[c]} por 10 ${NOMBRES[c - 1]}`, () => this.hacer(() => this.estado.separar(c)), 'bloques-valor__cambio');
                controles.push(botones.separar);
            }
        }
        const nodo = h('div', { class: `bloques-valor__columna bloques-valor__columna--${c}` },
            h('p', { class: 'bloques-valor__nombre' }, NOMBRES[c]),
            piezas, numero,
            controles.length ? h('div', { class: 'bloques-valor__controles' }, controles) : null);
        return { indice: c, nodo, piezas, numero, botones };
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
        const { cuenta, quitadas } = this.estado;
        for (const col of this.columnas) {
            const n = cuenta[col.indice];
            vaciar(col.piezas);
            for (let i = 0; i < n; i++) col.piezas.append(h('span', { class: `bloques-valor__pieza bloques-valor__pieza--${col.indice}` }));
            for (let i = 0; i < quitadas[col.indice]; i++) col.piezas.append(h('span', { class: `bloques-valor__pieza bloques-valor__pieza--${col.indice} bloques-valor__pieza--quitada` }));
            col.numero.textContent = String(n);
            col.nodo.classList.toggle('bloques-valor__columna--llena', n >= 10);
            const b = col.botones;
            if (b.mas) b.mas.disabled = !this.activo || n >= this.estado.maximoPorColumna;
            if (b.menos) b.menos.disabled = !this.activo || n === 0;
            if (b.juntar) b.juntar.disabled = !this.activo || n < 10;
            if (b.quitar) b.quitar.disabled = !this.activo || n === 0;
            if (b.separar) b.separar.disabled = !this.activo || n < 1;
        }
        const partes = this.columnas.map((col) => `${NOMBRES[col.indice]}: ${cuenta[col.indice]}`); // de la columna más alta a las unidades
        this.resumen.textContent = this.modo === 'quitar' && this.estado.valorQuitado() > 0
            ? `${partes.join(' · ')} · Quitaste ${this.estado.valorQuitado()}`
            : partes.join(' · ');
        this.botonDeshacer.disabled = !this.activo || this.estado.pasado.length === 0;
        this.botonReiniciar.disabled = !this.activo || this.estado.pasado.length === 0;
    }

    desactivar() {
        this.activo = false;
        this.render();
    }
}
