import { h } from '../../ui/dom.js';
import { avatar } from '../../ui/avatares.js';
import { estrellas, iconoArea } from '../../ui/componentes.js';
import { NOMBRES_AREA } from '../config.js';
import { textoGrado } from '../formato.js';

function rangoGrados(grados) {
    const ordenados = [...grados].sort((a, b) => a - b);
    return ordenados.length === 1 ? textoGrado(ordenados[0])
        : `${ordenados[0]}.º a ${ordenados[ordenados.length - 1]}.º grado`;
}

function tarjetaJuego({ meta, estado }, portal) {
    const idTitulo = `juego-${meta.id}`;
    return h('li', {},
        h('article', { class: `tarjeta-juego area-${meta.area}`, 'aria-labelledby': idTitulo },
            h('div', { class: 'tarjeta-juego__cabecera' }, iconoArea(meta.area), h('span', {}, NOMBRES_AREA[meta.area])),
            h('div', { class: 'tarjeta-juego__cuerpo' },
                h('h3', { id: idTitulo }, meta.nombre),
                h('p', {}, meta.descripcion),
                h('p', { class: 'tarjeta-juego__grados' }, rangoGrados(meta.grados)),
                h('div', { class: 'tarjeta-juego__pie' },
                    estado.partidas > 0
                        ? h('span', { class: 'tarjeta-juego__mejor' }, estrellas(estado.mejorEstrellas), h('span', { class: 'oculto-visual' }, 'Tu mejor resultado'))
                        : h('span', { class: 'tarjeta-juego__nuevo' }, '¡Nuevo!'),
                    h('button', {
                        class: 'boton boton--primario', type: 'button', onClick: () => portal.iniciarJuego(meta.id),
                        'aria-label': `Jugar ${meta.nombre}`
                    }, 'Jugar')))));
}

export function pantallaInicio({ perfil, estrellas: total, juegos, verTodos, totalJuegos, avisos }, portal) {
    return h('section', { class: 'pantalla' },
        avisos.map((texto) => h('p', { class: 'banner', role: 'status' }, texto)),
        h('div', { class: 'saludo' },
            avatar(perfil.avatar, 'avatar avatar--grande'),
            h('div', {},
                h('h1', { tabindex: '-1', 'data-foco': true }, `¡Hola, ${perfil.apodo}!`),
                h('p', { class: 'saludo__datos' },
                    h('span', { class: 'chip' }, textoGrado(perfil.grado)),
                    h('span', { class: 'chip chip--estrellas' }, estrellas(total > 0 ? 1 : 0, { max: 1 }), `${total} ${total === 1 ? 'estrella' : 'estrellas'}`))),
            h('button', { class: 'boton boton--secundario saludo__cambiar', type: 'button', onClick: () => portal.cerrarSesion() }, 'Cambiar de jugador')),
        h('h2', {}, verTodos ? 'Todos los juegos' : `Juegos para ${textoGrado(perfil.grado)}`),
        juegos.length > 0
            ? h('ul', { class: 'rejilla-juegos' }, juegos.map((j) => tarjetaJuego(j, portal)))
            : h('p', { class: 'vacio' }, 'Todavía no hay juegos para tu grado. ¡Pronto habrá más!'),
        totalJuegos > 0 && h('div', { class: 'acciones acciones--centro' },
            h('button', { class: 'boton boton--fantasma', type: 'button', onClick: () => portal.alternarVerTodos() },
                verTodos ? 'Ver solo los de mi grado' : `Ver todos los juegos (${totalJuegos})`)),
        h('p', { class: 'pie-maestro' },
            h('button', { class: 'enlace', type: 'button', onClick: () => portal.pedirModoMaestro() }, 'Modo maestro')));
}
