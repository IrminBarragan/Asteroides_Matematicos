/**
 * Exportación a CSV para el modo maestro.
 *
 * Seguridad: un apodo como `=HYPERLINK("http://malo")` abierto en Excel se ejecuta como fórmula
 * ("CSV injection"). Por eso los textos que empiezan con = + - @ (o tabulador/retorno) se
 * neutralizan anteponiendo una comilla simple. Los números no se tocan.
 */
export function neutralizarFormula(valor) {
    if (typeof valor !== 'string') return valor;
    return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

function celda(valor) {
    if (valor === null || valor === undefined) return '';
    const texto = String(neutralizarFormula(valor));
    return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * @param {string[]} encabezados
 * @param {Array<Array<string|number|null>>} filas
 * @returns {string} CSV con BOM UTF-8 (para que Excel muestre bien los acentos) y saltos CRLF
 */
export function aCSV(encabezados, filas) {
    const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(','));
    return '﻿' + lineas.join('\r\n') + '\r\n';
}
