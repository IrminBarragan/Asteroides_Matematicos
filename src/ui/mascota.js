/**
 * «Chispa», la mascota entrenadora: un robot amigable dibujado en SVG propio que reacciona a lo que pasa
 * (acierta, se equivoca, sube de nivel, pausa). Es DECORACIÓN: está oculta para lectores de pantalla (los mensajes
 * importantes ya los dan los juegos) y se puede quitar con el «modo ligero».
 *
 * Pensada para niños de ~11–12 años que repasan contenido de grados menores: un «entrenador», no un peluche.
 */
import { h, svgDesdeMarkup } from './dom.js';

export const ESTADOS = ['neutral', 'celebra', 'animo', 'piensa', 'duerme'];

const FRASES = {
    acierto: ['¡Eso es!', '¡Bien hecho!', '¡Vas muy bien!', '¡Así se hace!'],
    error: ['¡Casi! Tú puedes.', 'Inténtalo otra vez.', 'Sin prisa, piénsalo.', 'Cada intento enseña algo.'],
    nivel: ['¡Subiste de nivel!', '¡Vienen retos nuevos!'],
    ayuda: ['Veamos cómo se hace.'],
    mision: ['¡Vamos a ver hasta dónde llegas!']
};

/** Estado y duración (ms) con que reacciona a cada tipo de evento; `habla`: si además dice una frase. */
export const REACCIONES = {
    acierto: { estado: 'celebra', ms: 1100, habla: false },
    error: { estado: 'animo', ms: 2200, habla: true },
    nivel: { estado: 'celebra', ms: 2400, habla: true },
    ayuda: { estado: 'piensa', ms: 2500, habla: false }
};

/** Una frase al azar para ese tipo de evento (cadena vacía si no hay). */
export function frasePara(tipo, aleatorio = Math.random) {
    const lista = FRASES[tipo];
    return lista ? lista[Math.floor(aleatorio() * lista.length)] : '';
}

const SVG = `
<svg viewBox="0 0 120 150" class="mascota__svg" focusable="false" aria-hidden="true">
  <g class="mascota__cuerpo">
    <line class="mascota__antena" x1="60" y1="12" x2="60" y2="30"/>
    <circle class="mascota__bombilla" cx="60" cy="9" r="7"/>
    <rect class="mascota__cabeza" x="22" y="28" width="76" height="60" rx="20"/>
    <rect class="mascota__cinta" x="22" y="36" width="76" height="9"/>
    <rect class="mascota__cara" x="31" y="48" width="58" height="34" rx="13"/>
    <g class="mascota__ojos mascota__ojos--abiertos"><circle cx="49" cy="63" r="6"/><circle cx="71" cy="63" r="6"/></g>
    <g class="mascota__ojos mascota__ojos--felices"><path d="M42 66 q7 -10 14 0"/><path d="M64 66 q7 -10 14 0"/></g>
    <g class="mascota__ojos mascota__ojos--dormidos"><path d="M43 64 h12"/><path d="M65 64 h12"/></g>
    <g class="mascota__ojos mascota__ojos--arriba"><circle cx="52" cy="60" r="6"/><circle cx="74" cy="60" r="6"/></g>
    <path class="mascota__boca mascota__boca--sonrisa" d="M49 73 q11 9 22 0"/>
    <ellipse class="mascota__boca mascota__boca--abierta" cx="60" cy="75" rx="8" ry="6"/>
    <path class="mascota__boca mascota__boca--plana" d="M52 75 h16"/>
    <rect class="mascota__torso" x="34" y="92" width="52" height="34" rx="12"/>
    <circle class="mascota__pecho" cx="60" cy="109" r="7"/>
    <g class="mascota__brazo mascota__brazo--izq"><line x1="34" y1="100" x2="16" y2="116"/></g>
    <g class="mascota__brazo mascota__brazo--der"><line x1="86" y1="100" x2="104" y2="116"/></g>
    <g class="mascota__brazo mascota__brazo--izq-arriba"><line x1="34" y1="100" x2="14" y2="78"/></g>
    <g class="mascota__brazo mascota__brazo--der-arriba"><line x1="86" y1="100" x2="106" y2="78"/></g>
    <text class="mascota__zzz" x="92" y="30">z</text>
    <rect class="mascota__pie" x="40" y="128" width="16" height="10" rx="4"/>
    <rect class="mascota__pie" x="64" y="128" width="16" height="10" rx="4"/>
  </g>
</svg>`;

export class Mascota {
    constructor({ programar = (f, ms) => setTimeout(f, ms), cancelar = (id) => clearTimeout(id), aleatorio = Math.random } = {}) {
        this.programar = programar;
        this.cancelar = cancelar;
        this.aleatorio = aleatorio;
        this.temporizador = null;
        this.globo = h('p', { class: 'mascota__globo', hidden: true });
        this.elemento = h('div', { class: 'mascota', 'data-estado': 'neutral', 'aria-hidden': 'true' }, svgDesdeMarkup(SVG), this.globo);
        this.estadoActual = 'neutral';
    }

    /** Cambia la expresión; si `ms` > 0, vuelve sola a «neutral» pasado ese tiempo. */
    estado(nombre, { texto = '', ms = 0 } = {}) {
        if (!ESTADOS.includes(nombre)) throw new Error(`Estado de mascota desconocido: ${nombre}`);
        if (this.temporizador !== null) { this.cancelar(this.temporizador); this.temporizador = null; }
        this.estadoActual = nombre;
        this.elemento.dataset.estado = nombre;
        this.globo.textContent = texto;
        this.globo.hidden = texto === '';
        if (ms > 0 && nombre !== 'neutral') this.temporizador = this.programar(() => this.estado('neutral'), ms);
    }

    /** Reacciona a un evento del juego (ver REACCIONES). Los tipos desconocidos se ignoran. */
    reaccionar(tipo) {
        const r = REACCIONES[tipo];
        if (!r) return;
        this.estado(r.estado, { texto: r.habla ? frasePara(tipo, this.aleatorio) : '', ms: r.ms });
    }

    /** En pausa se «duerme»; al reanudar vuelve a su estado normal. */
    dormir(duerme) {
        this.estado(duerme ? 'duerme' : 'neutral');
    }
}
