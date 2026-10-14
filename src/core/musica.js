/**
 * Música de fondo SINTETIZADA en el navegador (Web Audio): sin archivos de audio.
 *
 * Por qué así: funciona sin internet, pesa unos KB y no hay derechos de autor que resolver (bajar música «gratis» y
 * meterla en un proyecto escolar es un riesgo de licencias). Costo: suena a sintetizador sencillo, no a orquesta.
 *
 * Dos capas, como en el resto del proyecto:
 *   - COMPOSICIÓN y PROGRAMACIÓN: lógica pura (sin audio, sin tiempo real): se prueba con números.
 *       · `componerPista` arma una melodía, un bajo y un arpegio sobre la progresión I–vi–IV–V en do mayor, con la
 *         escala PENTATÓNICA (do-re-mi-sol-la): casi cualquier combinación de sus notas suena bien, y no hay notas «raras».
 *       · `eventosEnVentana` dice qué notas suenan entre dos instantes (con la pista repetida en bucle).
 *   - REPRODUCTOR (`Musica`): programa esas notas en el AudioContext unos instantes antes de que toquen.
 *
 * La música es DECORACIÓN: si no hay audio, o no se permite, todo funciona igual y en silencio.
 */
import { crearAleatorioSembrado } from './aleatorio.js';

// ---------- Teoría mínima ----------

/** Frecuencia en Hz de una nota MIDI (la 69 es el la de 440 Hz). */
export const midiAFrecuencia = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Semitonos sobre la tónica de la escala pentatónica mayor: do, re, mi, sol, la. */
export const PENTATONICA = [0, 2, 4, 7, 9];

/** Progresión I – vi – IV – V en do mayor: raíz (MIDI) y tónica de cada acorde. */
export const ACORDES = [
    { raiz: 48, notas: [0, 4, 7] },   // C
    { raiz: 45, notas: [0, 3, 7] },   // Am (la, do, mi)
    { raiz: 41, notas: [0, 4, 7] },   // F
    { raiz: 43, notas: [0, 4, 7] }    // G
];

const TONICA = 60; // do central
export const PASOS_POR_COMPAS = 8;    // corcheas

/** ¿La nota (MIDI) pertenece a la escala pentatónica de do mayor (en cualquier octava)? */
export const esPentatonica = (midi) => PENTATONICA.includes(((midi - TONICA) % 12 + 12) % 12);

const RITMOS_MELODIA = [
    [2, 2, 2, 2], [1, 1, 2, 2, 2], [2, 1, 1, 2, 2], [3, 1, 2, 2], [4, 2, 2], [2, 2, 4], [1, 1, 1, 1, 2, 2], [2, 2, 1, 1, 2]
];

/**
 * Arma una pista en bucle. Determinista: la misma `semilla` da la misma música.
 * @param {{semilla:number, tempo:number, compases?:number, estilo?:'calmo'|'animado'}} p
 * @returns {{tempo:number, compases:number, notas:{paso:number, duracion:number, midi:number, voz:string}[]}}
 *   `paso`/`duracion` están en corcheas desde el inicio de la pista.
 */
export function componerPista({ semilla, tempo, compases = 8, estilo = 'calmo' }) {
    const az = crearAleatorioSembrado(semilla);
    const notas = [];
    // Registro de la melodía: las notas pentatónicas de las octavas 5 y 6 (do5 = 72 … la6 = 93)
    const registro = [];
    for (let octava = 0; octava < 2; octava++) for (const g of PENTATONICA) registro.push(TONICA + 12 + octava * 12 + g);
    let indice = Math.floor(registro.length / 2);

    for (let c = 0; c < compases; c++) {
        const acorde = ACORDES[c % ACORDES.length];
        const inicio = c * PASOS_POR_COMPAS;
        const ultimo = c === compases - 1;

        // Bajo: la raíz al principio y a media barra (el «pulso»)
        notas.push({ paso: inicio, duracion: 4, midi: acorde.raiz - 12, voz: 'bajo' });
        notas.push({ paso: inicio + 4, duracion: 4, midi: acorde.raiz - 12 + (estilo === 'animado' ? 7 : 0), voz: 'bajo' });

        // Arpegio suave (solo en el estilo animado): sube por las notas del acorde
        if (estilo === 'animado') {
            for (let i = 0; i < PASOS_POR_COMPAS; i++) {
                notas.push({ paso: inicio + i, duracion: 1, midi: acorde.raiz + 12 + acorde.notas[i % 3], voz: 'arpegio' });
            }
        }

        // Melodía: movimiento por grados cercanos, con tendencia a las notas del acorde
        const ritmo = RITMOS_MELODIA[Math.floor(az() * RITMOS_MELODIA.length)];
        let paso = inicio;
        ritmo.forEach((duracion, k) => {
            const tonos = new Set(acorde.notas.map((n) => ((acorde.raiz + n) % 12 + 12) % 12));
            if (k === 0 && c % 2 === 0) { // al empezar una frase, se apoya en una nota del acorde
                const candidatas = registro.map((m, i) => [m, i]).filter(([m]) => tonos.has(m % 12));
                if (candidatas.length) indice = candidatas.reduce((mejor, cur) => (Math.abs(cur[1] - indice) < Math.abs(mejor[1] - indice) ? cur : mejor))[1];
            } else {
                const salto = [-2, -1, -1, 0, 1, 1, 2][Math.floor(az() * 7)];
                indice = Math.min(Math.max(indice + salto, 0), registro.length - 1);
            }
            notas.push({ paso, duracion, midi: registro[indice], voz: 'melodia' });
            paso += duracion;
        });

        // El último compás termina en la tónica (do): sensación de «cierre» antes de repetir
        if (ultimo) {
            const melodia = notas.filter((n) => n.voz === 'melodia');
            const ultimaMelodia = melodia.at(-1);
            const previa = melodia.length > 1 ? melodia.at(-2).midi : TONICA + 12;
            // el do (72 u 84) más cercano a la nota anterior: el cierre no da un salto de dos octavas
            ultimaMelodia.midi = Math.abs(previa - (TONICA + 12)) <= Math.abs(previa - (TONICA + 24)) ? TONICA + 12 : TONICA + 24;
        }
    }
    return { tempo, compases, notas };
}

/** Segundos que dura una corchea (dos por pulso). */
export const segundosPorPaso = (tempo) => 60 / tempo / 2;

/** Duración total de una pista (un ciclo), en segundos. */
export const duracionDelCiclo = (pista) => pista.compases * PASOS_POR_COMPAS * segundosPorPaso(pista.tempo);

/**
 * Notas que EMPIEZAN en [desde, hasta) segundos, con la pista repetida en bucle desde el instante 0.
 * Ventanas consecutivas [a,b) [b,c)… no repiten ni pierden ninguna nota.
 * @returns {{t:number, duracion:number, midi:number, voz:string}[]}  `t` y `duracion` en segundos
 */
export function eventosEnVentana(pista, desde, hasta) {
    const paso = segundosPorPaso(pista.tempo);
    const ciclo = duracionDelCiclo(pista);
    const eventos = [];
    for (let vuelta = Math.floor(desde / ciclo); vuelta * ciclo < hasta; vuelta++) {
        for (const n of pista.notas) {
            const t = vuelta * ciclo + n.paso * paso;
            if (t >= desde && t < hasta) eventos.push({ t, duracion: n.duracion * paso, midi: n.midi, voz: n.voz });
        }
    }
    return eventos.sort((a, b) => a.t - b.t);
}

// ---------- Las pistas del portal ----------

export const PISTAS = {
    menu: { semilla: 11, tempo: 92, compases: 8, estilo: 'calmo' },
    juego: { semilla: 23, tempo: 108, compases: 8, estilo: 'animado' }
};

/** Fanfarria corta (no se repite): do–mi–sol–do alto. Notas MIDI con su duración en corcheas. */
export const FANFARRIA = { tempo: 132, notas: [[72, 1], [76, 1], [79, 1], [84, 3]] };

// ---------- Reproductor ----------

const FORMAS_DE_ONDA = { melodia: 'triangle', bajo: 'sine', arpegio: 'triangle' };
const GANANCIA_POR_VOZ = { melodia: 0.5, bajo: 0.7, arpegio: 0.14 };
const ADELANTO_S = 0.3;          // cuánto por delante se programan las notas
const PERIODO_MS = 100;          // cada cuánto se vuelve a programar
const FACTOR_ATENUADO = 0.3;     // volumen mientras alguien habla (lectura en voz alta, lección)

export class Musica {
    /**
     * @param {{contextoAudio:AudioContext|null}} audio   el GestorAudio (comparte el AudioContext)
     * @param {{programar?:Function, cancelar?:Function}} [reloj]  inyectable para pruebas (por omisión setInterval)
     */
    constructor(audio, { programar = (f, ms) => setInterval(f, ms), cancelar = (id) => clearInterval(id) } = {}) {
        this.audio = audio;
        this.programar = programar;
        this.cancelar = cancelar;
        this.volumen = 0.3;
        this.activa = false;
        this.nombre = null;
        this.pista = null;
        this.temporizador = null;
        this.maestro = null;
        this.inicio = 0;
        this.programadoHasta = 0;
        this.atenuadaHasta = 0;
        this.pausada = false;
    }

    get disponible() {
        return Boolean(this.audio && this.audio.contextoAudio);
    }

    get sonando() {
        return this.temporizador !== null;
    }

    establecerVolumen(v) {
        this.volumen = Math.min(Math.max(Number(v) || 0, 0), 1);
        this.aplicarVolumen();
    }

    establecerActiva(activa) {
        this.activa = Boolean(activa);
        if (!this.activa) this.detener();
    }

    /** Empieza (o cambia a) la pista `nombre` en bucle. Si ya es esa, no hace nada. */
    reproducir(nombre) {
        if (!this.activa || !this.disponible || !PISTAS[nombre]) return;
        if (this.nombre === nombre && this.sonando && !this.pausada) return;
        this.detener();
        const ctx = this.audio.contextoAudio;
        this.nombre = nombre;
        this.pista = componerPista(PISTAS[nombre]);
        this.maestro = ctx.createGain();
        this.maestro.connect(ctx.destination);
        this.aplicarVolumen();
        this.inicio = ctx.currentTime + 0.05;
        this.programadoHasta = 0;
        this.pausada = false;
        this.programarVentana();
        this.temporizador = this.programar(() => this.programarVentana(), PERIODO_MS);
    }

    /** Programa las notas de la ventana que viene. */
    programarVentana() {
        if (!this.pista || this.pausada) return;
        const ctx = this.audio.contextoAudio;
        const ahora = ctx.currentTime - this.inicio;
        const hasta = ahora + ADELANTO_S;
        const desde = Math.max(this.programadoHasta, ahora - 0.02);
        if (hasta <= desde) return;
        for (const e of eventosEnVentana(this.pista, desde, hasta)) this.tocar(e);
        this.programadoHasta = hasta;
    }

    tocar({ t, duracion, midi, voz }) {
        const ctx = this.audio.contextoAudio;
        const osc = ctx.createOscillator();
        const nota = ctx.createGain();
        osc.type = FORMAS_DE_ONDA[voz];
        osc.frequency.value = midiAFrecuencia(midi);
        const inicio = this.inicio + t;
        const fin = inicio + Math.max(0.08, duracion * 0.92);
        const pico = GANANCIA_POR_VOZ[voz];
        nota.gain.setValueAtTime(0.0001, inicio);
        nota.gain.linearRampToValueAtTime(pico, inicio + 0.02);
        nota.gain.exponentialRampToValueAtTime(0.0001, fin);
        osc.connect(nota);
        nota.connect(this.maestro);
        osc.start(inicio);
        osc.stop(fin + 0.02);
    }

    aplicarVolumen() {
        if (!this.maestro) return;
        const ctx = this.audio.contextoAudio;
        const factor = ctx.currentTime < this.atenuadaHasta ? FACTOR_ATENUADO : 1;
        this.maestro.gain.setTargetAtTime(this.volumen * factor, ctx.currentTime, 0.05);
    }

    /** Baja el volumen unos instantes (mientras alguien habla). */
    atenuar(ms = 4000) {
        if (!this.disponible) return;
        const ctx = this.audio.contextoAudio;
        this.atenuadaHasta = ctx.currentTime + ms / 1000;
        this.aplicarVolumen();
        // al terminar, el volumen vuelve solo
        if (this.maestro) this.maestro.gain.setTargetAtTime(this.volumen, this.atenuadaHasta, 0.3);
    }

    /** Pausa (silencio) sin perder la pista. */
    pausar() {
        if (!this.sonando || this.pausada) return;
        this.pausada = true;
        if (this.maestro) this.maestro.gain.setTargetAtTime(0, this.audio.contextoAudio.currentTime, 0.03);
    }

    reanudar() {
        if (!this.sonando || !this.pausada) return;
        this.pausada = false;
        // No hace falta «saltar» lo que habría sonado durante la pausa: programarVentana nunca programa en el pasado
        this.aplicarVolumen();
    }

    /** Para del todo (con un cierre suave). */
    detener() {
        if (this.temporizador !== null) this.cancelar(this.temporizador);
        this.temporizador = null;
        if (this.maestro) {
            const ctx = this.audio.contextoAudio;
            const viejo = this.maestro;
            viejo.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
            setTimeout(() => { try { viejo.disconnect(); } catch { /* ya estaba suelto */ } }, 600);
        }
        this.maestro = null;
        this.pista = null;
        this.nombre = null;
        this.pausada = false;
    }

    /** Fanfarria corta de victoria (suena aunque no haya música de fondo si el audio está activo). */
    fanfarria() {
        if (!this.activa || !this.disponible) return;
        const ctx = this.audio.contextoAudio;
        const paso = segundosPorPaso(FANFARRIA.tempo);
        const salida = ctx.createGain();
        salida.gain.value = Math.min(1, this.volumen * 1.4);
        salida.connect(ctx.destination);
        let t = ctx.currentTime + 0.05;
        for (const [midi, corcheas] of FANFARRIA.notas) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = midiAFrecuencia(midi);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.6, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + corcheas * paso);
            osc.connect(g); g.connect(salida);
            osc.start(t); osc.stop(t + corcheas * paso + 0.02);
            t += corcheas * paso;
        }
    }
}
