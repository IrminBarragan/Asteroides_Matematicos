/**
 * Ayudas para construir DOM de forma SEGURA.
 *
 * Regla del proyecto: el texto que viene de datos (apodos, preguntas, palabras) se inserta SIEMPRE
 * como nodo de texto (createTextNode), nunca con innerHTML. Así un apodo como `<img onerror=...>`
 * se muestra como texto y no se ejecuta (XSS). `h()` aplica esta regla por diseño.
 *
 * Uso:  h('button', { class: 'boton', onClick: fn, 'aria-label': 'Cerrar' }, 'Texto', otroNodo)
 */
export function h(etiqueta, propiedades = {}, ...hijos) {
    const elemento = document.createElement(etiqueta);
    for (const [clave, valor] of Object.entries(propiedades || {})) {
        if (valor === null || valor === undefined || valor === false) continue;
        if (clave === 'class') {
            elemento.className = valor;
        } else if (clave.startsWith('on') && typeof valor === 'function') {
            elemento.addEventListener(clave.slice(2).toLowerCase(), valor);
        } else if (valor === true) {
            elemento.setAttribute(clave, '');
        } else {
            elemento.setAttribute(clave, String(valor));
        }
    }
    anexar(elemento, hijos);
    return elemento;
}

export function anexar(padre, hijos) {
    for (const hijo of hijos.flat(Infinity)) {
        if (hijo === null || hijo === undefined || hijo === false) continue;
        padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
    }
    return padre;
}

export function vaciar(elemento) {
    while (elemento.firstChild) elemento.removeChild(elemento.firstChild);
    return elemento;
}

/**
 * Crea un SVG a partir de un texto fijo escrito por nosotros (constantes del código, nunca datos del usuario).
 */
export function svgDesdeMarkup(markup) {
    const plantilla = document.createElement('template');
    plantilla.innerHTML = markup.trim();
    return plantilla.content.firstElementChild;
}
