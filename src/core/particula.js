/**
 * Sistema de partículas para efectos visuales
 * Principio SOLID: Single Responsibility - Solo maneja partículas
 */
import { Utilidades } from './utilidades.js';

export class Particula {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = Utilidades.numeroAleatorioDecimal(-3, 3);
        this.vy = Utilidades.numeroAleatorioDecimal(-3, 3);
        this.radio = Utilidades.numeroAleatorioDecimal(2, 5);
        this.color = color;
        this.vida = 1.0;
        this.decaimiento = Utilidades.numeroAleatorioDecimal(0.02, 0.04);
    }

    /**
     * Actualiza la posición y estado de la partícula
     */
    actualizar() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // Gravedad
        this.vida -= this.decaimiento;
        return this.vida > 0;
    }

    /**
     * Dibuja la partícula
     */
    dibujar(ctx) {
        ctx.save();
        ctx.globalAlpha = this.vida;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Gestor de sistema de partículas
 */
export class SistemaParticulas {
    constructor() {
        this.particulas = [];
    }

    /**
     * Crea una explosión de partículas
     */
    crearExplosion(x, y, cantidad = 20, color = '#6b5ff7') {
        for (let i = 0; i < cantidad; i++) {
            this.particulas.push(new Particula(x, y, color));
        }
    }

    /**
     * Actualiza todas las partículas
     */
    actualizar() {
        this.particulas = this.particulas.filter(particula => particula.actualizar());
    }

    /**
     * Dibuja todas las partículas
     */
    dibujar(ctx) {
        this.particulas.forEach(particula => particula.dibujar(ctx));
    }

    /**
     * Limpia todas las partículas
     */
    limpiar() {
        this.particulas = [];
    }
}
