/**
 * Formato de las LECCIONES: mini-explicaciones guiadas que el juego muestra en el momento en que el niño las necesita
 * (tras equivocarse, o la primera vez que aparece una habilidad).
 *
 * Una lección es DATOS, no código: una lista de pasos. Añadir una es escribir una lista; la pantalla (ui/leccion.js)
 * sabe dibujar cada tipo de `visual`. Esto separa QUÉ se enseña (aquí, probado con Node) de CÓMO se ve.
 *
 *   Leccion = { titulo, pasos: Paso[] }                      (de 1 a 8 pasos)
 *   Paso    = { texto, visual?: Visual, hazlo?: Hazlo }
 *   Hazlo   = { enunciado, opciones: (string|number)[], respuesta, pista }   «el niño hace este paso»
 *   Visual  = { tipo: 'bloques' | 'recta' | 'grupos' | 'operacion' | 'ejemplo', ...datos del tipo }
 *
 * Principio pedagógico (ver PLAN-V2): primero se VE cómo se hace con un ejemplo parecido, y en los pasos clave el niño
 * lo HACE él mismo («hazlo tú») antes de seguir. El ejemplo es un problema GEMELO (otros números): la lección no
 * regala la respuesta de la pregunta que el niño tiene delante.
 */

export const TIPOS_VISUAL = ['bloques', 'recta', 'grupos', 'operacion', 'ejemplo'];
export const MAX_PASOS = 8;

/**
 * Opciones para un «hazlo tú»: la respuesta y vecinos a distancia `paso` (1 para unidades, 10 para decenas: son los
 * errores típicos de contar uno de más o de menos). Orden ascendente (determinista: se puede probar sin azar). Siempre ≥ 2 distintas y positivas.
 */
export function opcionesCercanas(respuesta, cantidad = 3, paso = 1) {
    const candidatos = [respuesta, respuesta + paso, respuesta - paso, respuesta + 2 * paso, respuesta - 2 * paso, respuesta + 10, respuesta * 2];
    const unicas = [];
    for (const c of candidatos) if (Number.isInteger(c) && c >= 0 && !unicas.includes(c) && (c !== 0 || respuesta === 0)) unicas.push(c);
    const elegidas = [respuesta, ...unicas.filter((c) => c !== respuesta).slice(0, cantidad - 1)];
    return elegidas.sort((a, b) => a - b);
}

/** Atajo para construir un hazlo con opciones cercanas. */
export function hazlo(enunciado, respuesta, pista, paso = 1) {
    return { enunciado, opciones: opcionesCercanas(respuesta, 3, paso), respuesta, pista };
}

/**
 * Comprueba que una lección está bien formada. Lanza Error con el motivo (se usa en las pruebas y como red de
 * seguridad antes de mostrar una lección al niño: mejor no mostrarla que mostrar una rota).
 */
export function validarLeccion(leccion) {
    const fallo = (m) => { throw new Error(`Lección inválida: ${m}`); };
    if (!leccion || typeof leccion !== 'object') fallo('no es un objeto');
    if (typeof leccion.titulo !== 'string' || leccion.titulo.trim() === '') fallo('sin título');
    if (!Array.isArray(leccion.pasos) || leccion.pasos.length < 1 || leccion.pasos.length > MAX_PASOS) fallo(`debe tener de 1 a ${MAX_PASOS} pasos`);
    leccion.pasos.forEach((paso, i) => {
        const donde = `paso ${i + 1}`;
        if (typeof paso.texto !== 'string' || paso.texto.trim() === '') fallo(`${donde} sin texto`);
        if (/undefined|NaN|null|Infinity/.test(paso.texto)) fallo(`${donde} con texto roto: «${paso.texto}»`);
        if (paso.visual !== undefined && !TIPOS_VISUAL.includes(paso.visual.tipo)) fallo(`${donde} con visual desconocido`);
        if (paso.hazlo !== undefined) {
            const { opciones, respuesta, enunciado, pista } = paso.hazlo;
            if (typeof enunciado !== 'string' || enunciado === '' || typeof pista !== 'string' || pista === '') fallo(`${donde}: hazlo sin enunciado o pista`);
            if (paso.hazlo.explicacion !== undefined && typeof paso.hazlo.explicacion !== 'string') fallo(`${donde}: explicación inválida`);
            if (!Array.isArray(opciones) || opciones.length < 2 || new Set(opciones.map(String)).size !== opciones.length) fallo(`${donde}: opciones repetidas o insuficientes`);
            if (!opciones.map(String).includes(String(respuesta))) fallo(`${donde}: la respuesta no está entre las opciones`);
        }
    });
    return leccion;
}

/**
 * Un «hazlo tú» no sirve si el texto del mismo paso ya trae la respuesta. Esta función quita de cada paso con `hazlo`
 * la ecuación resuelta («40 + 20 = 60» → «40 + 20») y guarda la versión completa como `hazlo.explicacion`, que la
 * pantalla muestra DESPUÉS de que el niño acierta. Así el texto plantea y el niño resuelve.
 */
export function protegerRespuestas(leccion) {
    return {
        ...leccion,
        pasos: leccion.pasos.map((paso) => {
            if (!paso.hazlo) return paso;
            const completo = paso.hazlo.enunciado.replace('?', String(paso.hazlo.respuesta));
            const planteo = paso.hazlo.enunciado.replace(/ = \?$/, '');
            return {
                ...paso,
                texto: paso.texto.split(completo).join(planteo),
                hazlo: { ...paso.hazlo, explicacion: paso.hazlo.explicacion ?? `${completo}.` }
            };
        })
    };
}
