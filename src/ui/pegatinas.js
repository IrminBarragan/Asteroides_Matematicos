/**
 * Dibujo de las pegatinas del álbum (ver core/pegatinas.js): una insignia circular de color con un dibujo dentro.
 * SVG propio y constante del código: cero imágenes, cero derechos de autor.
 */
import { h, svgDesdeMarkup } from './dom.js';
import { describirPegatina, NUM_PEGATINAS } from '../core/pegatinas.js';

const GLIFO = {
    estrella: '<polygon points="50,20 58,41 80,43 63,57 68,79 50,67 32,79 37,57 20,43 42,41"/>',
    cohete: '<path d="M50 18 C62 30 64 50 60 66 L40 66 C36 50 38 30 50 18 Z"/><circle cx="50" cy="44" r="6" class="pegatina__ojo"/><path d="M40 66 L32 78 L44 72 Z"/><path d="M60 66 L68 78 L56 72 Z"/><path d="M45 70 L50 84 L55 70 Z" class="pegatina__llama"/>',
    planeta: '<circle cx="50" cy="50" r="17"/><ellipse cx="50" cy="52" rx="32" ry="9" class="pegatina__anillo" fill="none" stroke-width="5"/>',
    rayo: '<polygon points="56,16 34,54 48,54 42,84 68,42 53,42"/>',
    corazon: '<path d="M50 80 C20 58 22 30 38 28 C46 27 50 34 50 34 C50 34 54 27 62 28 C78 30 80 58 50 80 Z"/>',
    trofeo: '<path d="M34 24 H66 V42 C66 54 58 60 50 60 C42 60 34 54 34 42 Z"/><path d="M34 28 H24 C24 40 28 46 36 48" fill="none" class="pegatina__asa" stroke-width="4"/><path d="M66 28 H76 C76 40 72 46 64 48" fill="none" class="pegatina__asa" stroke-width="4"/><rect x="46" y="60" width="8" height="12"/><rect x="36" y="72" width="28" height="7" rx="2"/>'
};

/** SVG de una pegatina (id 0..29). */
export function dibujarPegatina(id) {
    const { glifo, color, nombre } = describirPegatina(id);
    const svg = svgDesdeMarkup(
        `<svg viewBox="0 0 100 100" class="pegatina" role="img" focusable="false" aria-label="${nombre}">
            <circle cx="50" cy="50" r="46" fill="${color.fondo}" stroke="#ffffff" stroke-width="4"/>
            <circle cx="50" cy="50" r="40" fill="none" stroke="${color.claro}" stroke-width="2" stroke-dasharray="3 4"/>
            <g fill="${color.claro}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" style="--claro:${color.claro}">${GLIFO[glifo]}</g>
        </svg>`
    );
    return svg;
}

/** Cuadrícula del álbum: las que tiene y los huecos de las que faltan. */
export function cuadriculaAlbum(poseidas) {
    const tiene = new Set(poseidas);
    const casillas = [];
    for (let id = 0; id < NUM_PEGATINAS; id++) {
        casillas.push(tiene.has(id)
            ? h('li', { class: 'album__casilla album__casilla--tiene' }, dibujarPegatina(id), h('span', { class: 'album__nombre' }, describirPegatina(id).nombre))
            : h('li', { class: 'album__casilla album__casilla--falta', 'aria-label': 'Pegatina por descubrir' }, h('span', { 'aria-hidden': 'true' }, '?')));
    }
    return h('ul', { class: 'album__rejilla' }, casillas);
}
