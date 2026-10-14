/**
 * Colocación: decidir SOLO, sin que nadie lo configure, desde qué NIVEL DE CONTENIDO debe empezar cada niño.
 *
 * Contexto: en la primera prueba con niños de 6.º casi ninguno dominaba el contenido de su grado. La v1 asumía que sí
 * (el grado del perfil decidía el contenido), así que no había dónde empezar. Ahora el contenido se mide por
 * «grado de contenido» (1.º–6.º) independiente del grado del niño:
 *
 *   1. MISIÓN DE INICIO (la primera vez que juega cada juego): una escalera de pocas preguntas que sube o baja de
 *      grado de contenido según acierte o falle, y se queda donde el niño empieza a fallar. Se presenta como aventura.
 *   2. AJUSTE después de cada partida normal: si la partida muestra que sobra o falta, se mueve UN grado.
 *
 * Todo es lógica pura (sin DOM, sin tiempo): se prueba con números. Los umbrales son heurísticas explicables, no un modelo.
 */

/** Preguntas de la misión de inicio: suficientes para encontrar el nivel, pocas para no cansar. */
export const PREGUNTAS_COLOCACION = 8;
/** Aciertos seguidos (a la primera) para subir un grado de contenido durante la misión. */
export const ACIERTOS_PARA_SUBIR = 2;

/** Ajuste tras una partida: por debajo de este crédito y con las habilidades en lo más fácil, baja. */
export const UMBRAL_BAJAR = 0.4;
/** Por encima de este crédito y con las habilidades en lo más difícil, sube. */
export const UMBRAL_SUBIR = 0.9;

const acotar = (v, min, max) => Math.min(Math.max(v, min), max);

/**
 * Dónde empieza la misión. No en el grado más alto: empezar un poco por debajo es más amable (el primer contacto
 * debe ser un éxito) y la escalera sube sola si el niño sabe más. Con la brecha observada (niños de 6.º que no
 * dominan su grado), dos grados por debajo es un punto de partida razonable.
 */
export function gradoInicialColocacion(gradoMin, gradoMax) {
    return Math.max(gradoMin, gradoMax - 2);
}

/**
 * Un paso de la escalera de la misión.
 *  - 2 aciertos seguidos a la primera → sube un grado de contenido.
 *  - un error → baja un grado; si es el SEGUNDO error seguido, baja dos (encuentra el piso más rápido y el niño
 *    no pasa muchas preguntas seguidas fallando).
 * @param {{grado:number, aciertosSeguidos:number, erroresSeguidos:number}} estado
 * @returns {{grado:number, aciertosSeguidos:number, erroresSeguidos:number}}
 */
export function avanzarEscalon({ grado, aciertosSeguidos, erroresSeguidos }, acerto, gradoMin, gradoMax) {
    if (acerto) {
        const seguidos = aciertosSeguidos + 1;
        if (seguidos >= ACIERTOS_PARA_SUBIR) {
            return { grado: acotar(grado + 1, gradoMin, gradoMax), aciertosSeguidos: 0, erroresSeguidos: 0 };
        }
        return { grado, aciertosSeguidos: seguidos, erroresSeguidos: 0 };
    }
    const errores = erroresSeguidos + 1;
    const baja = errores >= 2 ? 2 : 1;
    return { grado: acotar(grado - baja, gradoMin, gradoMax), aciertosSeguidos: 0, erroresSeguidos: errores };
}

/** Crédito de una partida (0..1): igual que las estrellas, los aciertos a la primera valen 1 y los recuperados ½. */
export function creditoPartida({ aciertos, fallos, recuperadas = 0 }) {
    const total = aciertos + fallos;
    return total === 0 ? 0 : (aciertos + recuperadas / 2) / total;
}

/** Promedio del nivel de las habilidades de una instantánea del motor ({habilidad:{nivel}}); null si no hay. */
export function nivelPromedio(instantanea) {
    const niveles = Object.values(instantanea || {}).map((h) => h && h.nivel).filter(Number.isInteger);
    return niveles.length === 0 ? null : niveles.reduce((a, b) => a + b, 0) / niveles.length;
}

/**
 * Tras una partida normal: ¿sube, baja o se queda el grado de contenido?
 *  - BAJA solo si le fue mal (crédito < 40 %) y además el motor ya lo tiene en el nivel más fácil de sus habilidades:
 *    es decir, ya se le dio la oportunidad de bajar de nivel DENTRO del grado y sigue sin poder.
 *  - SUBE solo si le fue muy bien (≥ 90 %) y domina el nivel MÁS difícil de las habilidades de este grado:
 *    avanzar de grado sin haber recorrido los niveles sería saltarse contenido.
 * Nunca sale del rango [gradoMin, gradoMax] y mueve como máximo un grado por partida.
 *
 * @param {Object} p
 * @param {number} p.grado        grado de contenido actual
 * @param {number} p.gradoMin
 * @param {number} p.gradoMax     tope: normalmente el grado del niño (no se le sube por encima de lo que le toca)
 * @param {{aciertos:number, fallos:number, recuperadas?:number, habilidades?:Object}} p.resultado
 * @param {number} [p.nivelMax=3]
 * @returns {{grado:number, cambio:'subio'|'bajo'|null}}
 */
export function ajustarGradoContenido({ grado, gradoMin, gradoMax, resultado, nivelMax = 3 }) {
    const credito = creditoPartida(resultado);
    const promedio = nivelPromedio(resultado.habilidades);
    if (promedio === null) return { grado, cambio: null };
    if (credito < UMBRAL_BAJAR && promedio <= 1.5 && grado > gradoMin) return { grado: grado - 1, cambio: 'bajo' };
    if (credito >= UMBRAL_SUBIR && promedio >= nivelMax - 0.5 && grado < gradoMax) return { grado: grado + 1, cambio: 'subio' };
    return { grado, cambio: null };
}
