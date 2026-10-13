import { Juego } from '../../src/core/juego.js';

/**
 * Juego mínimo que demuestra el contrato: cuenta aciertos/fallos que le "llegan" y termina a los N intentos.
 * Lo usan las pruebas para verificar el ciclo de vida sin depender de DOM ni de un juego real.
 */
export class JuegoEjemplo extends Juego {
    static meta = {
        id: 'ejemplo',
        nombre: 'Juego de Ejemplo',
        descripcion: 'Demuestra el contrato de juego',
        area: 'matematicas',
        grados: [1, 2, 3]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aciertos = 0;
        this.fallos = 0;
        this.intentosMax = 3;
        this.llamadas = [];
        this.limpiezas = 0;
    }

    alMontar(contenedor, contexto) {
        this.llamadas.push('montar');
        contenedor.contenido = `grado ${contexto.grado}`;
    }

    alPausar() { this.llamadas.push('pausar'); }

    alReanudar() { this.llamadas.push('reanudar'); }

    alDestruir() {
        this.llamadas.push('destruir');
        this.limpiezas++;
        this.contenedor.contenido = null;
    }

    responder(correcta) {
        if (this.estado !== 'jugando') return;
        if (correcta) this.aciertos++; else this.fallos++;
        if (this.aciertos + this.fallos >= this.intentosMax) {
            this.finalizar({ aciertos: this.aciertos, fallos: this.fallos, tiempoMs: 1000 });
        }
    }
}
