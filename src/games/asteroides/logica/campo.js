/**
 * Reglas del "campo de juego": cuántos asteroides, a qué velocidad y dónde aparecen.
 * Lógica pura (sin canvas), separada del dibujo para poder probarla.
 */
import { entre, mezclar } from '../../../core/aleatorio.js';

export const ANCHO = 900;
export const ALTO = 600;
export const RADIO_MIN = 34;
export const RADIO_MAX = 44;

/** Velocidad base (px por paso lógico de 1/60 s) por grado: los más chicos tienen más tiempo para leer. */
const VELOCIDAD_POR_GRADO = [0.55, 0.6, 0.7, 0.8, 0.9, 1.0];
const FACTOR_POR_NIVEL = [0.85, 1, 1.15];

/** Con el «modo tranquilo» los asteroides van al 60 % de la velocidad: más tiempo para pensar, sin presión. */
export const FACTOR_TRANQUILO = 0.6;

export function velocidadBase(grado, nivel, tranquilo = false) {
    const g = Math.min(Math.max(grado, 1), 6);
    const n = Math.min(Math.max(nivel, 1), 3);
    return VELOCIDAD_POR_GRADO[g - 1] * FACTOR_POR_NIVEL[n - 1] * (tranquilo ? FACTOR_TRANQUILO : 1);
}

/**
 * Cuántos asteroides (respuestas) aparecen. Pocos al inicio: más asteroides no es más aprendizaje,
 * es más ruido. Máximo 5 para que cada número se lea bien y quepa en la pantalla de un celular.
 */
export function cantidadAsteroides(grado, nivel, tranquilo = false) {
    const base = grado <= 2 ? 3 : 4;
    const normal = Math.min(base + (nivel >= 3 ? 1 : 0), 5);
    return tranquilo ? Math.max(3, normal - 1) : normal; // con 3 opciones aún hay sentido de elegir
}

/**
 * Reparte los asteroides en CARRILES verticales: cada uno cae por el suyo, así NUNCA se solapan
 * (el método anterior probaba posiciones al azar y, tras 50 intentos, aceptaba la última aunque se tocaran).
 * Garantía: con 5 carriles, la distancia mínima horizontal entre centros es 100 px > 2 × radio máximo (88).
 *
 * @returns {{x:number, y:number, radio:number}[]}  en orden de carril (de izquierda a derecha)
 */
export function colocarAsteroides(cantidad, aleatorio, { ancho = ANCHO, margen = 60 } = {}) {
    const carril = (ancho - 2 * margen) / cantidad;
    const holgura = Math.max(0, Math.floor(carril / 2 - RADIO_MAX - 6)); // cuánto puede desviarse sin invadir otro carril
    return Array.from({ length: cantidad }, (_, i) => {
        const radio = entre(aleatorio, RADIO_MIN, RADIO_MAX);
        return {
            x: margen + carril * (i + 0.5) + entre(aleatorio, -holgura, holgura),
            y: -radio - entre(aleatorio, 0, 60), // entradas escalonadas, pero todas aparecen en pocos segundos
            radio
        };
    });
}

/** Asigna las opciones a los carriles en orden aleatorio (la correcta no siempre cae por el mismo lado). */
export function repartirOpciones(opciones, aleatorio) {
    return mezclar(aleatorio, opciones);
}

// ---------- Poderes (se recogen tocándolos) ----------

export const PODERES = {
    lento: { nombre: 'Tiempo lento', duracion: 480 },       // pasos (8 s): asteroides a la mitad de velocidad
    doble: { nombre: 'Puntos dobles', duracion: 600 },      // pasos (10 s)
    mitad: { nombre: 'Mitad', duracion: 0 }                 // instantáneo: quita 2 respuestas incorrectas
};
const TIPOS_PODER = Object.keys(PODERES);

/** ¿Aparece un poder en esta pregunta? Nunca en la primera, y no en todas. */
export function poderParaPregunta(numero, aleatorio) {
    if (numero < 2 || aleatorio() > 0.3) return null;
    return TIPOS_PODER[Math.floor(aleatorio() * TIPOS_PODER.length)];
}
