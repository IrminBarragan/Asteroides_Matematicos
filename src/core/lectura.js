/**
 * Tiempo para LEER un mensaje (explicaciones, pistas). Una explicación de 120 caracteres no se lee en 2 segundos:
 * el avance automático espera un tiempo proporcional al texto, con mínimo y máximo, y los juegos ofrecen además
 * un botón "Siguiente" para quien termina antes.
 */
export const MS_MIN_LECTURA = 2400;
export const MS_POR_LETRA = 55;
export const MS_MAX_LECTURA = 9000;

export function tiempoDeLectura(texto) {
    return Math.min(MS_MAX_LECTURA, Math.max(MS_MIN_LECTURA, texto.length * MS_POR_LETRA));
}
