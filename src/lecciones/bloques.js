/**
 * Lecciones de valor posicional y llevadas con bloques (las de «Bloques de Valor»). Lógica pura: cada función recibe
 * los datos del problema GEMELO y devuelve una `Leccion`.
 *
 * Misma regla que en aritmetica.js: cada «hazlo tú» es «a ○ b = ?» (se recalcula en las pruebas) y el texto del mismo
 * paso nunca trae la respuesta. Se explica el PORQUÉ del cambio: 10 de una columna valen lo mismo que 1 de la siguiente.
 */
import { hazlo as crearHazlo, validarLeccion as validar, protegerRespuestas } from './leccion.js';
import { columnasSuma, columnasResta, partesPosicionales } from './aritmetica.js';

const validarLeccion = (leccion) => validar(protegerRespuestas(leccion));

const NOMBRES = ['unidades', 'decenas', 'centenas', 'unidades de millar', 'decenas de millar', 'centenas de millar'];
const NOMBRES_UNO = ['unidad', 'decena', 'centena', 'unidad de millar', 'decena de millar', 'centena de millar'];
const nombreDe = (cantidad, columna) => `${cantidad} ${cantidad === 1 ? NOMBRES_UNO[columna] : NOMBRES[columna]}`;

const digitos = (n) => String(n).split('').reverse().map(Number);

/** Visual de bloques para números de hasta dos cifras (el dibujo de lecciones muestra decenas y unidades). */
const bloquesDe = (...numeros) => ({ tipo: 'bloques', grupos: numeros.map((n) => ({ decenas: Math.floor(n / 10), unidades: n % 10, etiqueta: String(n) })) });

// ---------- Leer y armar ----------

function leccionNumero({ n }, { armar }) {
    const partes = partesPosicionales(n);
    const d = digitos(n);
    const dicho = d.map((c, i) => nombreDe(c, i)).reverse().join(', ');
    const pasos = [
        { texto: 'Cada columna vale 10 veces más que la de su derecha: unidades, decenas, centenas, unidades de millar… Por eso un bloque cambia de valor según la columna en que esté.', visual: n < 100 ? bloquesDe(n) : { tipo: 'ejemplo', enunciado: `${n} = ${partes.join(' + ')}` } },
        { texto: armar ? `Para armar un número se pone en cada columna la cantidad que dice: ${dicho}.` : `Para leer los bloques se cuentan los de cada columna: ${dicho}.` }
    ];
    if (partes.length >= 2) {
        const resto = partes.slice(1).reduce((s, p) => s + p, 0);
        pasos.push({
            texto: `Ahora junta el valor de las columnas. Primero la más alta y luego todo lo demás.`,
            hazlo: crearHazlo(`${partes[0]} + ${resto} = ?`, n, 'Suma el valor de la columna más alta con el de las demás.', partes[0] >= 100 ? 10 : 1)
        });
    }
    pasos.push({ texto: `El número es ${n}. Donde una columna no tiene bloques se escribe un 0, para que cada cifra quede en su lugar.` });
    return validarLeccion({ titulo: armar ? 'Armar un número por columnas' : 'Leer números con bloques', pasos });
}

// ---------- Valor de las cifras ----------

export function leccionPosicion(datos) {
    if (datos.partes) { // «5 000 + 300 + 2»: descomposición
        const { n, partes } = datos;
        const resto = partes.slice(1).reduce((s, p) => s + p, 0);
        return validarLeccion({
            titulo: 'De una suma de valores a un número',
            pasos: [
                { texto: 'Un número se puede escribir como la suma del valor de cada cifra. Para volver al número se coloca cada valor en su lugar.', visual: { tipo: 'ejemplo', enunciado: `${n} = ${partes.join(' + ')}` } },
                { texto: 'Junta los dos primeros términos y fíjate qué cifras quedan.', hazlo: crearHazlo(`${partes[0]} + ${partes[1]} = ?`, partes[0] + partes[1], 'Cada valor va en su propia columna: no se mezclan.', partes[1] >= 100 ? 10 : 1) },
                { texto: `${resto > 0 ? 'Con todos los términos' : 'Con el término'}, cada cifra queda en el lugar que le corresponde. Donde no hay término, va un 0: ${n}.` }
            ]
        });
    }
    if (datos.alto !== undefined) { // «4 centenas y 15 decenas»: reagrupar
        const { a, b, alto, bajo } = datos;
        return validarLeccion({
            titulo: 'Cuando una columna se pasa de 9',
            pasos: [
                { texto: `Una columna puede tener 10 o más. Esos grupos de 10 valen lo mismo que 1 de la columna de la izquierda: 10 ${NOMBRES[bajo]} = 1 ${NOMBRES_UNO[bajo + 1]}.`, visual: { tipo: 'ejemplo', enunciado: `${nombreDe(a, alto)} y ${nombreDe(b, bajo)}` } },
                { texto: `Primero, ¿cuánto valen ${nombreDe(b, bajo)}?`, hazlo: crearHazlo(`${b} × ${10 ** bajo} = ?`, b * 10 ** bajo, `Cada una vale ${10 ** bajo}.`, 10 ** bajo) },
                { texto: `Después se suma lo de la otra columna: ${a * 10 ** alto} + ${b * 10 ** bajo}.` }
            ]
        });
    }
    const { n, c, lugar } = datos; // «¿qué valor tiene el 4 en 3 482?»
    return validarLeccion({
        titulo: 'El valor de una cifra',
        pasos: [
            { texto: `Una cifra vale según el lugar donde está. En ${n}, el ${c} está en el lugar de las ${NOMBRES[lugar]}.`, visual: { tipo: 'ejemplo', enunciado: `${n}` } },
            { texto: `Cada lugar vale ${10 ** lugar} (hay ${lugar} ${lugar === 1 ? 'lugar' : 'lugares'} a su derecha). Así que el ${c} vale ${c} veces ${10 ** lugar}.`, hazlo: crearHazlo(`${c} × ${10 ** lugar} = ?`, c * 10 ** lugar, `Multiplica ${c} por ${10 ** lugar}.`, Math.max(1, 10 ** lugar)) },
            { texto: `La misma cifra puede valer ${c}, ${c * 10} o ${c * 100}: depende de su lugar.` }
        ]
    });
}

// ---------- Llevadas (suma con bloques) ----------

export function leccionLlevada({ a, b }) {
    const r = a + b;
    const cols = columnasSuma(a, b);
    const pasos = [{
        texto: 'Para sumar con bloques se juntan los de los dos números, columna por columna, empezando por las unidades. Si una columna llega a 10 o más, esos 10 se CAMBIAN por 1 bloque de la columna siguiente: valen lo mismo.',
        visual: a < 100 && b < 100 ? bloquesDe(a, b) : { tipo: 'operacion', signo: '+', arriba: String(a), abajo: String(b), resultado: '' }
    }];
    cols.forEach((c, i) => {
        const entra = c.llevaEntra > 0 && !c.soloLleva ? ` y ${c.llevaEntra} del cambio anterior` : '';
        const queda = c.soloLleva ? `Se queda ese bloque: ${c.escribe}.` : `${c.suma >= 10 ? `Son ${c.suma}: se cambian 10 bloques por 1 de la columna siguiente y quedan ${c.escribe}.` : `Quedan ${c.suma}.`}`;
        const paso = { texto: c.soloLleva ? `Queda el bloque que viene del cambio. ${queda}` : `Columna de las ${c.nombre}: ${c.x} + ${c.y}${entra}. ${queda}` };
        if (i === 0) {
            paso.texto = `Columna de las ${c.nombre}: ${c.x} + ${c.y}.`;
            paso.hazlo = { ...crearHazlo(`${c.x} + ${c.y} = ?`, c.suma, `Junta los bloques de las ${c.nombre}.`), explicacion: `${c.x} + ${c.y} = ${c.suma}. ${c.suma >= 10 ? `Son ${c.suma}: se cambian 10 bloques por 1 de la columna siguiente y quedan ${c.escribe}.` : `Quedan ${c.suma}, no hay nada que cambiar.`}` };
        }
        pasos.push(paso);
    });
    pasos[pasos.length - 1].texto += ` Resultado: ${a} + ${b} = ${r}.`;
    return validarLeccion({ titulo: 'Sumar con bloques: cambiar 10 por 1', pasos: pasos.slice(0, 8) });
}

// ---------- Préstamo (resta con bloques) ----------

export function leccionPrestamo({ a, b }) {
    const r = a - b;
    const cols = columnasResta(a, b);
    const pasos = [{
        texto: 'Para restar con bloques se ponen los del número de arriba y se quitan los del de abajo, columna por columna. Si en una columna no hay bloques suficientes, se CAMBIA 1 bloque de la columna de la izquierda por 10 de esta: valen lo mismo.',
        visual: a < 100 ? bloquesDe(a) : { tipo: 'operacion', signo: '−', arriba: String(a), abajo: String(b), resultado: '' }
    }];
    cols.forEach((c, i) => {
        const cambiado = c.prestadoQueda ? ` (menos 1 que se cambió por 10 en la columna anterior)` : '';
        const paso = { texto: `Columna de las ${c.nombre}: ${c.x}${cambiado}; hay que quitar ${c.y}.${c.pidePrestado ? ` No alcanzan: se cambia 1 bloque de la columna siguiente por 10 y quedan ${c.arriba}.` : ''} Se quitan ${c.y} y quedan ${c.resultado}.` };
        if (i === 0) {
            paso.texto = c.pidePrestado ? `Columna de las ${c.nombre}: hay ${c.x} y hay que quitar ${c.y}. No alcanzan: se cambia 1 bloque de la columna siguiente por 10.` : `Columna de las ${c.nombre}: ${c.x} − ${c.y}.`;
            paso.hazlo = { ...crearHazlo(`${c.arriba} − ${c.y} = ?`, c.resultado, `Quita ${c.y} de los ${c.arriba} que hay.`), explicacion: `${c.arriba} − ${c.y} = ${c.resultado}.` };
        }
        pasos.push(paso);
    });
    pasos[pasos.length - 1].texto += ` Resultado: ${a} − ${b} = ${r}. Para comprobar: ${r} + ${b} = ${a}.`;
    return validarLeccion({ titulo: 'Restar con bloques: cambiar 1 por 10', pasos: pasos.slice(0, 8) });
}

// ---------- Selector ----------

/** Lección de «Bloques de Valor» para una pregunta gemela; null si la habilidad no tiene lección propia. */
export function leccionBloques(habilidad, datos) {
    if (!datos) return null;
    switch (habilidad) {
        case 'leer': return leccionNumero(datos, { armar: false });
        case 'armar': return leccionNumero(datos, { armar: true });
        case 'posicion': return leccionPosicion(datos);
        case 'llevada': return leccionLlevada(datos);
        case 'prestamo': return leccionPrestamo(datos);
        default: return null;
    }
}
