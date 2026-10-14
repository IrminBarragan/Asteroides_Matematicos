/**
 * Partida de preguntas con ANDAMIAJE QUE SE RETIRA (ver `apoyo.js`): cada habilidad lleva su propio nivel de ayuda, que
 * baja con cada acierto a la primera y sube con cada error. En la misión de inicio no hay ayuda: se mide, no se enseña.
 *
 * Es el modelo común de «Taller de Cálculo» y «Bloques de Valor»: cada juego aporta su generador de preguntas, sus
 * habilidades por grado y su lección propia.
 */
import { PartidaPreguntas } from './partidaPreguntas.js';
import { apoyoInicial, siguienteApoyo } from './apoyo.js';

export class PartidaConApoyo extends PartidaPreguntas {
    /**
     * @param {Object} p
     * @param {number} p.grado
     * @param {Function} p.generarPregunta   ({grado, habilidad, nivel, cantidad, aleatorio, apoyo}) → pregunta
     * @param {Function} p.habilidadesParaGrado
     * @param {Function} p.prepararRonda
     * @param {Object} p.nombresHabilidad
     * @param {Function} [p.leccion]
     * (el resto: igual que `PartidaPreguntas`)
     */
    constructor({ generarPregunta, habilidadesParaGrado, prepararRonda, colocacion = null, ...resto }) {
        const apoyos = {}; // habilidad → 'completo' | 'ligero' | 'ninguno' (la lee el generador de cada pregunta)
        super({
            ...resto,
            habilidades: habilidadesParaGrado(resto.grado),
            generar: (p) => {
                const apoyo = colocacion ? 'ninguno' : (apoyos[p.habilidad] ??= apoyoInicial(p.nivel));
                return generarPregunta({ ...p, apoyo });
            },
            preparar: prepararRonda,
            colocacion: colocacion && { ...colocacion, habilidadesDeGrado: habilidadesParaGrado }
        });
        this.apoyos = apoyos;
    }

    /** Ayuda que lleva la habilidad ahora mismo (para las pruebas y el resumen del maestro). */
    apoyoDe(habilidad) {
        return this.apoyos[habilidad] ?? null;
    }

    responder(id, opciones) {
        const habilidad = this.pregunta ? this.pregunta.habilidad : null;
        const habiaError = this.huboError;
        const r = super.responder(id, opciones);
        if (this.colocacion || !habilidad || !(habilidad in this.apoyos)) return r;
        if (r.tipo === 'incorrecta' && !habiaError) this.apoyos[habilidad] = siguienteApoyo(this.apoyos[habilidad], { acerto: false });
        else if (r.tipo === 'correcta' && r.primerIntento) this.apoyos[habilidad] = siguienteApoyo(this.apoyos[habilidad], { acerto: true });
        return r;
    }
}
