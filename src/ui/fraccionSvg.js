/**
 * Componentes visuales de fracciones.
 *
 *  - `figuraFraccion`  → barra o pastel dividido en `d` partes iguales con `n` pintadas (solo lectura).
 *  - `FiguraPintable`  → la misma figura pero el niño toca partes para pintarlas (ratón, dedo o teclado).
 *  - `fraccionApilada` → numerador sobre denominador (DOM, no SVG: así el texto se ve nítido y es seleccionable).
 *  - `expresionDom`    → una operación como lista de piezas: fracciones, mixtas y símbolos.
 *
 * La geometría vive aquí; las reglas (¿está bien?) viven en la lógica, que no sabe nada de dibujos.
 */
import { h } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const ANCHO_BARRA = 300;
const ALTO_BARRA = 64;
const RADIO = 90;
const CENTRO = 100;

function el(etiqueta, atributos = {}) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, String(v));
    return nodo;
}

/** Trazo de un sector circular: de `desde` a `hasta` (radianes, 0 = arriba, sentido horario). */
export function trazoSector(i, d) {
    const a1 = (i * 2 * Math.PI) / d;
    const a2 = ((i + 1) * 2 * Math.PI) / d;
    const punto = (a) => `${(CENTRO + Math.sin(a) * RADIO).toFixed(2)} ${(CENTRO - Math.cos(a) * RADIO).toFixed(2)}`;
    return `M ${CENTRO} ${CENTRO} L ${punto(a1)} A ${RADIO} ${RADIO} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${punto(a2)} Z`;
}

function segmento(forma, i, d) {
    if (forma === 'pastel') return el('path', { d: trazoSector(i, d), class: 'fraccion-parte' });
    const ancho = ANCHO_BARRA / d;
    return el('rect', { x: (i * ancho).toFixed(2), y: 0, width: ancho.toFixed(2), height: ALTO_BARRA, class: 'fraccion-parte' });
}

function crearSvg(forma, d, etiqueta) {
    const barra = forma !== 'pastel';
    const svg = el('svg', {
        class: `fraccion-figura fraccion-figura--${barra ? 'barra' : 'pastel'}`,
        viewBox: barra ? `-2 -2 ${ANCHO_BARRA + 4} ${ALTO_BARRA + 4}` : '0 0 200 200',
        role: 'img', 'aria-label': etiqueta
    });
    const partes = [];
    for (let i = 0; i < d; i++) {
        const parte = segmento(forma, i, d);
        svg.append(parte);
        partes.push(parte);
    }
    return { svg, partes };
}

const ETIQUETA_FIGURA = 'Figura dividida en partes iguales, algunas pintadas. Esta actividad es visual: pide ayuda a una persona adulta.';

/** Figura de solo lectura. Su etiqueta NO dice la fracción (la fracción es la pregunta). */
export function figuraFraccion({ forma = 'barra', n, d }) {
    const { svg, partes } = crearSvg(forma, d, ETIQUETA_FIGURA);
    partes.forEach((parte, i) => { if (i < n) parte.classList.add('fraccion-parte--pintada'); });
    return svg;
}

/** Figura donde el niño decide qué partes pintar. */
export class FiguraPintable {
    constructor({ forma = 'barra', d, alCambiar = () => {} }) {
        this.d = d;
        this.alCambiar = alCambiar;
        this.activa = true;
        const { svg, partes } = crearSvg(forma, d, `Figura dividida en ${d} partes iguales. Toca las partes para pintarlas.`);
        this.elemento = svg;
        this.partes = partes;
        this.pintadas = new Set();
        svg.removeAttribute('role');
        svg.setAttribute('role', 'group');
        partes.forEach((parte, i) => {
            parte.setAttribute('role', 'checkbox');
            parte.setAttribute('aria-checked', 'false');
            parte.setAttribute('aria-label', `Parte ${i + 1} de ${d}`);
            parte.setAttribute('tabindex', '0');
            parte.addEventListener('click', () => this.alternar(i));
            parte.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.alternar(i); }
            });
        });
        svg.classList.add('fraccion-figura--pintable');
    }

    alternar(i) {
        if (!this.activa) return;
        if (this.pintadas.has(i)) this.pintadas.delete(i); else this.pintadas.add(i);
        this.partes[i].classList.toggle('fraccion-parte--pintada', this.pintadas.has(i));
        this.partes[i].setAttribute('aria-checked', String(this.pintadas.has(i)));
        this.alCambiar(this.pintadas.size);
    }

    /** Cuántas partes lleva pintadas. */
    get cantidad() {
        return this.pintadas.size;
    }

    desactivar() {
        this.activa = false;
        this.elemento.classList.remove('fraccion-figura--pintable');
        this.partes.forEach((p) => p.removeAttribute('tabindex'));
    }
}

// ---------- Fracciones en DOM ----------

/** Dice una fracción para lectores de pantalla ("3 sobre 4"); admite "?" como incógnita. */
const etiquetaFraccion = ({ n, d }) => `${n === '?' ? 'incógnita' : n} sobre ${d === '?' ? 'incógnita' : d}`;

/** Numerador sobre denominador. `n` o `d` pueden ser '?' para una incógnita. */
export function fraccionApilada({ n, d }, clase = '') {
    return h('span', { class: `fraccion ${clase}`.trim(), role: 'img', 'aria-label': etiquetaFraccion({ n, d }) },
        h('span', { class: 'fraccion__num', 'aria-hidden': 'true' }, String(n)),
        h('span', { class: 'fraccion__den', 'aria-hidden': 'true' }, String(d)));
}

export function mixtaApilada({ entero, n, d }, clase = '') {
    return h('span', { class: `mixta ${clase}`.trim(), role: 'img', 'aria-label': `${entero} y ${etiquetaFraccion({ n, d })}` },
        h('span', { class: 'mixta__entero', 'aria-hidden': 'true' }, String(entero)),
        fraccionApilada({ n, d }, 'fraccion--en-mixta'));
}

/** Piezas de una operación: { fraccion } | { mixta } | { texto }. */
export function expresionDom(piezas) {
    const nodos = piezas.map((p) => {
        if (p.fraccion) return fraccionApilada(p.fraccion, 'fraccion--grande');
        if (p.mixta) return mixtaApilada(p.mixta, 'mixta--grande');
        return h('span', { class: 'expresion__simbolo' }, p.texto);
    });
    return h('div', { class: 'expresion', role: 'group', 'aria-label': 'Operación' }, nodos);
}

/** Contenido de un botón de respuesta: fracción apilada, mixta o texto. */
export function contenidoOpcion(opcion) {
    if (opcion.fraccion) return fraccionApilada(opcion.fraccion);
    if (opcion.mixta) return mixtaApilada(opcion.mixta);
    return opcion.texto;
}
