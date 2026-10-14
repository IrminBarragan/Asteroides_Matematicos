/**
 * Confeti: piezas de colores que caen y giran (solo CSS: `transform` y `opacity`, baratas para cualquier PC).
 * `generarConfeti` es pura (se prueba con números); `lanzarConfeti` las dibuja y se limpia sola.
 */
import { h } from './dom.js';

export const COLORES_CONFETI = ['#fbbf24', '#60a5fa', '#f472b6', '#34d399', '#a78bfa', '#fb923c'];
export const DURACION_MAX_MS = 2800; // retardo máximo (0.4 s) + duración máxima (2.4 s)

/**
 * @param {number} cantidad
 * @param {Function} aleatorio  () => [0,1)
 * @returns {{x:number, dx:number, giro:number, color:string, retardo:number, duracion:number, ancho:number, alto:number}[]}
 *   x en % del ancho; dx en px (deriva lateral); giro en grados; retardo y duracion en segundos.
 */
export function generarConfeti(cantidad, aleatorio = Math.random) {
    return Array.from({ length: cantidad }, () => {
        const ancho = 6 + Math.floor(aleatorio() * 7);
        return {
            x: Math.round(aleatorio() * 100),
            dx: Math.round((aleatorio() - 0.5) * 160),
            giro: Math.round(360 + aleatorio() * 720),
            color: COLORES_CONFETI[Math.floor(aleatorio() * COLORES_CONFETI.length)],
            retardo: Math.round(aleatorio() * 4) / 10,           // 0 .. 0.4 s
            duracion: (16 + Math.round(aleatorio() * 8)) / 10,    // 1.6 .. 2.4 s (en décimas enteras: sin errores de redondeo)
            ancho,
            alto: Math.round(ancho * (0.5 + aleatorio() * 0.8))
        };
    });
}

/** Dibuja el confeti en una capa que no bloquea los clics y la quita al terminar. */
export function lanzarConfeti(raiz, cantidad = 40, aleatorio = Math.random) {
    const piezas = generarConfeti(cantidad, aleatorio).map((p) => h('span', {
        class: 'confeti',
        style: `left:${p.x}%;width:${p.ancho}px;height:${p.alto}px;background:${p.color};--dx:${p.dx}px;--giro:${p.giro}deg;animation-delay:${p.retardo}s;animation-duration:${p.duracion}s`
    }));
    const capa = h('div', { class: 'capa-confeti', 'aria-hidden': 'true' }, piezas);
    raiz.append(capa);
    setTimeout(() => capa.remove(), DURACION_MAX_MS + 200);
    return capa;
}
