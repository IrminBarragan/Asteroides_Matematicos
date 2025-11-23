/**
 * Clase para ítems especiales
 * Principio SOLID: Single Responsibility - Solo maneja power-ups
 */

class ItemEspecial {
    constructor(tipo, x, y) {
        this.tipo = tipo;
        this.x = x;
        this.y = y;
        this.radio = 20;
        this.velocidad = 2;
        this.rotacion = 0;
        this.color = CONFIG.COLORES.ITEMS[tipo];
        this.icono = this.obtenerIcono();
    }

    /**
     * Obtiene el icono según el tipo de ítem
     */
    obtenerIcono() {
        const iconos = {
            [CONFIG.ITEMS.ESCUDO]: '🛡️',
            [CONFIG.ITEMS.RALENTIZAR]: '⏱️',
            [CONFIG.ITEMS.DOBLE_PUNTOS]: '⭐',
            [CONFIG.ITEMS.VIDA_EXTRA]: '❤️'
        };
        return iconos[this.tipo] || '?';
    }

    /**
     * Actualiza la posición del ítem
     */
    actualizar() {
        this.y += this.velocidad;
        this.rotacion += 0.05;
    }

    /**
     * Dibuja el ítem
     */
    dibujar(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotacion);

        // Aura brillante
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        // Círculo de fondo
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, this.radio, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Borde
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Icono (emoji)
        ctx.font = `${this.radio * 1.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icono, 0, 0);

        ctx.restore();
    }

    /**
     * Verifica si está fuera de pantalla
     */
    estaFueraDePantalla() {
        return this.y - this.radio > CONFIG.CANVAS.ALTO;
    }

    /**
     * Verifica colisión con un punto
     */
    colisionConPunto(x, y) {
        return Utilidades.puntoEnCirculo(x, y, this.x, this.y, this.radio);
    }

    /**
     * Obtiene la descripción del ítem
     */
    obtenerDescripcion() {
        const descripciones = {
            [CONFIG.ITEMS.ESCUDO]: 'Escudo Protector',
            [CONFIG.ITEMS.RALENTIZAR]: 'Ralentizar Tiempo',
            [CONFIG.ITEMS.DOBLE_PUNTOS]: 'Doble Puntos',
            [CONFIG.ITEMS.VIDA_EXTRA]: 'Vida Extra'
        };
        return descripciones[this.tipo] || 'Ítem Especial';
    }
}
