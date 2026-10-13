/**
 * Pantalla de una LECCIÓN (ver lecciones/leccion.js): diálogo accesible paso a paso, con material visual, «hazlo tú»
 * y lectura en voz alta opcional.
 *
 * Reglas de diseño:
 *  - El niño NUNCA queda atrapado: «Cerrar» y Escape siempre funcionan.
 *  - Un «hazlo tú» no deja avanzar hasta resolverlo, pero equivocarse solo da una pista (como en el resto del portal).
 *  - Las lecciones de introducción son omitibles desde el primer paso.
 */
import { h, vaciar } from './dom.js';
import { dibujarVisual } from './visualesLeccion.js';

let contador = 0;

/** «¡Eso es! 40 + 20 = 60.»: confirma el resultado con la explicación del paso. */
const mensajeAcierto = (hazlo) => `¡Eso es! ${hazlo.explicacion ?? hazlo.enunciado.replace('?', String(hazlo.respuesta))}`;

/**
 * @param {HTMLElement} raiz  donde se monta el diálogo
 * @param {Object} leccion    ver lecciones/leccion.js (ya validada)
 * @param {{omitible?:boolean, leer?:(texto:string)=>void}} [opciones]
 * @returns {Promise<'terminada'|'cerrada'>}
 */
export function mostrarLeccion(raiz, leccion, { omitible = false, leer = null } = {}) {
    return new Promise((resolver) => {
        const id = `leccion-${++contador}`;
        const previo = document.activeElement;
        let i = 0;
        const resueltos = new Set();

        const cerrar = (resultado) => {
            document.removeEventListener('keydown', alTeclear, true);
            fondo.remove();
            if (previo && typeof previo.focus === 'function') previo.focus();
            resolver(resultado);
        };
        const alTeclear = (e) => {
            if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cerrar('cerrada'); return; }
            if (e.key === 'Tab') { // mantiene el foco dentro del diálogo
                const foco = [...fondo.querySelectorAll('button:not([disabled]), [tabindex="0"]')];
                if (foco.length === 0) return;
                const k = foco.indexOf(document.activeElement);
                e.preventDefault();
                foco[(k + (e.shiftKey ? foco.length - 1 : 1)) % foco.length].focus();
            }
        };

        const titulo = h('h2', { id: `${id}-titulo`, class: 'leccion__titulo' }, leccion.titulo);
        const contadorPaso = h('p', { class: 'leccion__contador', 'aria-live': 'polite' });
        const puntos = h('div', { class: 'leccion__puntos', 'aria-hidden': 'true' });
        const cuerpo = h('div', { class: 'leccion__cuerpo' });
        const atras = h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => ir(i - 1) }, '← Atrás');
        const adelante = h('button', { class: 'boton boton--primario', type: 'button', onClick: () => (i === leccion.pasos.length - 1 ? cerrar('terminada') : ir(i + 1)) });
        const botonCerrar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => cerrar('cerrada') }, omitible ? 'Saltar' : 'Cerrar');
        const fondo = h('div', { class: 'modal-fondo modal-fondo--leccion' },
            h('div', { class: 'modal leccion', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${id}-titulo` },
                h('header', { class: 'leccion__cabecera' }, titulo, botonCerrar),
                contadorPaso, puntos, cuerpo,
                h('div', { class: 'modal__acciones' }, atras, adelante)));

        function ir(nuevo) {
            i = Math.min(Math.max(nuevo, 0), leccion.pasos.length - 1);
            dibujar();
        }

        function dibujar() {
            const paso = leccion.pasos[i];
            const ultimo = i === leccion.pasos.length - 1;
            contadorPaso.textContent = `Paso ${i + 1} de ${leccion.pasos.length}`;
            vaciar(puntos);
            leccion.pasos.forEach((_, k) => puntos.append(h('span', { class: `leccion__punto${k === i ? ' leccion__punto--actual' : k < i ? ' leccion__punto--hecho' : ''}` })));
            vaciar(cuerpo);
            const visual = paso.visual ? dibujarVisual(paso.visual) : null;
            if (visual) cuerpo.append(h('div', { class: 'leccion__visual' }, visual));
            const texto = h('p', { class: 'leccion__texto', tabindex: '-1' }, paso.texto);
            cuerpo.append(texto);
            if (leer) cuerpo.append(h('button', { class: 'boton boton--secundario boton--chico', type: 'button', onClick: () => leer(`${paso.texto}${paso.hazlo ? ` ${paso.hazlo.enunciado.replace('?', '')}` : ''}`) }, 'Escuchar'));

            let bloqueado = false;
            if (paso.hazlo) {
                const hecho = resueltos.has(i);
                bloqueado = !hecho;
                const mensaje = h('p', { class: `leccion__mensaje${hecho ? ' leccion__mensaje--bien' : ''}`, 'aria-live': 'polite' }, hecho ? mensajeAcierto(paso.hazlo) : '');
                const botones = paso.hazlo.opciones.map((o) => h('button', {
                    class: 'leccion__opcion', type: 'button', onClick: (e) => {
                        if (String(o) === String(paso.hazlo.respuesta)) {
                            resueltos.add(i);
                            e.currentTarget.classList.add('leccion__opcion--correcta');
                            botones.forEach((b) => b.setAttribute('aria-disabled', 'true'));
                            mensaje.textContent = mensajeAcierto(paso.hazlo);
                            mensaje.classList.add('leccion__mensaje--bien');
                            adelante.disabled = false;
                        } else {
                            e.currentTarget.classList.add('leccion__opcion--incorrecta');
                            e.currentTarget.setAttribute('aria-disabled', 'true');
                            mensaje.textContent = `Casi. Pista: ${paso.hazlo.pista}`;
                        }
                    }
                }, String(o)));
                if (hecho) botones.forEach((b, k) => { b.setAttribute('aria-disabled', 'true'); if (String(paso.hazlo.opciones[k]) === String(paso.hazlo.respuesta)) b.classList.add('leccion__opcion--correcta'); });
                cuerpo.append(h('div', { class: 'leccion__hazlo' }, h('p', { class: 'leccion__hazlo-titulo' }, 'Ahora tú:'), h('p', { class: 'leccion__hazlo-enunciado' }, paso.hazlo.enunciado), h('div', { class: 'leccion__opciones' }, botones), mensaje));
            }
            atras.hidden = i === 0;
            adelante.disabled = bloqueado;
            adelante.textContent = ultimo ? '¡Entendido!' : 'Siguiente →';
            texto.focus({ preventScroll: true });
        }

        raiz.append(fondo);
        document.addEventListener('keydown', alTeclear, true);
        dibujar();
    });
}
