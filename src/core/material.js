/**
 * Material para manipular (lógica pura, sin DOM): el estado de los «marcos de diez» y de la recta de saltos.
 * La pantalla (ui/marcosDiez.js, ui/rectaInteractiva.js) solo dibuja y reenvía clics; las reglas viven aquí
 * para poder probarlas con Node.
 */

const COLORES = ['a', 'b'];

/**
 * Marcos de diez: `capacidad` casillas (10 o 20) que se llenan con fichas de dos colores.
 * Una casilla está 'vacia', es ficha 'a' (azul), ficha 'b' (naranja) o 'tachada' (ficha quitada en una resta).
 */
export class EstadoMarcos {
    constructor({ capacidad = 10, llenas = 0 } = {}) {
        if (!Number.isInteger(capacidad) || capacidad < 1) throw new Error('capacidad inválida');
        if (!Number.isInteger(llenas) || llenas < 0 || llenas > capacidad) throw new Error('llenas inválido');
        this.capacidad = capacidad;
        this.casillas = Array.from({ length: capacidad }, (_, i) => (i < llenas ? 'a' : 'vacia'));
    }

    /** Pone una ficha del color dado en la primera casilla vacía. @returns {boolean} false si ya no cabe */
    poner(color) {
        if (!COLORES.includes(color)) throw new Error(`color inválido: ${color}`);
        const i = this.casillas.indexOf('vacia');
        if (i === -1) return false;
        this.casillas[i] = color;
        return true;
    }

    /** Retira la última ficha puesta (azul o naranja). @returns {boolean} false si no hay */
    quitarUltima() {
        for (let i = this.capacidad - 1; i >= 0; i--) {
            if (this.casillas[i] === 'a' || this.casillas[i] === 'b') { this.casillas[i] = 'vacia'; return true; }
        }
        return false;
    }

    /** Tacha una ficha (quitarla en una resta) o la destacha. @returns {boolean} false si la casilla no tiene ficha */
    alternarTachado(i) {
        if (!Number.isInteger(i) || i < 0 || i >= this.capacidad) return false;
        const c = this.casillas[i];
        if (c === 'tachada') { this.casillas[i] = 'a'; return true; }
        if (c === 'a' || c === 'b') { this.casillas[i] = 'tachada'; return true; }
        return false;
    }

    reiniciar(llenas = 0) {
        this.casillas = this.casillas.map((_, i) => (i < llenas ? 'a' : 'vacia'));
    }

    conteo() {
        const cuenta = (valor) => this.casillas.filter((c) => c === valor).length;
        const a = cuenta('a');
        const b = cuenta('b');
        return { a, b, tachadas: cuenta('tachada'), vacias: cuenta('vacia'), fichas: a + b };
    }
}

/**
 * Recta de saltos: se empieza en `desde` y el niño avanza o retrocede con saltos de los tamaños permitidos.
 * La posición nunca sale de [0, maximo]; un salto que se saldría se rechaza (no se «recorta» en silencio).
 */
export class EstadoRecta {
    constructor({ desde, saltos, maximo, limiteSaltos = 40 }) {
        if (!Number.isInteger(desde) || desde < 0) throw new Error('desde inválido');
        if (!Array.isArray(saltos) || saltos.length === 0 || !saltos.every((s) => Number.isInteger(s) && s > 0)) throw new Error('saltos inválidos');
        if (!Number.isInteger(maximo) || maximo < desde) throw new Error('maximo inválido');
        this.desde = desde;
        this.saltos = [...saltos];
        this.maximo = maximo;
        this.limiteSaltos = limiteSaltos;
        this.historial = []; // [{ paso: +10 | -1, de, a }]
    }

    get posicion() {
        return this.historial.length ? this.historial[this.historial.length - 1].a : this.desde;
    }

    /** @param {number} tamano uno de `saltos` @param {1|-1} direccion @returns {boolean} si el salto se hizo */
    saltar(tamano, direccion = 1) {
        if (!this.saltos.includes(tamano) || (direccion !== 1 && direccion !== -1)) return false;
        if (this.historial.length >= this.limiteSaltos) return false;
        const de = this.posicion;
        const a = de + direccion * tamano;
        if (a < 0 || a > this.maximo) return false;
        this.historial.push({ paso: direccion * tamano, de, a });
        return true;
    }

    deshacer() {
        return this.historial.pop() !== undefined;
    }

    reiniciar() {
        this.historial = [];
    }
}
