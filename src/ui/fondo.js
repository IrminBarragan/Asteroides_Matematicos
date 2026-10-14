/**
 * Fondo animado: formas translúcidas que suben despacio detrás de la pantalla (solo CSS: `transform` y `opacity`).
 * Su color depende del área del juego (`data-area` en la raíz); en el menú son de varios colores.
 */
import { h } from './dom.js';

/**
 * @returns {{x:number, tamano:number, duracion:number, retardo:number, deriva:number, forma:string}[]}
 *   x en % del ancho; tamano en px; duracion y retardo en segundos; deriva en px.
 */
export function generarFormas(cantidad, aleatorio = Math.random) {
    const FORMAS = ['circulo', 'rombo', 'estrella', 'circulo'];
    return Array.from({ length: cantidad }, (_, i) => ({
        x: Math.round(((i + aleatorio() * 0.8) / cantidad) * 100),   // repartidas por todo el ancho
        tamano: 22 + Math.floor(aleatorio() * 46),
        duracion: 16 + Math.floor(aleatorio() * 18),
        retardo: -Math.floor(aleatorio() * 30),                      // negativo: ya van a medio camino al cargar
        deriva: Math.round((aleatorio() - 0.5) * 120),
        forma: FORMAS[Math.floor(aleatorio() * FORMAS.length)]
    }));
}

export function crearFondo(cantidad = 12, aleatorio = Math.random) {
    return h('div', { class: 'fondo-animado', 'aria-hidden': 'true' }, generarFormas(cantidad, aleatorio).map((f) => h('span', {
        class: `forma forma--${f.forma}`,
        style: `left:${f.x}%;width:${f.tamano}px;height:${f.tamano}px;--deriva:${f.deriva}px;animation-duration:${f.duracion}s;animation-delay:${f.retardo}s`
    })));
}
