import { h } from '../../ui/dom.js';
import { iconoMusica } from '../../ui/componentes.js';

/** Botón de música (solo existe si la maestra la permitió en este equipo; el niño la enciende o apaga). */
export function botonMusica(portal) {
    const activa = portal.musicaActiva();
    const boton = h('button', {
        class: 'boton boton--icono boton-musica', type: 'button', 'aria-label': 'Música', 'aria-pressed': String(activa),
        onClick: () => { const nuevo = portal.alternarMusica(); boton.setAttribute('aria-pressed', String(nuevo)); boton.replaceChildren(iconoMusica(nuevo)); }
    }, iconoMusica(activa));
    return boton;
}
