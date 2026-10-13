/**
 * Pegamento entre un juego de preguntas y las lecciones (ver lecciones/ y ui/leccion.js).
 * Cada juego solo añade un botón «Ver cómo se hace», lo muestra tras equivocarse y presenta la lección de
 * introducción de cada habilidad nueva; el portal se encarga de pausar el juego y de mostrar la lección.
 */
import { h } from './dom.js';

/** Botón «Ver cómo se hace» (oculto hasta que el niño se equivoca en la pregunta actual). */
export function crearBotonEnsenar(alClic) {
    return h('button', { class: 'boton boton--secundario boton--chico boton-ensenar', type: 'button', hidden: true, onClick: alClic }, 'Ver cómo se hace');
}

/** Abre la lección «ejemplo resuelto» de la habilidad de la pregunta actual. */
export function pedirLeccion(juego) {
    const contexto = juego.contexto;
    if (juego.estado !== 'jugando' || !contexto || typeof contexto.ensenar !== 'function' || !juego.partida.pregunta) return;
    contexto.ensenar(juego.partida.leccionPara(), { habilidad: juego.partida.pregunta.habilidad });
}

/**
 * Primera vez que aparece una habilidad: lección de introducción (omitible). No se muestra en la misión de inicio:
 * ahí se MIDE lo que el niño sabe, no se le enseña.
 */
export function presentarIntro(juego, habilidad) {
    const contexto = juego.contexto;
    if (!contexto || typeof contexto.presentarHabilidad !== 'function' || contexto.colocacion) return;
    contexto.presentarHabilidad(habilidad, () => juego.partida.leccionIntro(habilidad));
}
