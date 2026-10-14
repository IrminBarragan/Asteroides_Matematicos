/**
 * Lecciones de «Cajas y Reparto»: multiplicar como grupos y dividir como repartir. Casi todo se apoya en las
 * lecciones de multiplicación y división que ya existen (aritmetica.js); aquí solo está lo nuevo: el RESIDUO.
 *
 * Misma regla de siempre: cada «hazlo tú» es «a ○ b = ?» y el texto del mismo paso nunca trae la respuesta.
 */
import { hazlo as crearHazlo, validarLeccion as validar, protegerRespuestas } from './leccion.js';
import { leccionMultiplicacion, leccionDivision } from './aritmetica.js';

const validarLeccion = (leccion) => validar(protegerRespuestas(leccion));

/** Repartir cuando sobra: 13 entre 4 → a cada uno 3 y sobra 1. */
export function leccionResiduo({ N, d, q, r }) {
    const repartidos = d * q;
    return validarLeccion({
        titulo: 'Repartir cuando sobran',
        pasos: [
            {
                texto: `Repartimos ${N} entre ${d} grupos iguales, dando de uno en uno a cada grupo. Cuando ya no alcanza para dar a todos, lo que queda se llama residuo.`,
                visual: N <= 60 && q <= 12 ? { tipo: 'grupos', grupos: d, porGrupo: q } : { tipo: 'ejemplo', enunciado: `${N} ÷ ${d}` }
            },
            { texto: `A cada grupo le tocan ${q}. ¿Cuántos se repartieron entre todos?`, hazlo: crearHazlo(`${d} × ${q} = ?`, repartidos, `Son ${d} grupos de ${q}.`, d) },
            { texto: `Se tenían ${N} y se repartieron ${repartidos}. Lo que no se pudo repartir es el residuo.`, hazlo: crearHazlo(`${N} − ${repartidos} = ?`, r, 'Quita lo repartido de lo que había.') },
            { texto: `El residuo siempre es menor que el divisor: ${r} es menor que ${d}. Si fuera ${d} o más, todavía se podría dar uno más a cada grupo. Por eso ${N} ÷ ${d} da ${q} y sobran ${r}.` }
        ]
    });
}

/** Lección de «Cajas y Reparto» para una pregunta gemela; null si no hay lección propia. */
export function leccionCajas(habilidad, datos) {
    if (!datos) return null;
    switch (habilidad) {
        case 'grupos':
        case 'arreglo':
        case 'tabla':
            return leccionMultiplicacion({ a: datos.a, b: datos.b });
        case 'grande':
            return datos.tipo === 'div' ? leccionDivision({ a: datos.a, d: datos.d }) : leccionMultiplicacion({ a: datos.a, b: datos.b });
        case 'inversa':
            return leccionDivision({ a: datos.N, d: datos.d });
        case 'repartir':
            return datos.r > 0 ? leccionResiduo(datos) : leccionDivision({ a: datos.N, d: datos.d });
        default:
            return null;
    }
}
