/**
 * Componentes reutilizables del portal y de los juegos.
 */
import { h, svgDesdeMarkup, vaciar } from './dom.js';
import { textoEstrellas } from '../portal/formato.js';

const PUNTOS_ESTRELLA = '12,1.8 15.1,8.6 22.4,9.3 16.9,14.2 18.5,21.4 12,17.7 5.5,21.4 7.1,14.2 1.6,9.3 8.9,8.6';

/** Estrellas (llenas/vacías) con texto accesible: "2 de 3 estrellas". */
export function estrellas(cantidad, { max = 3, grande = false } = {}) {
    const contenedor = h('span', {
        class: grande ? 'estrellas estrellas--grande' : 'estrellas',
        role: 'img',
        'aria-label': textoEstrellas(cantidad, max)
    });
    for (let i = 0; i < max; i++) {
        const llena = i < cantidad;
        const svg = svgDesdeMarkup(
            `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="${PUNTOS_ESTRELLA}"/></svg>`
        );
        svg.setAttribute('class', llena ? 'estrella estrella--llena' : 'estrella');
        svg.style.setProperty('--retardo', `${i * 0.25}s`);
        contenedor.append(svg);
    }
    return contenedor;
}

const ICONOS_AREA = {
    matematicas: '<path d="M12 5v14M5 12h14" stroke-width="3"/>',
    espanol: '<path d="M4 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z" stroke-width="2"/>',
    ciencias: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" stroke-width="2"/>',
    medicion: '<circle cx="12" cy="13" r="8" stroke-width="2"/><path d="M12 13V8M12 13l3 2M9 3h6" stroke-width="2"/>'
};

export function iconoArea(area) {
    return svgDesdeMarkup(
        `<svg viewBox="0 0 24 24" class="icono-area" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICONOS_AREA[area] || ICONOS_AREA.matematicas}</svg>`
    );
}

export function iconoSonido(activo) {
    const ondas = activo
        ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>'
        : '<path d="M16 9l5 6M21 9l-5 6"/>';
    return svgDesdeMarkup(
        `<svg viewBox="0 0 24 24" class="icono" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/>${ondas}</svg>`
    );
}

/** Ícono de música: una nota (con rayita cuando está apagada). */
export function iconoMusica(activo) {
    const marca = activo ? '' : '<path d="M4 4 L20 20" stroke-width="2.5"/>';
    return svgDesdeMarkup(
        `<svg viewBox="0 0 24 24" class="icono" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/>${marca}</svg>`
    );
}

/**
 * Diálogo modal accesible: enfoca el primer botón, Escape cancela, el foco vuelve a donde estaba.
 * @returns {Promise<boolean>} true si se confirmó
 */
export function confirmarModal(raiz, { titulo, mensaje, textoSi = 'Sí', textoNo = 'No', peligro = false }) {
    return new Promise((resolver) => {
        const previo = document.activeElement;
        const cerrar = (valor) => {
            document.removeEventListener('keydown', alTeclear, true);
            fondo.remove();
            if (previo && typeof previo.focus === 'function') previo.focus();
            resolver(valor);
        };
        const alTeclear = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); cerrar(false); }
            if (e.key === 'Tab') { // mantiene el foco dentro del diálogo
                const botones = [...fondo.querySelectorAll('button')];
                const i = botones.indexOf(document.activeElement);
                e.preventDefault();
                botones[(i + (e.shiftKey ? botones.length - 1 : 1)) % botones.length].focus();
            }
        };
        const botonNo = h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => cerrar(false) }, textoNo);
        const botonSi = h('button', {
            class: peligro ? 'boton boton--peligro' : 'boton boton--primario', type: 'button', onClick: () => cerrar(true)
        }, textoSi);
        const fondo = h('div', { class: 'modal-fondo' },
            h('div', { class: 'modal', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-titulo', 'aria-describedby': 'modal-mensaje' },
                h('h2', { id: 'modal-titulo' }, titulo),
                h('p', { id: 'modal-mensaje' }, mensaje),
                h('div', { class: 'modal__acciones' }, botonNo, botonSi)));
        raiz.append(fondo);
        document.addEventListener('keydown', alTeclear, true);
        botonNo.focus(); // el botón seguro (cancelar) recibe el foco primero
    });
}

/** Mensaje breve en una región aria-live (lo anuncian los lectores de pantalla). */
export function mostrarAviso(region, texto, tipo = 'info') {
    vaciar(region);
    const aviso = h('p', { class: `aviso aviso--${tipo}` }, texto);
    region.append(aviso);
    setTimeout(() => aviso.remove(), 4500);
}
