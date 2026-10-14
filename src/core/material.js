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

/**
 * Bloques de valor posicional: una columna por valor (unidades, decenas, centenas, unidades de millar…, de derecha a
 * izquierda; el índice 0 son las unidades). Cada columna cuenta cuántos bloques tiene.
 *
 * Reglas del material (lo que se enseña):
 *  - `juntar(c)`: 10 bloques de una columna se CAMBIAN por 1 de la siguiente (10 unidades → 1 decena). Es la llevada.
 *  - `separar(c)`: 1 bloque de una columna se cambia por 10 de la anterior (1 decena → 10 unidades). Es el préstamo.
 *  - Cambiar no cambia el valor: `valor() + valorQuitado()` es una constante mientras solo se junta y se separa.
 *  - `quitar(c)` saca un bloque y lo cuenta como «quitado» (la resta); `retirar(c)` lo saca sin contarlo (corregir).
 */
export class EstadoBloques {
    constructor({ columnas, inicial = [], maximoPorColumna = 30, limiteHistorial = 80 }) {
        if (!Number.isInteger(columnas) || columnas < 1 || columnas > 6) throw new Error('columnas inválidas');
        if (inicial.length > columnas || !inicial.every((n) => Number.isInteger(n) && n >= 0 && n <= maximoPorColumna)) throw new Error('inicial inválido');
        this.columnas = columnas;
        this.maximoPorColumna = maximoPorColumna;
        this.limiteHistorial = limiteHistorial;
        this.inicial = Array.from({ length: columnas }, (_, i) => inicial[i] ?? 0);
        this.reiniciar();
    }

    reiniciar() {
        this.cuenta = [...this.inicial];
        this.quitadas = Array(this.columnas).fill(0);
        this.pasado = [];
    }

    guardar() {
        this.pasado.push({ cuenta: [...this.cuenta], quitadas: [...this.quitadas] });
        if (this.pasado.length > this.limiteHistorial) this.pasado.shift();
    }

    valido(col) {
        return Number.isInteger(col) && col >= 0 && col < this.columnas;
    }

    /** Pone un bloque en la columna. @returns {boolean} false si ya no caben */
    agregar(col) {
        if (!this.valido(col) || this.cuenta[col] >= this.maximoPorColumna) return false;
        this.guardar();
        this.cuenta[col]++;
        return true;
    }

    /** Saca un bloque (para corregir un error al construir). */
    retirar(col) {
        if (!this.valido(col) || this.cuenta[col] === 0) return false;
        this.guardar();
        this.cuenta[col]--;
        return true;
    }

    /** Saca un bloque como parte de una resta (queda contado como quitado). */
    quitar(col) {
        if (!this.valido(col) || this.cuenta[col] === 0) return false;
        this.guardar();
        this.cuenta[col]--;
        this.quitadas[col]++;
        return true;
    }

    /** 10 bloques de `col` → 1 de la columna siguiente. */
    juntar(col) {
        if (!this.valido(col) || col + 1 >= this.columnas || this.cuenta[col] < 10 || this.cuenta[col + 1] >= this.maximoPorColumna) return false;
        this.guardar();
        this.cuenta[col] -= 10;
        this.cuenta[col + 1]++;
        return true;
    }

    /** 1 bloque de `col` → 10 de la columna anterior. */
    separar(col) {
        if (!this.valido(col) || col < 1 || this.cuenta[col] < 1 || this.cuenta[col - 1] + 10 > this.maximoPorColumna) return false;
        this.guardar();
        this.cuenta[col]--;
        this.cuenta[col - 1] += 10;
        return true;
    }

    deshacer() {
        const antes = this.pasado.pop();
        if (!antes) return false;
        this.cuenta = antes.cuenta;
        this.quitadas = antes.quitadas;
        return true;
    }

    valor() {
        return this.cuenta.reduce((total, n, i) => total + n * 10 ** i, 0);
    }

    valorQuitado() {
        return this.quitadas.reduce((total, n, i) => total + n * 10 ** i, 0);
    }

    /** ¿Ninguna columna tiene 10 o más? (el número está escrito «bien») */
    get normalizado() {
        return this.cuenta.every((n) => n <= 9);
    }

    /** ¿Los bloques son exactamente estas cifras (de las unidades hacia arriba)? */
    coincideCon(cifrasObjetivo) {
        return this.cuenta.every((n, i) => n === (cifrasObjetivo[i] ?? 0));
    }

    /** ¿Lo quitado son exactamente estas cifras? */
    quitoExactamente(cifrasObjetivo) {
        return this.quitadas.every((n, i) => n === (cifrasObjetivo[i] ?? 0));
    }
}
