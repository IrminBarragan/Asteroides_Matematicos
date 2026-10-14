/**
 * Colección de PEGATINAS (el «álbum»): cada partida terminada da una, y una más con 3 estrellas.
 * Motivación sin castigo: nunca se quita nada, solo se suma, y se gana por esforzarse (como las estrellas).
 *
 * Son 30 pegatinas = 6 dibujos × 5 colores. Su aspecto lo genera `ui/pegatinas.js` a partir de `describirPegatina`,
 * sin imágenes (cero peso, cero derechos de autor). Aquí solo está la lógica, probable con Node.
 */

export const GLIFOS = ['estrella', 'cohete', 'planeta', 'rayo', 'corazon', 'trofeo'];
export const COLORES = [
    { id: 'azul', nombre: 'azul', fondo: '#1d4ed8', claro: '#bfdbfe' },
    { id: 'naranja', nombre: 'naranja', fondo: '#c2410c', claro: '#fed7aa' },
    { id: 'verde', nombre: 'verde', fondo: '#15803d', claro: '#bbf7d0' },
    { id: 'morado', nombre: 'morado', fondo: '#7e22ce', claro: '#e9d5ff' },
    { id: 'rojo', nombre: 'rojo', fondo: '#b91c1c', claro: '#fecaca' }
];
export const NUM_PEGATINAS = GLIFOS.length * COLORES.length;

const NOMBRES_GLIFO = {
    estrella: ['Estrella', 'f'], cohete: ['Cohete', 'm'], planeta: ['Planeta', 'm'],
    rayo: ['Rayo', 'm'], corazon: ['Corazón', 'm'], trofeo: ['Trofeo', 'm']
};

/** id (0..29) → { id, glifo, color, nombre }. Los colores cambian más rápido: pegatinas seguidas se ven distintas. */
export function describirPegatina(id) {
    if (!Number.isInteger(id) || id < 0 || id >= NUM_PEGATINAS) throw new Error(`Pegatina inexistente: ${id}`);
    const glifo = GLIFOS[Math.floor(id / COLORES.length)];
    const color = COLORES[id % COLORES.length];
    const [nombre, genero] = NOMBRES_GLIFO[glifo];
    const adjetivo = genero === 'f' ? color.nombre.replace(/o$/, 'a') : color.nombre;
    return { id, glifo, color, nombre: `${nombre} ${adjetivo}` };
}

/** ¿Cuántas pegatinas da una partida? 1 por esforzarse (≥ 1 estrella), una más con las 3 estrellas. 0 si no resolvió nada. */
export function pegatinasGanadas(estrellas) {
    if (estrellas >= 3) return 2;
    return estrellas >= 1 ? 1 : 0;
}

/**
 * Elige una pegatina que el niño aún no tiene (al azar). null si ya las tiene todas.
 * @param {number[]} poseidas
 * @param {Function} aleatorio  () => [0,1)
 */
export function elegirPegatina(poseidas, aleatorio = Math.random) {
    const tiene = new Set(poseidas);
    const faltantes = [];
    for (let id = 0; id < NUM_PEGATINAS; id++) if (!tiene.has(id)) faltantes.push(id);
    if (faltantes.length === 0) return null;
    return faltantes[Math.floor(aleatorio() * faltantes.length)];
}

/** ¿Es una lista válida de pegatinas poseídas (enteros únicos del catálogo)? Para validar datos guardados. */
export function listaPegatinasValida(lista) {
    return Array.isArray(lista) && lista.every((id) => Number.isInteger(id) && id >= 0 && id < NUM_PEGATINAS) && new Set(lista).size === lista.length;
}
