/**
 * Reloj analógico en SVG. Puede ser solo de lectura o INTERACTIVO (el niño arrastra las manecillas).
 *
 * Interacción:
 *  - Puntero (ratón, dedo, lápiz): al tocar se elige la manecilla (ver `elegirMano`) y se arrastra; el minutero
 *    "salta" cada `paso` minutos (30, 15, 5 o 1 según el grado) y el horario salta de hora en hora.
 *  - Teclado: cada manecilla es un `slider` (Tab para llegar, flechas para moverla).
 * La geometría (ángulos ↔ hora) vive en `core/tiempo.js`, donde está probada; aquí solo se dibuja y se conectan eventos.
 */
import { svgDesdeMarkup } from './dom.js';
import { aCoordenadasLogicas } from '../core/entrada.js';
import {
    anguloHorario, anguloMinutero, anguloDesdeCentro, minutosDesdeAngulo, horaDesdeAngulo, elegirMano, normalizarHora12
} from '../core/tiempo.js';

const LADO = 200;
const CENTRO = 100;
const LARGO_HORARIO = 48;
const LARGO_MINUTERO = 72;
const RADIO_MUERTO = 8; // tocar justo en el centro no define ninguna dirección

function marcasYNumeros() {
    let marcas = '';
    for (let i = 0; i < 60; i++) {
        const a = (i * 6 * Math.PI) / 180;
        const largo = i % 5 === 0 ? 12 : 6;
        const x1 = CENTRO + Math.sin(a) * 86;
        const y1 = CENTRO - Math.cos(a) * 86;
        const x2 = CENTRO + Math.sin(a) * (86 - largo);
        const y2 = CENTRO - Math.cos(a) * (86 - largo);
        marcas += `<line class="reloj__marca${i % 5 === 0 ? ' reloj__marca--hora' : ''}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    }
    let numeros = '';
    for (let n = 1; n <= 12; n++) {
        const a = (n * 30 * Math.PI) / 180;
        numeros += `<text class="reloj__numero" x="${(CENTRO + Math.sin(a) * 64).toFixed(2)}" y="${(CENTRO - Math.cos(a) * 64 + 1).toFixed(2)}" text-anchor="middle" dominant-baseline="middle">${n}</text>`;
    }
    return marcas + numeros;
}

const mano = (clase, largo) =>
    `<g class="reloj__mano reloj__mano--${clase}" data-mano="${clase}">
        <line class="reloj__toque" x1="${CENTRO}" y1="${CENTRO}" x2="${CENTRO}" y2="${CENTRO - largo}"/>
        <line class="reloj__trazo" x1="${CENTRO}" y1="${CENTRO + 8}" x2="${CENTRO}" y2="${CENTRO - largo}"/>
    </g>`;

export class RelojSvg {
    /** @param {{etiqueta?: string}} [opciones]  etiqueta para lectores de pantalla (¡no debe revelar la hora si es parte de la pregunta!) */
    constructor({ etiqueta = 'Reloj analógico' } = {}) {
        this.svg = svgDesdeMarkup(
            `<svg xmlns="http://www.w3.org/2000/svg" class="reloj" viewBox="0 0 ${LADO} ${LADO}" role="group" aria-label="${etiqueta}" focusable="false">
                <circle class="reloj__borde" cx="${CENTRO}" cy="${CENTRO}" r="96"/>
                <circle class="reloj__cara" cx="${CENTRO}" cy="${CENTRO}" r="90"/>
                ${marcasYNumeros()}
                ${mano('hora', LARGO_HORARIO)}
                ${mano('minuto', LARGO_MINUTERO)}
                <circle class="reloj__centro" cx="${CENTRO}" cy="${CENTRO}" r="6"/>
            </svg>`
        );
        this.manoHora = this.svg.querySelector('[data-mano="hora"]');
        this.manoMinuto = this.svg.querySelector('[data-mano="minuto"]');
        this.estado = { h: 12, m: 0 };
        this.interactivo = false;
        this.paso = 1;
        this.alCambiar = null;
        this.arrastrando = null;

        this.alBajar = (e) => this.bajar(e);
        this.alMover = (e) => this.mover(e);
        this.alSoltar = (e) => this.soltar(e);
        this.alTeclear = (e) => this.teclear(e);
        this.pintar();
    }

    get elemento() {
        return this.svg;
    }

    obtener() {
        return { ...this.estado };
    }

    /** Pone las manecillas en h:m (sin avisar a `alCambiar`: es un cambio hecho por el programa, no por el niño). */
    establecer(h, m) {
        this.estado = { h: normalizarHora12(h), m: ((m % 60) + 60) % 60 };
        this.pintar();
    }

    pintar() {
        const { h, m } = this.estado;
        this.manoHora.setAttribute('transform', `rotate(${anguloHorario(h, m)} ${CENTRO} ${CENTRO})`);
        this.manoMinuto.setAttribute('transform', `rotate(${anguloMinutero(m)} ${CENTRO} ${CENTRO})`);
        if (this.interactivo) {
            this.manoHora.setAttribute('aria-valuenow', String(h));
            this.manoHora.setAttribute('aria-valuetext', `${h} ${h === 1 ? 'hora' : 'horas'}`);
            this.manoMinuto.setAttribute('aria-valuenow', String(m));
            this.manoMinuto.setAttribute('aria-valuetext', `${m} ${m === 1 ? 'minuto' : 'minutos'}`);
        }
    }

    // ---------- Interacción ----------

    /**
     * @param {{paso?: number, alCambiar?: Function}} opciones
     *   paso: cada cuántos minutos salta el minutero · alCambiar: ({h, m}) => void cuando el NIÑO mueve una manecilla
     */
    activar({ paso = 1, alCambiar = null } = {}) {
        if (this.interactivo) return;
        this.interactivo = true;
        this.paso = paso;
        this.alCambiar = alCambiar;
        this.svg.classList.add('reloj--interactivo');
        this.svg.style.touchAction = 'none'; // sin esto el navegador táctil lo toma como scroll y cancela el arrastre
        const config = [
            [this.manoHora, 'Manecilla corta, las horas', 1, 12],
            [this.manoMinuto, 'Manecilla larga, los minutos', 0, 59]
        ];
        for (const [m, etiqueta, min, max] of config) {
            m.setAttribute('role', 'slider');
            m.setAttribute('tabindex', '0');
            m.setAttribute('aria-label', etiqueta);
            m.setAttribute('aria-valuemin', String(min));
            m.setAttribute('aria-valuemax', String(max));
            m.setAttribute('aria-orientation', 'horizontal');
        }
        this.svg.addEventListener('pointerdown', this.alBajar);
        this.svg.addEventListener('pointermove', this.alMover);
        this.svg.addEventListener('pointerup', this.alSoltar);
        this.svg.addEventListener('pointercancel', this.alSoltar);
        this.svg.addEventListener('keydown', this.alTeclear);
        this.pintar();
    }

    desactivar() {
        if (!this.interactivo) return;
        this.interactivo = false;
        this.arrastrando = null;
        this.svg.classList.remove('reloj--interactivo');
        this.svg.removeEventListener('pointerdown', this.alBajar);
        this.svg.removeEventListener('pointermove', this.alMover);
        this.svg.removeEventListener('pointerup', this.alSoltar);
        this.svg.removeEventListener('pointercancel', this.alSoltar);
        this.svg.removeEventListener('keydown', this.alTeclear);
        for (const m of [this.manoHora, this.manoMinuto]) {
            ['role', 'tabindex', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-orientation']
                .forEach((a) => m.removeAttribute(a));
            m.classList.remove('reloj__mano--activa');
        }
    }

    /** Punto del evento relativo al centro, en unidades del SVG (el SVG debe ser cuadrado en pantalla). */
    puntoRelativo(e) {
        const p = aCoordenadasLogicas(e.clientX, e.clientY, this.svg.getBoundingClientRect(), LADO, LADO);
        return { dx: p.x - CENTRO, dy: p.y - CENTRO };
    }

    bajar(e) {
        const { dx, dy } = this.puntoRelativo(e);
        const radio = Math.hypot(dx, dy);
        if (radio < RADIO_MUERTO) return;
        const angulo = anguloDesdeCentro(dx, dy);
        this.arrastrando = elegirMano({
            angulo, radio,
            anguloHorario: anguloHorario(this.estado.h, this.estado.m),
            anguloMinutero: anguloMinutero(this.estado.m),
            largoHorario: LARGO_HORARIO
        });
        try { this.svg.setPointerCapture(e.pointerId); } catch (error) { /* no crítico */ }
        (this.arrastrando === 'hora' ? this.manoHora : this.manoMinuto).classList.add('reloj__mano--activa');
        this.aplicarAngulo(angulo);
        e.preventDefault();
    }

    mover(e) {
        if (!this.arrastrando) return;
        const { dx, dy } = this.puntoRelativo(e);
        if (Math.hypot(dx, dy) < RADIO_MUERTO) return;
        this.aplicarAngulo(anguloDesdeCentro(dx, dy));
    }

    soltar() {
        this.arrastrando = null;
        this.manoHora.classList.remove('reloj__mano--activa');
        this.manoMinuto.classList.remove('reloj__mano--activa');
    }

    aplicarAngulo(angulo) {
        const antes = this.estado;
        if (this.arrastrando === 'minuto') this.estado = { h: antes.h, m: minutosDesdeAngulo(angulo, this.paso) };
        else this.estado = { h: horaDesdeAngulo(angulo), m: antes.m };
        this.avisarCambio(antes);
    }

    teclear(e) {
        const objetivo = e.target.closest ? e.target.closest('[data-mano]') : null;
        if (!objetivo) return;
        const sube = e.key === 'ArrowUp' || e.key === 'ArrowRight';
        const baja = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
        if (!sube && !baja) return;
        e.preventDefault();
        const antes = this.estado;
        const signo = sube ? 1 : -1;
        if (objetivo.dataset.mano === 'hora') this.estado = { h: normalizarHora12(antes.h + signo), m: antes.m };
        else this.estado = { h: antes.h, m: (antes.m + signo * this.paso + 60) % 60 };
        this.avisarCambio(antes);
    }

    avisarCambio(antes) {
        this.pintar();
        if ((antes.h !== this.estado.h || antes.m !== this.estado.m) && this.alCambiar) this.alCambiar({ ...this.estado });
    }
}
