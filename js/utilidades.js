/**
 * Utilidades generales del juego
 * Principio SOLID: Single Responsibility - Funciones auxiliares reutilizables
 */

const Utilidades = {
    /**
     * Genera un número aleatorio entre min y max
     */
    numeroAleatorio(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Genera un número decimal aleatorio entre min y max
     */
    numeroAleatorioDecimal(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Verifica colisión entre dos círculos
     */
    colisionCirculos(x1, y1, r1, x2, y2, r2) {
        const distancia = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        return distancia < (r1 + r2);
    },

    /**
     * Verifica colisión entre punto y círculo
     */
    puntoEnCirculo(px, py, cx, cy, radio) {
        const distancia = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        return distancia <= radio;
    },

    /**
     * Interpola entre dos valores
     */
    interpolar(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Clamp: limita un valor entre min y max
     */
    limitar(valor, min, max) {
        return Math.max(min, Math.min(max, valor));
    },

    /**
     * Convierte grados a radianes
     */
    gradosARadianes(grados) {
        return grados * Math.PI / 180;
    },

    /**
     * Formatea número con separadores de miles
     */
    formatearNumero(numero) {
        return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },

    /**
     * Genera un color aleatorio en formato hexadecimal
     */
    colorAleatorio() {
        const letras = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letras[Math.floor(Math.random() * 16)];
        }
        return color;
    }
};
