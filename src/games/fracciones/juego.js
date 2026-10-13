/**
 * Tren de Fracciones — juego del portal (contrato `Juego`), basado en DOM + SVG.
 *
 * Qué ve el niño: una pregunta sobre fracciones. A veces hay que LEER una figura pintada, otras PINTAR una fracción
 * tocando partes, comparar, buscar equivalentes, sumar, simplificar, pasar a número mixto o a decimal.
 * No hay cronómetro ni vidas: cada pregunta espera lo que el niño necesite. Equivocarse da una pista y se puede reintentar.
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego } from '../../core/bucle.js';
import { Planificador } from '../../core/planificador.js';
import { elegir } from '../../core/aleatorio.js';
import { tiempoDeLectura } from '../../core/lectura.js';
import { h, vaciar } from '../../ui/dom.js';
import { figuraFraccion, FiguraPintable, expresionDom, contenidoOpcion } from '../../ui/fraccionSvg.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';

const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];

export class JuegoFracciones extends Juego {
    static meta = {
        id: 'fracciones',
        nombre: 'Tren de Fracciones',
        descripcion: 'Lee, pinta, compara, suma y simplifica fracciones para que el tren siga su camino.',
        area: 'matematicas',
        grados: [3, 4, 5, 6]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.fase = 'jugando';       // jugando | transicion
        this.figuraPintable = null;
        this.tareaSiguiente = null;
    }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.audio = contexto.audio;
        this.partida = new Partida({
            grado: contexto.grado || 3,
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
        if (this.figuraPintable) this.figuraPintable.desactivar();
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz ----------

    construirInterfaz(contenedor) {
        this.textoProgreso = h('span', { class: 'fracciones-juego__dato' });
        this.textoPuntos = h('span', { class: 'fracciones-juego__dato' });
        this.textoRacha = h('span', { class: 'fracciones-juego__dato' });
        this.vagones = h('div', { class: 'fracciones-juego__tren', 'aria-hidden': 'true' });
        this.textoEnunciado = h('p', { class: 'fracciones-juego__enunciado', 'aria-live': 'polite', 'data-leer': true });
        this.zonaVisual = h('div', { class: 'fracciones-juego__visual' });
        this.zonaAcciones = h('div', { class: 'fracciones-juego__acciones' });
        this.textoMensaje = h('p', { class: 'fracciones-juego__mensaje', 'aria-live': 'polite' });
        this.botonSiguiente = h('button', { class: 'boton boton--secundario', type: 'button', hidden: true, onClick: () => this.irASiguiente() }, 'Siguiente ➜');
        this.raiz = h('section', { class: 'fracciones-juego', 'aria-label': 'Tren de Fracciones' },
            h('div', { class: 'fracciones-juego__hud' }, this.textoProgreso, this.textoPuntos, this.textoRacha),
            this.vagones, this.textoEnunciado, this.zonaVisual, this.zonaAcciones,
            h('div', { class: 'fracciones-juego__pie' }, this.textoMensaje, this.botonSiguiente));
        contenedor.append(this.raiz);
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `fracciones-juego__mensaje ${tipo ? `fracciones-juego__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
        // El tren crece con cada pregunta resuelta: una forma visual de ver el avance
        vaciar(this.vagones);
        const resueltas = p.numero - (p.resuelta ? 0 : 1);
        for (let i = 0; i < p.total; i++) {
            this.vagones.append(h('span', { class: `fracciones-juego__vagon${i < resueltas ? ' fracciones-juego__vagon--listo' : ''}` }));
        }
    }

    // ---------- Reglas en acción ----------

    empezarPregunta() {
        const info = this.partida.iniciarPregunta(this.tiempoJuego);
        if (!info) return this.terminar();

        const { pregunta } = info;
        this.fase = 'jugando';
        this.botonSiguiente.hidden = true;
        if (this.figuraPintable) { this.figuraPintable.desactivar(); this.figuraPintable = null; }
        this.botonesActuales = null;
        this.botonComprobar = null;
        vaciar(this.zonaVisual);
        vaciar(this.zonaAcciones);
        this.textoEnunciado.textContent = pregunta.enunciado;

        if (pregunta.expresion.length) this.zonaVisual.append(expresionDom(pregunta.expresion));
        if (pregunta.tipo === 'pintar') this.montarPintar(pregunta);
        else this.montarOpciones(pregunta);

        this.mensaje(this.partida.numero === 1 ? (pregunta.tipo === 'pintar' ? 'Toca las partes que quieres pintar y luego «Comprobar».' : 'Elige la respuesta correcta.') : '');
        this.actualizarHud();
    }

    montarOpciones(pregunta) {
        if (pregunta.visuales.length) {
            this.zonaVisual.append(h('div', { class: 'fracciones-juego__figuras' }, pregunta.visuales.map((v) =>
                h('figure', { class: 'fracciones-juego__figura' }, figuraFraccion(v), v.etiqueta && h('figcaption', {}, v.etiqueta)))));
        }
        const botones = pregunta.opciones.map((opcion) => h('button', {
            class: 'fracciones-juego__opcion', type: 'button', 'aria-label': opcion.texto,
            onClick: (e) => this.elegirOpcion(opcion, e.currentTarget)
        }, contenidoOpcion(opcion)));
        this.zonaAcciones.append(...botones);
        this.botonesActuales = botones;
    }

    elegirOpcion(opcion, boton) {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || boton.getAttribute('aria-disabled') === 'true') return;
        this.resolver(opcion.id, boton);
    }

    montarPintar(pregunta) {
        const figura = new FiguraPintable({
            forma: pregunta.figura.forma, d: pregunta.figura.d,
            alCambiar: (cantidad) => { this.contador.textContent = `Pintadas: ${cantidad} de ${pregunta.figura.d}`; }
        });
        this.figuraPintable = figura;
        this.contador = h('figcaption', { 'aria-live': 'polite' }, `Pintadas: 0 de ${pregunta.figura.d}`);
        this.zonaVisual.append(h('figure', { class: 'fracciones-juego__figura fracciones-juego__figura--grande' }, figura.elemento, this.contador));
        this.botonComprobar = h('button', { class: 'boton boton--primario', type: 'button', onClick: () => this.comprobar() }, 'Comprobar');
        this.zonaAcciones.append(this.botonComprobar);
    }

    comprobar() {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || !this.figuraPintable) return;
        const pintadas = this.figuraPintable.cantidad;
        this.resolver(pintadas, null, pintadas);
    }

    /** Responde con `id` (el número de opción, o cuántas partes se pintaron) y muestra el resultado. */
    resolver(id, boton, pintadas = null) {
        const r = this.partida.responder(id, { ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;

        if (r.tipo === 'correcta') {
            if (boton) boton.classList.add('fracciones-juego__opcion--correcta');
            if (this.botonesActuales) this.botonesActuales.forEach((b) => b.setAttribute('aria-disabled', 'true'));
            if (this.figuraPintable) this.figuraPintable.desactivar();
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
                boton.classList.add('fracciones-juego__opcion--incorrecta');
                boton.setAttribute('aria-disabled', 'true');
            }
            const tuFigura = pintadas === null ? '' : `Pintaste ${pintadas} ${pintadas === 1 ? 'parte' : 'partes'}. `;
            this.mensaje(`Casi. ${tuFigura}Pista: ${r.pista}`, 'pista');
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
