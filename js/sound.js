/**
 * Clase SoundManager - Gestiona todos los efectos de sonido del juego
 * Utiliza la Web Audio API para generar sonidos procedurales
 */
class SoundManager {
    constructor() {
        // Crear contexto de audio
        this.audioContext = null;
        this.enabled = true;
        this.masterVolume = 0.3;
        
        // Inicializar audio context (debe hacerse después de interacción del usuario)
        this.initAudioContext();
    }

    /**
     * Inicializa el contexto de audio
     */
    initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API no soportada');
            this.enabled = false;
        }
    }

    /**
     * Reanuda el contexto de audio (necesario en algunos navegadores)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Sonido de disparo láser
     */
    playLaserSound() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Configurar sonido láser
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            200,
            this.audioContext.currentTime + 0.1
        );

        // Envelope
        gainNode.gain.setValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.1
        );

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    /**
     * Sonido de explosión
     */
    playExplosionSound(size = 'medium') {
        if (!this.enabled || !this.audioContext) return;

        const duration = size === 'large' ? 0.5 : size === 'medium' ? 0.3 : 0.2;
        const volume = size === 'large' ? 0.6 : size === 'medium' ? 0.4 : 0.3;

        // Ruido blanco para la explosión
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generar ruido blanco
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;

        // Filtro para dar forma al sonido
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(
            100,
            this.audioContext.currentTime + duration
        );

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(this.masterVolume * volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + duration
        );

        // Conectar nodos
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + duration);
    }

    /**
     * Sonido del motor de la nave
     */
    playThrustSound() {
        if (!this.enabled || !this.audioContext) return;

        // Este sonido se reproduce continuamente mientras la nave acelera
        if (this.thrustOscillator) return; // Ya está sonando

        this.thrustOscillator = this.audioContext.createOscillator();
        this.thrustGain = this.audioContext.createGain();

        this.thrustOscillator.connect(this.thrustGain);
        this.thrustGain.connect(this.audioContext.destination);

        this.thrustOscillator.type = 'sawtooth';
        this.thrustOscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);

        // Modulación para efecto de motor
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.frequency.setValueAtTime(10, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(10, this.audioContext.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(this.thrustOscillator.frequency);
        lfo.start();

        this.thrustGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.thrustGain.gain.linearRampToValueAtTime(
            this.masterVolume * 0.2,
            this.audioContext.currentTime + 0.1
        );

        this.thrustOscillator.start(this.audioContext.currentTime);
    }

    /**
     * Detiene el sonido del motor
     */
    stopThrustSound() {
        if (!this.enabled || !this.audioContext || !this.thrustOscillator) return;

        this.thrustGain.gain.linearRampToValueAtTime(
            0,
            this.audioContext.currentTime + 0.1
        );

        this.thrustOscillator.stop(this.audioContext.currentTime + 0.1);
        this.thrustOscillator = null;
        this.thrustGain = null;
    }

    /**
     * Sonido de colisión con asteroide
     */
    playCollisionSound() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            50,
            this.audioContext.currentTime + 0.2
        );

        gainNode.gain.setValueAtTime(this.masterVolume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.2
        );

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    /**
     * Sonido de Game Over
     */
    playGameOverSound() {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            220,
            this.audioContext.currentTime + 0.5
        );
        oscillator.frequency.exponentialRampToValueAtTime(
            110,
            this.audioContext.currentTime + 1
        );

        gainNode.gain.setValueAtTime(this.masterVolume * 0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 1
        );

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 1);
    }

    /**
     * Alterna el sonido on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.thrustOscillator) {
            this.stopThrustSound();
        }
    }

    /**
     * Establece el volumen maestro
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}
