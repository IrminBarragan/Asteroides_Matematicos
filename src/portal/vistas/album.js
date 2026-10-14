import { h } from '../../ui/dom.js';
import { avatar } from '../../ui/avatares.js';
import { cuadriculaAlbum } from '../../ui/pegatinas.js';
import { NUM_PEGATINAS } from '../../core/pegatinas.js';

/** Álbum de pegatinas del niño: las que ganó y los huecos de las que faltan. Solo suma: nunca se pierde nada. */
export function pantallaAlbum({ perfil, poseidas }, portal) {
    const completo = poseidas.length >= NUM_PEGATINAS;
    return h('section', { class: 'pantalla album' },
        h('div', { class: 'album__cabecera' },
            avatar(perfil.avatar, 'avatar avatar--media'),
            h('div', {},
                h('h1', { tabindex: '-1', 'data-foco': true }, 'Mi álbum'),
                h('p', { class: 'album__cuenta' }, completo ? '¡Completaste el álbum!' : `${poseidas.length} de ${NUM_PEGATINAS} pegatinas`))),
        h('p', { class: 'album__ayuda' }, 'Ganas una pegatina cada vez que terminas una partida, y otra más si consigues las 3 estrellas.'),
        cuadriculaAlbum(poseidas),
        h('div', { class: 'acciones acciones--centro' },
            h('button', { class: 'boton boton--primario', type: 'button', onClick: () => portal.irAInicio() }, 'Volver a los juegos')));
}
