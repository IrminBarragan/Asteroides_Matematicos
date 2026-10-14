/**
 * Marcos de diez: casillas en filas de 5 (dos filas = un marco de 10) donde se colocan o se quitan fichas.
 * Dibuja el estado de `core/material.js` (EstadoMarcos); las reglas no viven aquí.
 *
 *  - modo 'colocar' (sumas): botones «Poner azul» / «Poner naranja» / «Quitar la última». Las casillas son solo dibujo.
 *  - modo 'quitar'  (restas): cada ficha es un botón; al tocarla se tacha (y al tocarla otra vez, se destacha).
 *
 * Las fichas no dependen solo del color: la naranja lleva un punto blanco y la tachada, una cruz.
 */
import { h } from './dom.js';

const NOMBRE_CASILLA = { vacia: 'casilla vacía', a: 'ficha azul', b: 'ficha naranja', tachada: 'ficha quitada' };

export class MarcosDiez {
    /**
     * @param {{estado:import('../core/material.js').EstadoMarcos, modo:'colocar'|'quitar', alCambiar?:Function}} p
     */
    constructor({ estado, modo, alCambiar = () => {} }) {
        this.estado = estado;
        this.modo = modo;
        this.alCambiar = alCambiar;
        this.activo = true;
        this.casillas = estado.casillas.map((_, i) => this.crearCasilla(i));
        const marcos = [];
        for (let m = 0; m < estado.capacidad / 10; m++) {
            marcos.push(h('div', { class: 'marcos__marco', role: 'group', 'aria-label': `Marco ${m + 1}` }, this.casillas.slice(m * 10, m * 10 + 10)));
        }
        this.zonaMarcos = h('div', { class: 'marcos__marcos' }, marcos);
        this.contador = h('p', { class: 'marcos__contador', 'aria-live': 'polite' });
        this.controles = modo === 'colocar' ? this.crearControles() : null;
        this.elemento = h('div', { class: `marcos marcos--${modo}`, role: 'group', 'aria-label': 'Marcos de diez' },
            this.zonaMarcos, this.controles, this.contador);
        this.render();
    }

    crearCasilla(i) {
        if (this.modo === 'quitar') {
            return h('button', { class: 'marcos__casilla', type: 'button', onClick: () => this.tachar(i) });
        }
        return h('span', { class: 'marcos__casilla', role: 'img' });
    }

    crearControles() {
        this.botonAzul = h('button', { class: 'boton boton--secundario boton--chico marcos__poner marcos__poner--a', type: 'button', onClick: () => this.poner('a') }, 'Poner azul');
        this.botonNaranja = h('button', { class: 'boton boton--secundario boton--chico marcos__poner marcos__poner--b', type: 'button', onClick: () => this.poner('b') }, 'Poner naranja');
        this.botonQuitar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => this.quitarUltima() }, 'Quitar la última');
        return h('div', { class: 'marcos__controles' }, this.botonAzul, this.botonNaranja, this.botonQuitar);
    }

    poner(color) {
        if (!this.activo || !this.estado.poner(color)) return;
        this.cambio();
    }

    quitarUltima() {
        if (!this.activo || !this.estado.quitarUltima()) return;
        this.cambio();
    }

    tachar(i) {
        if (!this.activo || !this.estado.alternarTachado(i)) return;
        this.cambio();
    }

    cambio() {
        this.render();
        this.alCambiar(this.estado.conteo());
    }

    render() {
        this.estado.casillas.forEach((valor, i) => {
            const nodo = this.casillas[i];
            nodo.className = `marcos__casilla marcos__casilla--${valor}`;
            nodo.setAttribute('aria-label', `Casilla ${i + 1}: ${NOMBRE_CASILLA[valor]}`);
            if (this.modo === 'quitar') {
                nodo.disabled = !this.activo || valor === 'vacia';
                nodo.setAttribute('aria-pressed', String(valor === 'tachada'));
            }
        });
        const c = this.estado.conteo();
        this.contador.textContent = this.modo === 'colocar'
            ? `Azules: ${c.a} · Naranjas: ${c.b}`
            : `Quitaste ${c.tachadas} ${c.tachadas === 1 ? 'ficha' : 'fichas'}`;
    }

    desactivar() {
        this.activo = false;
        this.render();
        [this.botonAzul, this.botonNaranja, this.botonQuitar].forEach((b) => { if (b) b.disabled = true; });
    }
}
