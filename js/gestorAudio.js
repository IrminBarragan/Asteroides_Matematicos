/**
 * Gestor de Audio del Juego
 * Principio SOLID: Single Responsibility - Solo maneja audio
 */

class GestorAudio {
    constructor() {
        this.activo = false;
        this.contextoAudio = null;
        this.inicializado = false;
    }

    /**
     * Inicializa el contexto de audio
     */
    inicializar() {
        if (this.inicializado) return;
        
        try {
            this.contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
            this.inicializado = true;
        } catch (error) {
            console.warn('Audio no disponible:', error);
        }
    }

    /**
     * Activa o desactiva el audio
     */
    alternar() {
        this.activo = !this.activo;
        return this.activo;
    }

    /**
     * Reproduce un efecto de sonido sintético
     */
    reproducirEfecto(tipo) {
        if (!this.activo || !this.contextoAudio) return;

        const oscilador = this.contextoAudio.createOscillator();
        const ganancia = this.contextoAudio.createGain();
        
        oscilador.connect(ganancia);
        ganancia.connect(this.contextoAudio.destination);

        switch(tipo) {
            case 'explosion':
                this.efectoExplosion(oscilador, ganancia);
                break;
            case 'acierto':
                this.efectoAcierto(oscilador, ganancia);
                break;
            case 'fallo':
                this.efectoFallo(oscilador, ganancia);
                break;
            case 'laser':
                this.efectoLaser(oscilador, ganancia);
                break;
            case 'powerup':
                this.efectoPowerUp(oscilador, ganancia);
                break;
            case 'nivel':
                this.efectoNivel(oscilador, ganancia);
                break;
        }
    }

    /**
     * Efecto de explosión
     */
    efectoExplosion(oscilador, ganancia) {
        oscilador.type = 'sawtooth';
        oscilador.frequency.setValueAtTime(200, this.contextoAudio.currentTime);
        oscilador.frequency.exponentialRampToValueAtTime(50, this.contextoAudio.currentTime + 0.3);
        
        ganancia.gain.setValueAtTime(0.3, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.3);
        
        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.3);
    }

    /**
     * Efecto de acierto
     */
    efectoAcierto(oscilador, ganancia) {
        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(523.25, this.contextoAudio.currentTime);
        oscilador.frequency.setValueAtTime(659.25, this.contextoAudio.currentTime + 0.1);
        
        ganancia.gain.setValueAtTime(0.2, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.2);
        
        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.2);
    }

    /**
     * Efecto de fallo
     */
    efectoFallo(oscilador, ganancia) {
        oscilador.type = 'sawtooth';
        oscilador.frequency.setValueAtTime(200, this.contextoAudio.currentTime);
        oscilador.frequency.exponentialRampToValueAtTime(100, this.contextoAudio.currentTime + 0.2);
        
        ganancia.gain.setValueAtTime(0.3, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.2);
        
        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.2);
    }

    /**
     * Efecto de láser
     */
    efectoLaser(oscilador, ganancia) {
        oscilador.type = 'square';
        oscilador.frequency.setValueAtTime(800, this.contextoAudio.currentTime);
        oscilador.frequency.exponentialRampToValueAtTime(100, this.contextoAudio.currentTime + 0.1);
        
        ganancia.gain.setValueAtTime(0.2, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.1);
        
        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.1);
    }

    /**
     * Efecto de power-up
     */
    efectoPowerUp(oscilador, ganancia) {
        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(261.63, this.contextoAudio.currentTime);
        oscilador.frequency.setValueAtTime(329.63, this.contextoAudio.currentTime + 0.1);
        oscilador.frequency.setValueAtTime(392.00, this.contextoAudio.currentTime + 0.2);
        
        ganancia.gain.setValueAtTime(0.3, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.3);
        
        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.3);
    }

    /**
     * Efecto de cambio de nivel
     */
    efectoNivel(oscilador, ganancia) {
        oscilador.type = 'triangle';
        oscilador.frequency.setValueAtTime(440, this.contextoAudio.currentTime);
        oscilador.frequency.setValueAtTime(880, this.contextoAudio.currentTime + 0.2);
        
        ganancia.gain.setValueAtTime(0.3, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.4);
        
        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.4);
    }
}
