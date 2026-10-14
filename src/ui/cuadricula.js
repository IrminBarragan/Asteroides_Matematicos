/**
 * Cuadrícula de filas × columnas. Dibuja el estado de `core/material.js` (EstadoCuadricula); las reglas no viven aquí.
 *
 *  - modo 'ver'       → solo se muestra (la ayuda de las tablas)
 *  - modo 'construir' → botones para sumar y quitar filas y columnas (armar «4 filas y 6 columnas»)
 *  - modo 'completar' → las filas ya están; solo se agregan columnas (¿cuántas hacen falta para llegar al total?)
 *
 * Es un `<div>` con una rejilla CSS: cada cuadro es un `<span>`. El total y las dimensiones se escriben aparte
 * (`aria-live`), así que un lector de pantalla recibe la misma información que se ve.
 */
import { h, vaciar } from './dom.js';

export class Cuadricula {
    /** @param {{estado:import('../core/material.js').EstadoCuadricula, modo:'ver'|'construir'|'completar', objetivoTotal?:number, alCambiar?:Function}} p */
    constructor({ estado, modo, objetivoTotal = null, alCambiar = () => {} }) {
        this.estado = estado;
        this.modo = modo;
        this.objetivoTotal = objetivoTotal;
        this.alCambiar = alCambiar;
        this.activa = true;
        this.rejilla = h('div', { class: 'cuadricula__rejilla', 'aria-hidden': 'true' });
        this.resumen = h('p', { class: 'cuadricula__resumen', 'aria-live': 'polite' });
        this.controles = modo === 'ver' ? null : this.crearControles();
        this.elemento = h('div', { class: `cuadricula cuadricula--${modo}`, role: 'group', 'aria-label': 'Cuadrícula de filas y columnas' }, this.rejilla, this.resumen, this.controles);
        this.render();
    }

    crearControles() {
        const boton = (texto, etiqueta, alClic) => h('button', { class: 'boton boton--secundario boton--chico', type: 'button', 'aria-label': etiqueta, onClick: alClic }, texto);
        this.botones = {
            masFilas: boton('+ fila', 'Agregar una fila', () => this.hacer(() => this.estado.masFilas())),
            menosFilas: boton('− fila', 'Quitar una fila', () => this.hacer(() => this.estado.menosFilas())),
            masColumnas: boton('+ columna', 'Agregar una columna', () => this.hacer(() => this.estado.masColumnas())),
            menosColumnas: boton('− columna', 'Quitar una columna', () => this.hacer(() => this.estado.menosColumnas()))
        };
        this.botonDeshacer = boton('Deshacer', 'Deshacer el último cambio', () => this.deshacer());
        const columnas = [this.botones.menosColumnas, this.botones.masColumnas];
        const filas = this.modo === 'completar' ? [] : [this.botones.menosFilas, this.botones.masFilas];
        return h('div', { class: 'cuadricula__controles' }, filas, columnas, this.botonDeshacer);
    }

    hacer(accion) {
        if (!this.activa || !accion()) return;
        this.render();
        this.alCambiar(this.estado);
    }

    deshacer() {
        if (this.activa && this.estado.deshacer()) { this.render(); this.alCambiar(this.estado); }
    }

    render() {
        const { filas, columnas } = this.estado;
        vaciar(this.rejilla);
        this.rejilla.style.gridTemplateColumns = `repeat(${Math.max(columnas, 1)}, var(--lado-cuadro))`;
        for (let i = 0; i < filas * columnas; i++) this.rejilla.append(h('span', { class: 'cuadricula__cuadro' }));
        const total = this.estado.total();
        this.resumen.textContent = this.modo === 'completar'
            ? `${filas} filas × ${columnas} columnas = ${total} cuadros (hay que llegar a ${this.objetivoTotal})`
            : `${filas} ${filas === 1 ? 'fila' : 'filas'} y ${columnas} ${columnas === 1 ? 'columna' : 'columnas'}${this.modo === 'ver' ? '' : ` · ${total} cuadros`}`;
        if (this.botones) {
            this.botones.masFilas.disabled = !this.activa || filas >= this.estado.maxFilas;
            this.botones.menosFilas.disabled = !this.activa || filas === 0;
            this.botones.masColumnas.disabled = !this.activa || columnas >= this.estado.maxColumnas;
            this.botones.menosColumnas.disabled = !this.activa || columnas === 0;
            this.botonDeshacer.disabled = !this.activa || this.estado.pasado.length === 0;
        }
    }

    desactivar() {
        this.activa = false;
        this.render();
    }
}
