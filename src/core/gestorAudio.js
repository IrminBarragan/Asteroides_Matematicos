/**
 * Gestor de Audio del Juego
 * Principio SOLID: Single Responsibility - Solo maneja audio
 */

export class GestorAudio {
    constructor() {
        this.activo = false;
        this.contextoAudio = null;
        this.inicializado = false;
        this.oyentes = new Set();
    }

    /**
     * Avisa cada vez que un juego pide un efecto (acierto, fallo, nivel…), suene o no: así el resto de la interfaz
     * (la mascota, el confeti) reacciona sin que cada juego tenga que llamarlos. Devuelve la función para dejar de oír.
     */
    alEfecto(oyente) {
        this.oyentes.add(oyente);
        return () => this.oyentes.delete(oyente);
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
     * Los navegadores crean el contexto "suspendido" hasta que hay un gesto del usuario.
     * Llamar a esto dentro de un clic lo despierta.
     */
    reanudar() {
        if (this.contextoAudio && this.contextoAudio.state === 'suspended') {
            this.contextoAudio.resume();
        }
    }

    /**
     * Fija el estado del audio (para restaurar el ajuste guardado del perfil).
     */
    establecerActivo(activo) {
        this.activo = Boolean(activo);
        return this.activo;
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
        for (const oyente of this.oyentes) {
            try { oyente(tipo); } catch (error) { console.warn('Error en un oyente de efectos:', error); }
        }
        if (!this.activo || !this.contextoAudio) return;
        if (!['explosion', 'acierto', 'fallo', 'laser', 'powerup', 'nivel', 'victoria', 'voltear', 'clic', 'estrella'].includes(tipo)) return;

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
            case 'victoria': // el mismo sonido; son tipos distintos para que la interfaz distinga «subió de nivel» de «terminó la partida»
                this.efectoNivel(oscilador, ganancia);
                break;
            case 'voltear':
                this.efectoVoltear(oscilador, ganancia);
                break;
            case 'clic':
                this.efectoClic(oscilador, ganancia);
                break;
            case 'estrella':
                this.efectoEstrella(oscilador, ganancia);
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
     * Efecto suave y corto (voltear una carta)
     */
    efectoVoltear(oscilador, ganancia) {
        oscilador.type = 'triangle';
        oscilador.frequency.setValueAtTime(520, this.contextoAudio.currentTime);
        oscilador.frequency.exponentialRampToValueAtTime(380, this.contextoAudio.currentTime + 0.07);

        ganancia.gain.setValueAtTime(0.12, this.contextoAudio.currentTime);
        ganancia.gain.exponentialRampToValueAtTime(0.01, this.contextoAudio.currentTime + 0.08);

        oscilador.start(this.contextoAudio.currentTime);
        oscilador.stop(this.contextoAudio.currentTime + 0.08);
    }

    /** Tic suave de un botón (muy corto y bajito: se oye en cada toque). */
    efectoClic(oscilador, ganancia) {
        const t = this.contextoAudio.currentTime;
        oscilador.type = 'triangle';
        oscilador.frequency.setValueAtTime(700, t);
        oscilador.frequency.exponentialRampToValueAtTime(500, t + 0.04);
        ganancia.gain.setValueAtTime(0.08, t);
        ganancia.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        oscilador.start(t);
        oscilador.stop(t + 0.05);
    }

    /** Destello al ganar una estrella o una pegatina: dos notas que suben. */
    efectoEstrella(oscilador, ganancia) {
        const t = this.contextoAudio.currentTime;
        oscilador.type = 'sine';
        oscilador.frequency.setValueAtTime(784, t);
        oscilador.frequency.setValueAtTime(1175, t + 0.09);
        ganancia.gain.setValueAtTime(0.15, t);
        ganancia.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
        oscilador.start(t);
        oscilador.stop(t + 0.28);
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
