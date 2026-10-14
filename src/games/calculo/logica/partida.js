/**
 * Partida de «Taller de Cálculo»: las reglas generales viven en `core/partidaPreguntas.js`; aquí se añade el
 * ANDAMIAJE QUE SE RETIRA (ver apoyo.js): cada habilidad lleva su propio nivel de ayuda, que baja con cada acierto a
 * la primera y sube con cada error. En la misión de inicio no hay ayuda: se mide lo que el niño sabe.
 */
import { PartidaPreguntas } from '../../../core/partidaPreguntas.js';
import { leccionAritmetica } from '../../../lecciones/aritmetica.js';
import { apoyoInicial, siguienteApoyo } from './apoyo.js';
import { generarPregunta, habilidadesParaGrado, prepararRonda, NOMBRES_HABILIDAD, GRADO_MIN, GRADO_MAX } from './generadores.js';

export {
    PREGUNTAS_POR_PARTIDA, PUNTOS_ACIERTO, PUNTOS_RECUPERADO, BONUS_RACHA, RACHA_PARA_BONUS
} from '../../../core/partidaPreguntas.js';

export class Partida extends PartidaPreguntas {
    constructor({ grado, habilidadesGuardadas = null, aleatorio = Math.random, total, colocacion = null }) {
        const g = Math.min(Math.max(grado, GRADO_MIN), GRADO_MAX);
        const apoyos = {}; // habilidad → 'completo' | 'ligero' | 'ninguno' (la lee el generador de cada pregunta)
        super({
            grado: g,
            habilidades: habilidadesParaGrado(g),
            generar: (p) => {
                const apoyo = colocacion ? 'ninguno' : (apoyos[p.habilidad] ??= apoyoInicial(p.nivel));
                return generarPregunta({ ...p, apoyo });
            },
            preparar: prepararRonda,
            habilidadesGuardadas,
            aleatorio,
            total,
            colocacion: colocacion && { ...colocacion, habilidadesDeGrado: habilidadesParaGrado },
            nombresHabilidad: NOMBRES_HABILIDAD,
            leccion: (gemela) => (gemela.habilidad === 'problemas' ? leccionAritmetica('problemas', gemela.datos) : leccionAritmetica(gemela.habilidad, gemela.datos))
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
