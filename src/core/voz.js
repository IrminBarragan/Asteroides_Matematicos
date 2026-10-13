/**
 * Lectura en voz alta (lectura asistida) con la API del navegador `speechSynthesis`.
 *
 * Pensada para 1.º y 2.º, donde leer el enunciado puede ser la parte difícil. Si el navegador o el sistema no tiene
 * voces (común en PCs de escuela con Windows viejo), `disponible` es false y la interfaz simplemente no muestra
 * los botones: el juego sigue funcionando igual. Nada aquí es imprescindible.
 *
 * Las dependencias se inyectan (`sintesis`, `Declaracion`) para probar sin navegador.
 */
import { fraccionEnPalabras } from './fracciones.js';

/**
 * Convierte el texto de pantalla en algo que un sintetizador lea bien:
 *   "3/4" → "3 cuartos" · "2 × 3" → "2 por 3" · "7 − 2" → "7 menos 2" · "a. m." → "de la mañana"
 * Sin esto, muchas voces dicen "tres barra cuatro" o ignoran los símbolos.
 */
export function textoParaVoz(texto) {
    return String(texto ?? '')
        .replace(/(\d+)\s*\/\s*(\d+)/g, (_, n, d) => fraccionEnPalabras({ n: Number(n), d: Number(d) }))
        .replace(/\s*×\s*/g, ' por ')
        .replace(/\s*÷\s*/g, ' entre ')
        .replace(/\s*[−–]\s*(?=\d)/g, ' menos ')
        .replace(/\s*\+\s*/g, ' más ')
        .replace(/\s*=\s*/g, ' igual a ')
        .replace(/\ba\. ?m\./gi, 'de la mañana')
        .replace(/\bp\. ?m\./gi, 'de la tarde')
        .replace(/(\d+)\.º/g, '$1 grado')
        .replace(/\s+/g, ' ')
        .trim();
}

const esEspanol = (v) => /^es([-_]|$)/i.test(String(v.lang || ''));

/**
 * Elige una voz en español: primero la de América (es-MX, es-419, es-US) y luego cualquier otra, y entre ellas
 * prefiere las LOCALES (`localService`): las voces en línea de algunos navegadores no suenan sin internet.
 * Devuelve null si no hay ninguna voz en español.
 */
export function elegirVoz(voces) {
    const lista = Array.from(voces || []).filter(esEspanol);
    const pesoIdioma = (v) => {
        const l = String(v.lang).toLowerCase().replace('_', '-');
        return ['es-mx', 'es-419', 'es-us'].findIndex((p) => l.startsWith(p));
    };
    const puntos = (v) => (v.localService === false ? 0 : 10) + (pesoIdioma(v) >= 0 ? 5 - pesoIdioma(v) : 0);
    return lista.sort((a, b) => puntos(b) - puntos(a))[0] || null;
}

export class Voz {
    constructor({ sintesis = globalThis.speechSynthesis, Declaracion = globalThis.SpeechSynthesisUtterance } = {}) {
        this.sintesis = sintesis || null;
        this.Declaracion = Declaracion || null;
        this.voces = [];
        this.cargarVoces();
        // Muchos navegadores cargan las voces DESPUÉS de arrancar y avisan con este evento
        if (this.sintesis && typeof this.sintesis.addEventListener === 'function') {
            this.sintesis.addEventListener('voiceschanged', () => this.cargarVoces());
        }
    }

    cargarVoces() {
        try {
            this.voces = this.sintesis && typeof this.sintesis.getVoices === 'function' ? Array.from(this.sintesis.getVoices()) : [];
        } catch { this.voces = []; }
    }

    /**
     * Hay síntesis de voz Y una voz en español. Un navegador con la API pero sin voces (típico de un Chromium recién
     * instalado, o de un Windows sin paquete de idioma) leería en silencio o en otro idioma: mejor no ofrecer los botones.
     */
    get disponible() {
        if (!this.sintesis || !this.Declaracion) return false;
        if (this.voces.length === 0) this.cargarVoces();
        return elegirVoz(this.voces) !== null;
    }

    /** Lee `texto` (cancelando lo que estuviera sonando). Devuelve true si se mandó a hablar. Nunca lanza. */
    leer(texto) {
        if (!this.disponible) return false;
        const dicho = textoParaVoz(texto);
        if (!dicho) return false;
        try {
            this.sintesis.cancel();
            const frase = new this.Declaracion(dicho);
            frase.lang = 'es-MX';
            frase.rate = 0.9; // un poco más lento que lo normal: los niños lo siguen mejor
            const voz = elegirVoz(this.voces);
            if (voz) { frase.voice = voz; frase.lang = voz.lang; }
            this.sintesis.speak(frase);
            return true;
        } catch (error) {
            console.warn('No se pudo leer en voz alta:', error);
            return false;
        }
    }

    detener() {
        if (!this.sintesis) return; // cancelar es inofensivo aunque no haya voces
        try { this.sintesis.cancel(); } catch { /* no hay nada que hacer */ }
    }
}
