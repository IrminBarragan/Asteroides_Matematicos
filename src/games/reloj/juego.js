/**
 * Reloj Aventurero — juego del portal (contrato `Juego`), basado en DOM + SVG.
 *
 * Qué ve el niño: una pregunta sobre la hora. A veces hay que LEER un reloj y elegir la hora entre botones; otras hay
 * que PONER la hora arrastrando las manecillas; en 4.º también hay reloj de 24 horas y duraciones.
 * No hay cronómetro: cada pregunta espera lo que el niño necesite. Equivocarse da una pista y se puede reintentar.
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego } from '../../core/bucle.js';
import { Planificador } from '../../core/planificador.js';
import { elegir } from '../../core/aleatorio.js';
import { tiempoDeLectura } from '../../core/lectura.js';
import { codigoHora, formatoDigital } from '../../core/tiempo.js';
import { h, vaciar } from '../../ui/dom.js';
import { RelojSvg } from '../../ui/relojSvg.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';

const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];

export class JuegoReloj extends Juego {
    static meta = {
        id: 'reloj',
        nombre: 'Reloj Aventurero',
        descripcion: 'Lee el reloj, pon la hora arrastrando las manecillas y calcula cuánto tiempo pasa.',
        area: 'medicion',
        grados: [1, 2, 3, 4]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.fase = 'jugando';       // jugando | transicion
        this.relojInteractivo = null;
        this.tareaSiguiente = null;
    }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.audio = contexto.audio;
        this.partida = new Partida({
            grado: contexto.grado || 1,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio
        });
        this.construirInterfaz(contenedor);

        // El bucle solo hace de reloj: pausarlo congela las esperas del planificador
        this.bucle = new BucleJuego({
            actualizar: (paso) => { this.tiempoJuego += paso; this.planificador.avanzar(paso); },
            dibujar: () => {}
        });
        this.empezarPregunta();
        this.bucle.iniciar();
    }

    alPausar() { this.bucle.detener(); }

    alReanudar() { this.bucle.iniciar(); }

    alDestruir() {
        if (this.bucle) this.bucle.detener();
        this.planificador.limpiar();
        if (this.relojInteractivo) this.relojInteractivo.desactivar();
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz ----------

    construirInterfaz(contenedor) {
        this.textoProgreso = h('span', { class: 'reloj-juego__dato' });
        this.textoPuntos = h('span', { class: 'reloj-juego__dato' });
        this.textoRacha = h('span', { class: 'reloj-juego__dato' });
        this.textoEnunciado = h('p', { class: 'reloj-juego__enunciado', 'aria-live': 'polite' });
        this.zonaRelojes = h('div', { class: 'reloj-juego__relojes' });
        this.zonaAcciones = h('div', { class: 'reloj-juego__acciones' });
        this.textoMensaje = h('p', { class: 'reloj-juego__mensaje', 'aria-live': 'polite' });
        this.botonSiguiente = h('button', { class: 'boton boton--secundario', type: 'button', hidden: true, onClick: () => this.irASiguiente() }, 'Siguiente ➜');
        this.raiz = h('section', { class: 'reloj-juego', 'aria-label': 'Reloj Aventurero' },
            h('div', { class: 'reloj-juego__hud' }, this.textoProgreso, this.textoPuntos, this.textoRacha),
            this.textoEnunciado, this.zonaRelojes, this.zonaAcciones,
            h('div', { class: 'reloj-juego__pie' }, this.textoMensaje, this.botonSiguiente));
        contenedor.append(this.raiz);
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `reloj-juego__mensaje ${tipo ? `reloj-juego__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
    }

    // ---------- Reglas en acción ----------

    empezarPregunta() {
        const info = this.partida.iniciarPregunta(this.tiempoJuego);
        if (!info) return this.terminar();

        const { pregunta } = info;
        this.fase = 'jugando';
        this.botonSiguiente.hidden = true;
        if (this.relojInteractivo) { this.relojInteractivo.desactivar(); this.relojInteractivo = null; }
        this.botonesActuales = null;
        this.botonComprobar = null;
        vaciar(this.zonaRelojes);
        vaciar(this.zonaAcciones);
        this.textoEnunciado.textContent = pregunta.enunciado;

        if (pregunta.tipo === 'poner') this.montarPoner(pregunta);
        else this.montarOpciones(pregunta);

        this.mensaje(this.partida.numero === 1 ? (pregunta.tipo === 'poner' ? 'Arrastra las manecillas y toca «Comprobar».' : 'Elige la respuesta correcta.') : '');
        this.actualizarHud();
    }

    /** Relojes de solo lectura. Su etiqueta NO dice la hora (la hora es la pregunta). */
    montarRelojesDeLectura(pregunta) {
        for (const { h: hh, m, etiqueta } of pregunta.relojes) {
            const reloj = new RelojSvg({ etiqueta: 'Reloj analógico. Esta actividad es visual: pide ayuda a una persona adulta.' });
            reloj.establecer(hh, m);
            this.zonaRelojes.append(h('figure', { class: 'reloj-juego__figura' }, reloj.elemento, etiqueta && h('figcaption', {}, etiqueta)));
        }
    }

    montarOpciones(pregunta) {
        this.montarRelojesDeLectura(pregunta);
        const botones = pregunta.opciones.map((opcion) => h('button', {
            class: 'reloj-juego__opcion', type: 'button',
            onClick: (e) => this.elegirOpcion(opcion, e.currentTarget, botones)
        }, opcion.texto));
        this.zonaAcciones.append(...botones);
        this.botonesActuales = botones;
    }

    elegirOpcion(opcion, boton) {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || boton.getAttribute('aria-disabled') === 'true') return;
        this.resolver(opcion.id, boton);
    }

    montarPoner(pregunta) {
        const reloj = new RelojSvg({ etiqueta: 'Reloj para poner la hora' });
        reloj.establecer(pregunta.relojInicial.h, pregunta.relojInicial.m);
        reloj.activar({ paso: pregunta.paso });
        this.relojInteractivo = reloj;
        this.zonaRelojes.append(h('figure', { class: 'reloj-juego__figura reloj-juego__figura--grande' }, reloj.elemento,
            h('figcaption', {}, 'Arrastra la manecilla corta (horas) y la larga (minutos)')));
        this.botonComprobar = h('button', { class: 'boton boton--primario', type: 'button', onClick: () => this.comprobar() }, 'Comprobar');
        this.zonaAcciones.append(this.botonComprobar);
    }

    comprobar() {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || !this.relojInteractivo) return;
        const { h: hh, m } = this.relojInteractivo.obtener();
        this.resolver(codigoHora(hh, m), null, formatoDigital(hh, m));
    }

    /** Responde con `id` (el número de opción, o el código de la hora puesta) y muestra el resultado. */
    resolver(id, boton, horaPuesta = null) {
        const r = this.partida.responder(id, { ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;

        if (r.tipo === 'correcta') {
            if (boton) boton.classList.add('reloj-juego__opcion--correcta');
            if (this.botonesActuales) this.botonesActuales.forEach((b) => b.setAttribute('aria-disabled', 'true'));
            if (this.relojInteractivo) { this.relojInteractivo.desactivar(); }
            if (this.botonComprobar) this.botonComprobar.disabled = true;
            const elogio = r.primerIntento ? elegir(this.aleatorio, ELOGIOS) : '¡Lo lograste!';
            let texto = `${elogio} +${r.puntos} puntos. ${r.explicacion}`;
            if (r.cambioNivel === 'subio') texto += ` ¡Subiste de nivel en ${NOMBRES_HABILIDAD[r.habilidad]}!`;
            this.mensaje(texto, 'bien');
            this.audio.reproducirEfecto('acierto');
            this.fase = 'transicion';
            this.botonSiguiente.hidden = false;
            this.tareaSiguiente = this.planificador.programar(tiempoDeLectura(texto), () => this.irASiguiente());
        } else {
            if (boton) {
                boton.classList.add('reloj-juego__opcion--incorrecta');
                boton.setAttribute('aria-disabled', 'true');
            }
            const tuReloj = horaPuesta ? `Tu reloj marca ${horaPuesta}. ` : '';
            this.mensaje(`Casi. ${tuReloj}Pista: ${r.pista}`, 'pista');
            this.audio.reproducirEfecto('fallo');
        }
        this.actualizarHud();
    }

    irASiguiente() {
        if (this.estado !== 'jugando' || this.fase !== 'transicion') return;
        if (this.tareaSiguiente !== null) this.planificador.cancelar(this.tareaSiguiente);
        this.tareaSiguiente = null;
        this.empezarPregunta();
    }

    terminar() {
        this.bucle.detener();
        this.finalizar(this.partida.resultado(this.tiempoJuego)); // siempre lo ÚLTIMO que hace el juego
    }
}
