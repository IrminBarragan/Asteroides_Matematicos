import { h } from '../../ui/dom.js';
import { avatar } from '../../ui/avatares.js';
import { textoGrado } from '../formato.js';

export function pantallaPin(_, portal) {
    const error = h('p', { class: 'error-formulario', role: 'alert' });
    const campo = h('input', {
        id: 'pin', class: 'campo campo--pin', type: 'password', inputmode: 'numeric', autocomplete: 'off',
        maxlength: '12', 'aria-describedby': 'ayuda-pin'
    });
    const formulario = h('form', {
        class: 'formulario', novalidate: true,
        onSubmit: (e) => {
            e.preventDefault();
            if (!portal.entrarModoMaestro(campo.value)) {
                error.textContent = 'PIN incorrecto.';
                campo.value = '';
                campo.focus();
            }
        }
    },
    h('div', { class: 'grupo' },
        h('label', { for: 'pin', class: 'grupo__titulo' }, 'PIN del maestro'),
        campo,
        h('p', { id: 'ayuda-pin', class: 'ayuda' }, 'Esta zona es para adultos: muestra el progreso y permite borrar datos.')),
    error,
    h('div', { class: 'acciones acciones--centro' },
        h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => portal.salirDeModoMaestro() }, 'Volver'),
        h('button', { class: 'boton boton--primario', type: 'submit' }, 'Entrar')));
    return h('section', { class: 'pantalla pantalla--angosta' },
        h('h1', { tabindex: '-1', 'data-foco': true }, 'Modo maestro'), formulario);
}

const porcentaje = (valor) => (valor === null ? '—' : `${Math.round(valor * 100)} %`);

function tabla(titulo, encabezados, filas) {
    return h('div', { class: 'tabla-envoltura', role: 'region', 'aria-label': titulo, tabindex: '0' },
        h('table', { class: 'tabla' },
            h('caption', {}, titulo),
            h('thead', {}, h('tr', {}, encabezados.map((t) => h('th', { scope: 'col' }, t)))),
            h('tbody', {}, filas.map((fila) => h('tr', {}, fila.map((c) => h('td', {}, String(c))))))));
}

export function pantallaMaestro({ perfiles }, portal, ctx) {
    const tarjetas = perfiles.map((p) => h('article', { class: 'perfil-maestro' },
        h('header', { class: 'perfil-maestro__cabecera' },
            avatar(p.avatar, 'avatar avatar--media'),
            h('div', {}, h('h3', {}, p.apodo), h('p', {}, `${textoGrado(p.grado)} · ${p.estrellas} ${p.estrellas === 1 ? 'estrella' : 'estrellas'}`)),
            h('div', { class: 'perfil-maestro__acciones' },
                h('button', {
                    class: 'boton boton--secundario boton--chico', type: 'button',
                    'aria-label': `Repetir la misión de inicio de ${p.apodo}`, title: 'El sistema vuelve a buscar por dónde debe empezar (conserva sus estrellas)',
                    onClick: () => portal.repetirMision(p.id)
                }, 'Repetir misión'),
                h('button', {
                    class: 'boton boton--peligro boton--chico', type: 'button',
                    'aria-label': `Eliminar a ${p.apodo}`, onClick: () => ctx.confirmarEliminar(p)
                }, 'Eliminar'))),
        p.juegos.length > 0
            ? tabla(`Juegos de ${p.apodo}`, ['Juego', 'Partidas', 'Mejor puntaje', 'Mejores estrellas', 'Contenido que le toca'],
                p.juegos.map((j) => [j.nombre, j.partidas, j.mejorPuntaje, j.mejorEstrellas, j.contenido === null ? '—' : `${j.contenido}.º`]))
            : h('p', { class: 'vacio' }, 'Aún no ha jugado.'),
        p.habilidades.length > 0 && tabla(`Habilidades de ${p.apodo}`, ['Juego', 'Habilidad', 'Nivel', 'Intentos', 'Aciertos', 'Dominio reciente'],
            p.habilidades.map((f) => [f.juego, f.habilidad, f.nivel, f.intentos, f.aciertos, porcentaje(f.dominioReciente)]))));

    return h('section', { class: 'pantalla' },
        h('h1', { tabindex: '-1', 'data-foco': true }, 'Modo maestro'),
        h('div', { class: 'acciones' },
            h('button', { class: 'boton boton--primario', type: 'button', onClick: () => ctx.descargar('progreso.csv', portal.csvProgreso()) }, 'Descargar progreso (CSV)'),
            h('button', { class: 'boton boton--primario', type: 'button', onClick: () => ctx.descargar('habilidades.csv', portal.csvHabilidades()) }, 'Descargar habilidades (CSV)'),
            h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => portal.salirDeModoMaestro() }, 'Salir')),
        perfiles.length > 0 ? tarjetas : h('p', { class: 'vacio' }, 'No hay jugadores en este equipo.'),
        h('div', { class: 'zona-peligro' },
            h('h2', {}, 'Zona de cuidado'),
            h('p', {}, 'Borra a todos los jugadores y todo su progreso de este equipo. No se puede deshacer.'),
            h('button', { class: 'boton boton--peligro', type: 'button', onClick: () => ctx.confirmarReiniciar() }, 'Borrar todo el progreso')));
}
