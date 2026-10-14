import { h } from '../../ui/dom.js';
import { botonMusica } from './controles.js';
import { estrellas, iconoSonido } from '../../ui/componentes.js';
import { dibujarPegatina } from '../../ui/pegatinas.js';
import { formatearTiempo, mensajeResultado } from '../formato.js';

/** Marco de la partida: barra con salir/pausa y el contenedor donde se monta el juego. */
export function pantallaJugando({ meta }, portal, ctx) {
    const contenedor = h('div', { class: 'zona-juego', id: 'zona-juego' });
    const botonSonido = h('button', {
        class: 'boton boton--icono', type: 'button', 'aria-label': 'Sonido', 'aria-pressed': String(portal.sonidoActivo()),
        onClick: () => { const activo = portal.alternarSonido(); botonSonido.setAttribute('aria-pressed', String(activo)); botonSonido.replaceChildren(iconoSonido(activo)); }
    }, iconoSonido(portal.sonidoActivo()));

    // Lectura en voz alta: solo si el navegador tiene síntesis de voz (si no, no se muestra nada)
    const controlesVoz = [];
    if (portal.vozDisponible()) {
        const botonAuto = h('button', {
            class: 'boton boton--secundario', type: 'button', 'aria-pressed': String(portal.lecturaAutomatica()),
            title: 'Lee cada pregunta nueva en voz alta',
            onClick: () => botonAuto.setAttribute('aria-pressed', String(portal.alternarLecturaAutomatica()))
        }, 'Lectura automática');
        controlesVoz.push(
            h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => portal.leerPantalla() }, 'Escuchar'),
            botonAuto);
    }

    const pausa = h('div', { class: 'pausa', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pausa-titulo' },
        h('div', { class: 'pausa__caja' },
            h('h2', { id: 'pausa-titulo' }, 'Juego en pausa'),
            h('div', { class: 'acciones acciones--centro' },
                h('button', { class: 'boton boton--primario', type: 'button', 'data-continuar': true, onClick: () => portal.reanudarJuego() }, 'Continuar'),
                h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => ctx.pedirSalida() }, 'Salir'))));

    const nodo = h('section', { class: 'partida' },
        h('div', { class: 'partida__barra' },
            h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => ctx.pedirSalida() }, '← Salir'),
            h('h1', { tabindex: '-1', 'data-foco': true, class: 'partida__titulo' }, meta.nombre),
            h('div', { class: 'partida__controles' },
                ...controlesVoz,
                portal.musicaPermitida() && botonMusica(portal),
                botonSonido,
                h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => portal.pausarJuego() }, 'Pausa'))),
        contenedor,
        pausa);
    return { nodo, contenedor, pausa };
}

export function pantallaResultados({ meta, resultado, esRecord, estrellasGanadas, estrellasTotales, colocacion, subioContenido, pegatinasNuevas = [] }, portal) {
    return h('section', { class: 'pantalla pantalla--angosta resultados' },
        h('h1', { tabindex: '-1', 'data-foco': true }, mensajeResultado(resultado.estrellas)),
        h('p', { class: 'resultados__juego' }, meta.nombre),
        estrellas(resultado.estrellas, { grande: true }),
        colocacion && h('p', { class: 'insignia' }, '¡Misión cumplida! Ya sé por dónde empezar.'),
        subioContenido && h('p', { class: 'insignia' }, '¡Pasas a retos nuevos!'),
        esRecord && !colocacion && h('p', { class: 'insignia' }, '¡Nuevo récord!'),
        estrellasGanadas > 0 && h('p', { class: 'resultados__ganadas' },
            `¡Ganaste ${estrellasGanadas} ${estrellasGanadas === 1 ? 'estrella nueva' : 'estrellas nuevas'}!`),
        h('dl', { class: 'datos' },
            h('div', {}, h('dt', {}, 'Aciertos'), h('dd', {}, String(resultado.aciertos))),
            h('div', {}, h('dt', {}, 'Por mejorar'), h('dd', {}, String(resultado.fallos))),
            h('div', {}, h('dt', {}, 'Tiempo'), h('dd', {}, formatearTiempo(resultado.tiempoMs))),
            h('div', {}, h('dt', {}, 'Puntos'), h('dd', {}, String(resultado.puntaje)))),
        h('p', { class: 'resultados__total' }, `Tienes ${estrellasTotales} ${estrellasTotales === 1 ? 'estrella' : 'estrellas'} en total`),
        pegatinasNuevas.length > 0 && h('div', { class: 'resultados__pegatinas' },
            h('p', { class: 'resultados__ganadas' }, pegatinasNuevas.length === 1 ? '¡Ganaste una pegatina!' : `¡Ganaste ${pegatinasNuevas.length} pegatinas!`),
            h('div', { class: 'resultados__pegatinas-fila' }, pegatinasNuevas.map((id) => dibujarPegatina(id))),
            h('button', { class: 'boton boton--fantasma boton--chico', type: 'button', onClick: () => portal.irAAlbum() }, 'Ver mi álbum')),
        h('div', { class: 'acciones acciones--centro' },
            h('button', { class: 'boton boton--primario', type: 'button', onClick: () => portal.jugarOtraVez() }, 'Jugar otra vez'),
            h('button', { class: 'boton boton--secundario', type: 'button', onClick: () => portal.irAInicio() }, 'Más juegos')));
}

export function pantallaError({ mensaje }, portal) {
    return h('section', { class: 'pantalla pantalla--angosta' },
        h('h1', { tabindex: '-1', 'data-foco': true }, 'Ups…'),
        h('p', { role: 'alert' }, mensaje),
        h('div', { class: 'acciones acciones--centro' },
            h('button', { class: 'boton boton--primario', type: 'button', onClick: () => portal.irAInicio() }, 'Volver al inicio')));
}
