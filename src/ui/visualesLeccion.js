/**
 * Dibujo de los materiales de una lección (ver lecciones/leccion.js): bloques de valor posicional, recta numérica,
 * grupos de objetos, operación en columnas y ejemplo con figuras/relojes/fracciones.
 *
 * Todo SVG/DOM propio (sin imágenes ni librerías) y con texto como nodos de texto. Los datos vienen de lecciones
 * que genera el propio código, no del niño.
 */
import { h } from './dom.js';
import { figuraFraccion, expresionDom } from './fraccionSvg.js';
import { RelojSvg } from './relojSvg.js';

const NS = 'http://www.w3.org/2000/svg';

function el(etiqueta, atributos = {}, texto = null) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, String(v));
    if (texto !== null) nodo.textContent = String(texto);
    return nodo;
}

function lienzo(ancho, alto, etiqueta) {
    return el('svg', { viewBox: `0 0 ${ancho} ${alto}`, class: 'leccion-svg', role: 'img', 'aria-label': etiqueta, width: ancho, height: alto });
}

// ---------- Bloques: decenas (barras de 10) y unidades (cuadritos) ----------

const LADO_CELDA = 14;

function bloquesDeGrupo({ decenas, unidades, etiqueta }) {
    const ANCHO_DECENA = LADO_CELDA + 8;
    const x0Unidades = decenas * ANCHO_DECENA + (decenas > 0 ? 10 : 0);
    const columnasUnidades = Math.max(1, Math.min(5, unidades));
    const ancho = Math.max(40, x0Unidades + columnasUnidades * (LADO_CELDA + 4) + 4);
    const alto = 10 * LADO_CELDA + 16;
    const svg = lienzo(ancho, alto, `${etiqueta}: ${decenas} decenas y ${unidades} unidades`);
    for (let d = 0; d < decenas; d++) {
        for (let c = 0; c < 10; c++) svg.append(el('rect', { x: d * ANCHO_DECENA + 2, y: 6 + c * LADO_CELDA, width: LADO_CELDA, height: LADO_CELDA - 1, class: 'leccion-celda leccion-celda--decena' }));
    }
    for (let u = 0; u < unidades; u++) {
        const col = u % 5;
        const fila = Math.floor(u / 5);
        svg.append(el('rect', { x: x0Unidades + col * (LADO_CELDA + 4), y: 6 + fila * (LADO_CELDA + 4), width: LADO_CELDA, height: LADO_CELDA, class: 'leccion-celda leccion-celda--unidad' }));
    }
    return h('figure', { class: 'leccion-figura' }, svg, h('figcaption', {}, `${etiqueta}  (${decenas} decenas, ${unidades} unidades)`));
}

function bloques({ grupos }) {
    return h('div', { class: 'leccion-fila' }, grupos.map(bloquesDeGrupo));
}

// ---------- Recta numérica ----------

function recta({ desde, hasta, saltos = [], marcas = [] }) {
    const ANCHO = 460;
    const ALTO = 130;
    const MARGEN = 24;
    const yLinea = 90;
    const x = (v) => MARGEN + ((v - desde) / (hasta - desde)) * (ANCHO - 2 * MARGEN);
    const svg = lienzo(ANCHO, ALTO, `Recta numérica de ${desde} a ${hasta}`);
    svg.append(el('line', { x1: MARGEN - 6, y1: yLinea, x2: ANCHO - MARGEN + 6, y2: yLinea, class: 'leccion-linea' }));
    const pasoMarca = hasta - desde <= 24 ? 1 : 0;
    const dibujadas = new Set();
    const marcar = (v, resaltada) => {
        if (dibujadas.has(v)) return;
        dibujadas.add(v);
        svg.append(el('line', { x1: x(v), y1: yLinea - (resaltada ? 9 : 5), x2: x(v), y2: yLinea + (resaltada ? 9 : 5), class: resaltada ? 'leccion-marca leccion-marca--fuerte' : 'leccion-marca' }));
        if (resaltada || pasoMarca) svg.append(el('text', { x: x(v), y: yLinea + 26, 'text-anchor': 'middle', class: resaltada ? 'leccion-numero leccion-numero--fuerte' : 'leccion-numero' }, v));
    };
    if (pasoMarca) for (let v = desde; v <= hasta; v++) marcar(v, false);
    [desde, hasta].forEach((v) => marcar(v, false));
    marcas.forEach((v) => { dibujadas.delete(v); marcar(v, true); });
    for (const s of saltos) {
        const x1 = x(s.de);
        const x2 = x(s.a);
        const medio = (x1 + x2) / 2;
        const altura = 34 + Math.min(20, Math.abs(x2 - x1) / 12);
        svg.append(el('path', { d: `M ${x1} ${yLinea - 4} Q ${medio} ${yLinea - altura * 1.6} ${x2} ${yLinea - 4}`, class: 'leccion-salto' }));
        svg.append(el('text', { x: medio, y: yLinea - altura - 2, 'text-anchor': 'middle', class: 'leccion-etiqueta-salto' }, s.etiqueta));
    }
    return h('div', { class: 'leccion-fila' }, svg);
}

// ---------- Grupos de objetos (multiplicar y repartir) ----------

function grupos({ grupos: cantidad, porGrupo }) {
    const columnas = Math.min(5, porGrupo);
    const filas = Math.ceil(porGrupo / columnas);
    const lado = 18;
    const ancho = columnas * lado + 16;
    const alto = filas * lado + 16;
    const nodos = [];
    for (let g = 0; g < cantidad; g++) {
        const svg = lienzo(ancho, alto, `Grupo ${g + 1} de ${cantidad}: ${porGrupo} objetos`);
        svg.append(el('rect', { x: 2, y: 2, width: ancho - 4, height: alto - 4, rx: 8, class: 'leccion-caja' }));
        for (let i = 0; i < porGrupo; i++) {
            svg.append(el('circle', { cx: 8 + (i % columnas) * lado + lado / 2, cy: 8 + Math.floor(i / columnas) * lado + lado / 2, r: 6, class: 'leccion-objeto' }));
        }
        nodos.push(svg);
    }
    return h('div', { class: 'leccion-fila leccion-fila--grupos', role: 'img', 'aria-label': `${cantidad} grupos de ${porGrupo} objetos` }, nodos,
        h('p', { class: 'leccion-leyenda' }, `${cantidad} grupos de ${porGrupo}`));
}

// ---------- Operación en columnas ----------

function operacion({ signo, arriba, abajo, resultado }) {
    const ancho = Math.max(arriba.length, abajo.length + 2, resultado.length) + 1;
    const linea = (texto) => texto.padStart(ancho, ' ');
    return h('pre', { class: 'leccion-operacion', role: 'img', 'aria-label': `${arriba} ${signo} ${abajo}` },
        `${linea(arriba)}\n${signo} ${linea(abajo).slice(2)}\n${'─'.repeat(ancho)}\n${linea(resultado || '?')}`);
}

// ---------- Ejemplo (enunciado, expresión, figuras, relojes, opciones) ----------

function ejemplo({ enunciado, expresion, figuras = [], relojes = [], opciones = [], correcta = null }) {
    const partes = [h('p', { class: 'leccion-enunciado' }, enunciado)];
    if (expresion) partes.push(expresionDom(expresion));
    if (figuras.length) {
        partes.push(h('div', { class: 'leccion-fila' }, figuras.map((f) => h('figure', { class: 'leccion-figura' }, figuraFraccion(f), f.etiqueta && h('figcaption', {}, f.etiqueta)))));
    }
    if (relojes.length) {
        partes.push(h('div', { class: 'leccion-fila' }, relojes.map((r) => {
            const reloj = new RelojSvg({ etiqueta: 'Reloj del ejemplo' });
            reloj.establecer(r.h, r.m);
            return h('figure', { class: 'leccion-figura leccion-figura--reloj' }, reloj.elemento, r.etiqueta && h('figcaption', {}, r.etiqueta));
        })));
    }
    if (opciones.length) {
        partes.push(h('ul', { class: 'leccion-opciones' }, opciones.map((o) =>
            h('li', { class: correcta !== null && String(o) === String(correcta) ? 'leccion-opcion leccion-opcion--correcta' : 'leccion-opcion' }, String(o)))));
    }
    return h('div', { class: 'leccion-ejemplo' }, partes);
}

const DIBUJANTES = { bloques, recta, grupos, operacion, ejemplo };

/** @returns {HTMLElement|null} el dibujo del `visual` o null si el tipo no se conoce */
export function dibujarVisual(visual) {
    const f = DIBUJANTES[visual.tipo];
    return f ? f(visual) : null;
}
