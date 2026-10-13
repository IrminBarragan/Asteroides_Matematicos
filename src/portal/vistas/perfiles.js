import { h } from '../../ui/dom.js';
import { avatar, IDS_AVATARES, NOMBRES_AVATAR } from '../../ui/avatares.js';
import { textoGrado } from '../formato.js';

/** Pantalla "¿Quién juega?": el equipo lo comparten varios niños. */
export function pantallaPerfiles({ perfiles }, portal) {
    return h('section', { class: 'pantalla' },
        h('h1', { tabindex: '-1', 'data-foco': true }, '¿Quién juega?'),
        h('ul', { class: 'lista-perfiles' },
            perfiles.map((p) => h('li', {},
                h('button', {
                    class: 'tarjeta-perfil', type: 'button', onClick: () => portal.elegirPerfil(p.id),
                    'aria-label': `${p.apodo}, ${textoGrado(p.grado)}, ${NOMBRES_AVATAR[p.avatar] || ''}`
                },
                avatar(p.avatar, 'avatar avatar--grande'),
                h('span', { class: 'tarjeta-perfil__nombre' }, p.apodo),
                h('span', { class: 'tarjeta-perfil__grado' }, textoGrado(p.grado)))))),
        h('div', { class: 'acciones acciones--centro' },
            h('button', { class: 'boton boton--primario', type: 'button', onClick: () => portal.irACrearPerfil() }, '＋ Nuevo jugador')),
        h('p', { class: 'pie-maestro' },
            h('button', { class: 'enlace', type: 'button', onClick: () => portal.pedirModoMaestro() }, 'Modo maestro')));
}

/** Formulario de nuevo jugador: apodo, avatar y grado. */
export function pantallaCrear({ puedeCancelar }, portal) {
    const error = h('p', { class: 'error-formulario', role: 'alert' });
    const campoApodo = h('input', {
        id: 'apodo', class: 'campo', type: 'text', maxlength: '16', autocomplete: 'off',
        autocapitalize: 'words', spellcheck: 'false', 'aria-describedby': 'ayuda-apodo'
    });

    const opcionAvatar = (id) => h('label', { class: 'opcion' },
        h('input', { type: 'radio', name: 'avatar', value: id, class: 'oculto-visual' }),
        h('span', { class: 'opcion__caja' }, avatar(id, 'avatar avatar--media'), h('span', {}, NOMBRES_AVATAR[id])));

    const opcionGrado = (g) => h('label', { class: 'opcion opcion--grado' },
        h('input', { type: 'radio', name: 'grado', value: g, class: 'oculto-visual' }),
        h('span', { class: 'opcion__caja' }, h('span', { class: 'opcion__numero' }, `${g}.º`)));

    const formulario = h('form', {
        class: 'formulario', novalidate: true,
        onSubmit: (e) => {
            e.preventDefault();
            const datos = new FormData(formulario);
            const apodo = campoApodo.value.trim();
            const avatarElegido = datos.get('avatar');
            const grado = Number(datos.get('grado'));
            if (!apodo) return mostrarError('Escribe tu nombre o apodo.', campoApodo);
            if (!avatarElegido) return mostrarError('Elige tu amigo.');
            if (!grado) return mostrarError('Elige tu grado.');
            const resultado = portal.crearPerfil({ apodo, avatar: avatarElegido, grado });
            if (!resultado.ok) mostrarError(resultado.error, campoApodo);
        }
    },
    h('div', { class: 'grupo' },
        h('label', { for: 'apodo', class: 'grupo__titulo' }, '¿Cómo te llamas?'),
        campoApodo,
        h('p', { id: 'ayuda-apodo', class: 'ayuda' }, 'Usa solo tu nombre o un apodo, sin apellidos.')),
    h('fieldset', { class: 'grupo' },
        h('legend', { class: 'grupo__titulo' }, 'Elige a tu amigo'),
        h('div', { class: 'opciones' }, IDS_AVATARES.map(opcionAvatar))),
    h('fieldset', { class: 'grupo' },
        h('legend', { class: 'grupo__titulo' }, '¿En qué grado estás?'),
        h('div', { class: 'opciones opciones--fila' }, [1, 2, 3, 4, 5, 6].map(opcionGrado))),
    error,
    h('div', { class: 'acciones acciones--centro' },
        puedeCancelar && h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => portal.irAPerfiles() }, 'Volver'),
        h('button', { class: 'boton boton--primario', type: 'submit' }, '¡Listo!')));

    function mostrarError(texto, enfocar) {
        error.textContent = texto;
        if (enfocar) enfocar.focus();
    }

    return h('section', { class: 'pantalla pantalla--angosta' },
        h('h1', { tabindex: '-1', 'data-foco': true }, '¡Bienvenido!'),
        formulario);
}
