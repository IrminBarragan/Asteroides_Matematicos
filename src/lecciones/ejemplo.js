/**
 * Lección GENÉRICA «ejemplo resuelto», para cualquier juego de preguntas.
 *
 * Toma un problema GEMELO (otra pregunta de la misma habilidad, con otros datos) y enseña con lo que ya trae toda
 * pregunta: el enunciado, la pista (la clave), la explicación de la respuesta y los dibujos (figuras de fracciones,
 * relojes). Efecto pedagógico: el niño ve un ejemplo resuelto del mismo tipo y vuelve a intentar el suyo.
 *
 * Es la lección de respaldo cuando una habilidad no tiene una lección propia con material (ver aritmetica.js).
 */
import { validarLeccion } from './leccion.js';

export function leccionDeEjemplo(gemela, { titulo = 'Veamos un ejemplo' } = {}) {
    const figuras = (gemela.visuales || []).map((v) => ({ forma: v.forma, n: v.n, d: v.d, etiqueta: v.etiqueta }));
    const base = {
        tipo: 'ejemplo',
        enunciado: gemela.enunciado,
        ...(gemela.expresion && gemela.expresion.length ? { expresion: gemela.expresion } : {}),
        ...(figuras.length ? { figuras } : {}),
        ...(gemela.relojes && gemela.relojes.length ? { relojes: gemela.relojes } : {}),
        ...(gemela.opciones && gemela.opciones.length ? { opciones: gemela.opciones.map((o) => o.texto) } : {})
    };
    const pasos = [
        { texto: 'Mira este ejemplo parecido al tuyo (con otros datos).', visual: base },
        { texto: `La clave: ${gemela.pista}` }
    ];
    if (gemela.explicacion) {
        pasos.push({
            texto: `Así se resuelve: ${gemela.explicacion}`,
            visual: { ...base, correcta: gemela.textoRespuesta }
        });
    }
    pasos.push({ texto: 'Ahora vuelve a tu pregunta e inténtalo con lo que aprendiste.' });
    return validarLeccion({ titulo, pasos });
}
