/**
 * Vista del portal: capa delgada de DOM. Dibuja la pantalla que el controlador (Portal) le pide
 * y le reenvía las acciones del niño. No contiene reglas del negocio.
 */
import { h, vaciar } from '../ui/dom.js';
import { confirmarModal, mostrarAviso, iconoSonido } from '../ui/componentes.js';
import { NOMBRE_PORTAL } from './config.js';
import { pantallaPerfiles, pantallaCrear } from './vistas/perfiles.js';
import { pantallaInicio } from './vistas/inicio.js';
import { pantallaJugando, pantallaResultados, pantallaError } from './vistas/partida.js';
import { pantallaPin, pantallaMaestro } from './vistas/maestro.js';

export class VistaPortal {
    /** @param {HTMLElement} raiz  elemento donde vive toda la aplicación */
    constructor(raiz) {
        this.raiz = raiz;
        this.portal = null;
        this.contenedor = null;
        this.capaPausa = null;

        this.cabecera = h('header', { class: 'cabecera' });
        this.principal = h('main', { class: 'principal', id: 'principal' });
        this.avisos = h('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' });
        vaciar(raiz);
        raiz.append(this.cabecera, this.principal, this.avisos);
    }

    conectar(portal) {
        this.portal = portal;
    }

    // ---------- Interfaz que usa el controlador ----------

    mostrar(nombre, datos) {
        const portal = this.portal;
        const ctx = this.contexto();
        this.raiz.dataset.pantalla = nombre;
        this.contenedor = null;
        this.capaPausa = null;
        vaciar(this.principal);

        let nodo;
        switch (nombre) {
            case 'perfiles': nodo = pantallaPerfiles(datos, portal); break;
            case 'crear': nodo = pantallaCrear(datos, portal); break;
            case 'inicio': nodo = pantallaInicio(datos, portal); break;
            case 'jugando': {
                const partida = pantallaJugando(datos, portal, ctx);
                nodo = partida.nodo;
                this.contenedor = partida.contenedor;
                this.capaPausa = partida.pausa;
                break;
            }
            case 'resultados': nodo = pantallaResultados(datos, portal); break;
            case 'maestro-pin': nodo = pantallaPin(datos, portal); break;
            case 'maestro': nodo = pantallaMaestro(datos, portal, ctx); break;
            default: nodo = pantallaError({ mensaje: datos && datos.mensaje ? datos.mensaje : 'Algo salió mal.' }, portal);
        }
        this.principal.append(nodo);
        this.dibujarCabecera(nombre);
        this.enfocarTitulo();
    }

    contenedorJuego() {
        return this.contenedor;
    }

    mostrarPausa(activa) {
        if (!this.capaPausa) return;
        this.capaPausa.hidden = !activa;
        if (activa) {
            const continuar = this.capaPausa.querySelector('[data-continuar]');
            if (continuar) continuar.focus();
        }
    }

    aviso(texto, tipo = 'info') {
        mostrarAviso(this.avisos, texto, tipo);
    }

    // ---------- Apoyos internos ----------

    dibujarCabecera(pantalla) {
        vaciar(this.cabecera);
        if (pantalla === 'jugando') return; // la partida tiene su propia barra: más espacio para el juego
        const portal = this.portal;
        const boton = h('button', {
            class: 'boton boton--icono', type: 'button', 'aria-label': 'Sonido', 'aria-pressed': String(portal.sonidoActivo()),
            onClick: () => {
                const activo = portal.alternarSonido();
                boton.setAttribute('aria-pressed', String(activo));
                boton.replaceChildren(iconoSonido(activo));
            }
        }, iconoSonido(portal.sonidoActivo()));
        this.cabecera.append(
            h('a', { class: 'saltar', href: '#principal' }, 'Saltar al contenido'),
            h('p', { class: 'marca' }, NOMBRE_PORTAL),
            boton);
    }

    /** Lleva el foco al título de la pantalla nueva: los lectores de pantalla anuncian el cambio. */
    enfocarTitulo() {
        const titulo = this.principal.querySelector('[data-foco]');
        if (titulo) titulo.focus({ preventScroll: true });
    }

    contexto() {
        const portal = this.portal;
        return {
            pedirSalida: async () => {
                const yaEstabaPausado = portal.pausado;
                portal.pausarJuego();
                const salir = await confirmarModal(this.raiz, {
                    titulo: '¿Salir del juego?', mensaje: 'Perderás lo que llevas de esta partida.',
                    textoSi: 'Sí, salir', textoNo: 'Seguir jugando'
                });
                if (salir) portal.salirDelJuego(); else if (!yaEstabaPausado) portal.reanudarJuego();
            },
            confirmarEliminar: async (perfil) => {
                const si = await confirmarModal(this.raiz, {
                    titulo: `¿Eliminar a ${perfil.apodo}?`, mensaje: 'Se borrará todo su progreso. No se puede deshacer.',
                    textoSi: 'Sí, eliminar', textoNo: 'Cancelar', peligro: true
                });
                if (si) portal.eliminarPerfil(perfil.id);
            },
            confirmarReiniciar: async () => {
                const si = await confirmarModal(this.raiz, {
                    titulo: '¿Borrar TODO el progreso?', mensaje: 'Se eliminarán todos los jugadores de este equipo.',
                    textoSi: 'Sí, borrar todo', textoNo: 'Cancelar', peligro: true
                });
                if (si) portal.reiniciarTodo();
            },
            descargar: (nombre, texto) => descargarArchivo(nombre, texto)
        };
    }
}

function descargarArchivo(nombre, texto) {
    const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = h('a', { href: url, download: nombre });
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
