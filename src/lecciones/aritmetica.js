/**
 * Lecciones de aritmética: sumar, restar, multiplicar, dividir, orden de operaciones, múltiplos y decimales.
 * Lógica pura: cada función recibe los números del ejemplo (los de un problema GEMELO) y devuelve una `Leccion`.
 *
 * Reglas de redacción:
 *  - Cada «hazlo tú» tiene la forma «a ○ b = ?» (suma, resta, ×, ÷): así las pruebas pueden recalcularlo por su cuenta.
 *  - Se explica el PORQUÉ (descomponer, completar 10, repartir), no solo el procedimiento.
 *  - Sin tono infantil: los usuarios incluyen niños de 11–12 años que repasan contenido de grados menores.
 */
import { hazlo as crearHazlo, validarLeccion as validar, protegerRespuestas } from './leccion.js';

/** Valida y, antes, quita de cada paso con «hazlo tú» la respuesta que el propio texto trajera. */
const validarLeccion = (leccion) => validar(protegerRespuestas(leccion));

const NOMBRES_COLUMNA = ['unidades', 'decenas', 'centenas', 'unidades de millar', 'decenas de millar', 'centenas de millar'];

const digitos = (n) => String(n).split('').reverse().map(Number); // [unidades, decenas, ...]
const hazloEn = (enunciado, respuesta, pista, paso = 1) => crearHazlo(enunciado, respuesta, pista, paso);

/** 475 → [400, 70, 5] (partes no nulas, de mayor a menor). */
export function partesPosicionales(n) {
    return digitos(n).map((d, i) => d * 10 ** i).filter((v) => v > 0).reverse();
}

const unir = (partes) => partes.join(' + ');

// ---------- Suma ----------

export function columnasSuma(a, b) {
    const da = digitos(a);
    const db = digitos(b);
    const total = Math.max(da.length, db.length);
    const columnas = [];
    let lleva = 0;
    for (let i = 0; i < total; i++) {
        const x = da[i] ?? 0;
        const y = db[i] ?? 0;
        const s = x + y + lleva;
        columnas.push({ nombre: NOMBRES_COLUMNA[i], x, y, llevaEntra: lleva, suma: s, escribe: s % 10, llevaSale: Math.floor(s / 10) });
        lleva = Math.floor(s / 10);
    }
    if (lleva > 0) columnas.push({ nombre: NOMBRES_COLUMNA[total], x: 0, y: 0, llevaEntra: lleva, suma: lleva, escribe: lleva, llevaSale: 0, soloLleva: true });
    return columnas;
}

export function leccionSuma({ a, b }) {
    const r = a + b;
    if (r <= 10) {
        return validarLeccion({
            titulo: 'Sumar es juntar',
            pasos: [
                { texto: `Sumar ${a} + ${b} es juntar las dos cantidades. En la recta numérica, empezamos en ${a} y avanzamos ${b} lugares.`, visual: { tipo: 'recta', desde: 0, hasta: Math.max(10, r), saltos: [{ de: a, a: r, etiqueta: `+${b}` }], marcas: [a, r] } },
                { texto: `Contamos los saltos uno por uno: ¿en qué número caemos?`, hazlo: hazloEn(`${a} + ${b} = ?`, r, `Empieza en ${a} y cuenta ${b} más.`) },
                { texto: `Entonces ${a} + ${b} = ${r}.` }
            ]
        });
    }
    if (a < 10 && b < 10) { // pasa de 10: completar la decena
        const falta = 10 - a;
        const resto = b - falta;
        return validarLeccion({
            titulo: 'Completar 10 para sumar',
            pasos: [
                { texto: `Para sumar ${a} + ${b}, primero completamos 10: es más fácil sumar sobre un 10 redondo.`, visual: { tipo: 'recta', desde: 0, hasta: Math.max(r, 12), saltos: [{ de: a, a: 10, etiqueta: `+${falta}` }, { de: 10, a: r, etiqueta: `+${resto}` }], marcas: [a, 10, r] } },
                { texto: `A ${a} le faltan ${falta} para completar la decena. Esos ${falta} los tomamos de ${b}, y de ${b} sobran ${resto}.`, hazlo: hazloEn(`${a} + ${falta} = ?`, 10, `Cuántos le faltan a ${a} para llegar a 10.`) },
                { texto: `Ahora sumamos lo que sobró: 10 + ${resto} = ${r}.`, hazlo: hazloEn(`10 + ${resto} = ?`, r, 'Sumar sobre un 10 redondo es fácil: 10 y los que sobran.') },
                { texto: `Por eso ${a} + ${b} = ${r}.` }
            ]
        });
    }
    if (a < 100 && b < 100) { // por partes: decenas y unidades
        const Da = Math.floor(a / 10);
        const Ua = a % 10;
        const Db = Math.floor(b / 10);
        const Ub = b % 10;
        const decenas = (Da + Db) * 10;
        const unidades = Ua + Ub;
        return validarLeccion({
            titulo: 'Sumar por partes',
            pasos: [
                { texto: `Para sumar ${a} + ${b} separamos cada número en decenas y unidades.`, visual: { tipo: 'bloques', grupos: [{ decenas: Da, unidades: Ua, etiqueta: String(a) }, { decenas: Db, unidades: Ub, etiqueta: String(b) }] } },
                { texto: `Primero sumamos las decenas: ${Da * 10} + ${Db * 10} = ${decenas}.`, hazlo: hazloEn(`${Da * 10} + ${Db * 10} = ?`, decenas, 'Cuenta de 10 en 10.', 10) },
                { texto: `Ahora las unidades: ${Ua} + ${Ub} = ${unidades}.${unidades >= 10 ? ' ¡Pasan de 9! Con 10 unidades se forma otra decena.' : ''}`, hazlo: hazloEn(`${Ua} + ${Ub} = ?`, unidades, `Empieza en ${Ua} y cuenta ${Ub} más.`) },
                { texto: `Juntamos todo: ${decenas} + ${unidades} = ${r}.`, visual: { tipo: 'operacion', signo: '+', arriba: String(a), abajo: String(b), resultado: String(r) } }
            ]
        });
    }
    // columnas con llevadas
    const cols = columnasSuma(a, b);
    const pasos = [{ texto: `Con números grandes sumamos por columnas, de derecha a izquierda: unidades con unidades, decenas con decenas…, y «llevamos» cuando una columna pasa de 9.`, visual: { tipo: 'operacion', signo: '+', arriba: String(a), abajo: String(b), resultado: '' } }];
    cols.forEach((c, i) => {
        const llevada = c.llevaEntra > 0 && !c.soloLleva ? ` + ${c.llevaEntra} que llevábamos` : '';
        let texto;
        if (c.soloLleva) texto = `Queda la llevada: la escribimos al principio. ${c.escribe}.`;
        else texto = `Columna de las ${c.nombre}: ${c.x} + ${c.y}${llevada} = ${c.suma}. Escribimos ${c.escribe}${c.llevaSale > 0 ? ` y llevamos ${c.llevaSale}` : ''}.`;
        const paso = { texto, visual: { tipo: 'operacion', signo: '+', arriba: String(a), abajo: String(b), resultado: String(r).slice(String(r).length - 1 - i) } };
        if (i === 0) {
            paso.texto = `Columna de las ${c.nombre}: ${c.x} + ${c.y}.`;
            paso.hazlo = { ...hazloEn(`${c.x} + ${c.y} = ?`, c.suma, `Suma solo las ${c.nombre}.`), explicacion: texto };
        }
        pasos.push(paso);
    });
    pasos[pasos.length - 1].texto += ` Resultado: ${a} + ${b} = ${r}.`;
    return validarLeccion({ titulo: 'Sumar por columnas', pasos });
}

// ---------- Resta ----------

export function columnasResta(a, b) {
    const da = digitos(a);
    const db = digitos(b);
    const columnas = [];
    let presta = 0;
    for (let i = 0; i < da.length; i++) {
        const y = db[i] ?? 0;
        let arriba = da[i] - presta;
        let pidePrestado = 0;
        if (arriba < y) { arriba += 10; pidePrestado = 1; }
        columnas.push({ nombre: NOMBRES_COLUMNA[i], x: da[i], y, prestadoQueda: presta, arriba, resultado: arriba - y, pidePrestado });
        presta = pidePrestado;
    }
    return columnas;
}

export function leccionResta({ a, b }) {
    const r = a - b;
    if (a <= 20) {
        return validarLeccion({
            titulo: 'Restar es ver cuánto falta',
            pasos: [
                { texto: `Restar ${a} − ${b} es quitar ${b} de ${a}, o preguntar: ¿cuánto le falta a ${b} para llegar a ${a}?`, visual: { tipo: 'recta', desde: 0, hasta: Math.max(10, a), saltos: [{ de: b, a, etiqueta: `+${r}` }], marcas: [b, a] } },
                { texto: `Contamos los lugares que hay de ${b} a ${a}.`, hazlo: hazloEn(`${a} − ${b} = ?`, r, `Cuenta cuántos pasos hay de ${b} hasta ${a}.`) },
                { texto: `Entonces ${a} − ${b} = ${r}. ¡Y para comprobar: ${r} + ${b} = ${a}!` }
            ]
        });
    }
    if (a < 100) {
        const Db = Math.floor(b / 10);
        const Ub = b % 10;
        const tras = a - Db * 10;
        const cruza = tras % 10 < Ub;
        const pasos = [
            { texto: `Para restar ${a} − ${b}, quitamos ${b} en dos partes: primero las decenas (${Db * 10}) y luego las unidades (${Ub}).`, visual: { tipo: 'bloques', grupos: [{ decenas: Math.floor(a / 10), unidades: a % 10, etiqueta: String(a) }] } },
            { texto: `Primero quitamos las decenas: ${a} − ${Db * 10} = ${tras}.`, hazlo: hazloEn(`${a} − ${Db * 10} = ?`, tras, 'Quita de 10 en 10.', 10) }
        ];
        if (Ub > 0) {
            pasos.push({ texto: `Ahora quitamos las unidades: ${tras} − ${Ub} = ${r}.${cruza ? ` Como ${tras % 10} es menor que ${Ub}, tomamos una decena y la partimos en 10 unidades.` : ''}`, hazlo: hazloEn(`${tras} − ${Ub} = ?`, r, `Empieza en ${tras} y retrocede ${Ub}.`) });
        }
        pasos.push({ texto: `Resultado: ${a} − ${b} = ${r}. Comprobamos sumando: ${r} + ${b} = ${a}.`, visual: { tipo: 'operacion', signo: '−', arriba: String(a), abajo: String(b), resultado: String(r) } });
        return validarLeccion({ titulo: 'Restar por partes', pasos });
    }
    const cols = columnasResta(a, b);
    const pasos = [{ texto: `Con números grandes restamos por columnas, de derecha a izquierda. Si no se puede quitar, «pedimos prestado» una decena al vecino de la izquierda.`, visual: { tipo: 'operacion', signo: '−', arriba: String(a), abajo: String(b), resultado: '' } }];
    cols.forEach((c, i) => {
        let texto;
        if (c.pidePrestado) texto = `Columna de las ${c.nombre}: no se puede quitar ${c.y} de ${c.x - c.prestadoQueda}; pedimos prestado y tenemos ${c.arriba}. ${c.arriba} − ${c.y} = ${c.resultado}.`;
        else if (c.prestadoQueda) texto = `Columna de las ${c.nombre}: ${c.x} menos 1 que prestamos es ${c.x - 1}. ${c.x - 1} − ${c.y} = ${c.resultado}.`;
        else texto = `Columna de las ${c.nombre}: ${c.x} − ${c.y} = ${c.resultado}.`;
        const paso = { texto, visual: { tipo: 'operacion', signo: '−', arriba: String(a), abajo: String(b), resultado: String(r).padStart(cols.length, '0').slice(cols.length - 1 - i).replace(/^0+(?=\d)/, '') } };
        if (i === 0) {
            paso.texto = c.pidePrestado ? `Columna de las ${c.nombre}: no se puede quitar ${c.y} de ${c.x}; pedimos prestado una decena y tenemos ${c.arriba}.` : `Columna de las ${c.nombre}: ${c.x} − ${c.y}.`;
            paso.hazlo = { ...hazloEn(`${c.arriba} − ${c.y} = ?`, c.resultado, `Resta solo las ${c.nombre}${c.pidePrestado ? ' (ya con el préstamo)' : ''}.`), explicacion: texto };
        }
        pasos.push(paso);
    });
    pasos[pasos.length - 1].texto += ` Resultado: ${a} − ${b} = ${r}.`;
    return validarLeccion({ titulo: 'Restar por columnas', pasos });
}

// ---------- Multiplicación ----------

export function leccionMultiplicacion({ a, b }) {
    const r = a * b;
    const [chico, grande] = a <= b ? [a, b] : [b, a];
    if (grande <= 10) { // tablas: grupos iguales
        const pasos = [
            { texto: `Multiplicar es sumar el mismo número varias veces. ${chico} × ${grande} significa ${chico} grupos de ${grande}.`, visual: { tipo: 'grupos', grupos: chico, porGrupo: grande } }
        ];
        const repetido = { texto: `Es lo mismo que sumar ${grande} una y otra vez: ${Array(chico).fill(grande).join(' + ')}.` };
        if (chico >= 2) repetido.hazlo = hazloEn(`${grande} + ${grande} = ?`, grande * 2, `Es la tabla del 2 del ${grande}.`);
        pasos.push(repetido);
        if (grande > 5 && chico > 1) {
            pasos.push({ texto: `Truco con los dedos de una mano: ${grande} = 5 + ${grande - 5}. Así ${chico} × ${grande} = ${chico} × 5 + ${chico} × ${grande - 5}.`, hazlo: { ...hazloEn(`${chico} × 5 = ?`, chico * 5, 'La tabla del 5 termina en 0 o en 5.', 5), explicacion: `${chico} × 5 = ${chico * 5} y ${chico} × ${grande - 5} = ${chico * (grande - 5)}; luego ${chico * 5} + ${chico * (grande - 5)} = ${r}.` } });
        }
        pasos.push({ texto: `Resultado: ${chico} × ${grande} = ${r}. (Y ${grande} × ${chico} da lo mismo: el orden no cambia el resultado.)` });
        return validarLeccion({ titulo: 'Multiplicar es sumar grupos iguales', pasos });
    }
    // un factor grande: descomponer el mayor (o el segundo, si ambos son grandes)
    const bothBig = a >= 11 && b >= 11;
    // Si solo uno es grande se descompone ESE; si ambos lo son, se descompone el menor (menos partes)
    const [m, k] = bothBig ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
    const partes = partesPosicionales(k);
    const parciales = partes.map((p) => m * p);
    const pasos = [
        { texto: `Para ${a} × ${b}, descomponemos ${k} en ${partes.length > 1 ? unir(partes) : k} y multiplicamos ${m} por cada parte.`, visual: { tipo: 'ejemplo', enunciado: `${m} × ${k} = ${m} × (${unir(partes)})` } },
        { texto: `${m} × ${partes[0]} = ${parciales[0]}.`, hazlo: hazloEn(`${m} × ${partes[0]} = ?`, parciales[0], partes[0] % 10 === 0 ? `Multiplica ${m} × ${partes[0] / 10 ** (String(partes[0]).length - 1)} y agrega ceros.` : `Usa la tabla del ${m}.`, partes[0] % 10 === 0 ? 10 : 1) }
    ];
    if (partes.length > 1) {
        pasos.push({ texto: `Las otras partes: ${partes.slice(1).map((p, i) => `${m} × ${p} = ${parciales[i + 1]}`).join(' y ')}.` });
        pasos.push({ texto: `Sumamos los resultados parciales: ${unir(parciales)} = ${r}.`, visual: { tipo: 'ejemplo', enunciado: `${unir(parciales)} = ${r}` } });
    } else {
        pasos.push({ texto: `Resultado: ${a} × ${b} = ${r}.` });
    }
    return validarLeccion({ titulo: 'Multiplicar descomponiendo', pasos });
}

// ---------- División ----------

/** Trozos para dividir: 126 ÷ 6 → [{c:20, parte:120}, {c:1, parte:6}]. Toma «de a diez» primero y luego lo que sobra. */
export function trozosDivision(a, d) {
    const trozos = [];
    let resto = a;
    for (let p = String(a).length - 1; p >= 0 && resto > 0; p--) {
        const unidad = 10 ** p;
        const c = Math.floor(resto / (d * unidad)) * unidad;
        if (c > 0) { trozos.push({ c, parte: c * d }); resto -= c * d; }
    }
    return trozos;
}

export function leccionDivision({ a, d }) {
    const q = a / d;
    if (a <= 60) {
        return validarLeccion({
            titulo: 'Dividir es repartir',
            pasos: [
                { texto: `Dividir ${a} ÷ ${d} es repartir ${a} en ${d} grupos iguales y ver cuántos tocan en cada uno.`, visual: { tipo: 'grupos', grupos: d, porGrupo: q } },
                { texto: `La división es lo contrario de la multiplicación. Comprobemos el reparto: ${d} grupos con ${q} en cada uno.`, hazlo: hazloEn(`${d} × ${q} = ?`, a, `Piensa en la tabla del ${d}.`, d) },
                { texto: `Como ${d} × ${q} = ${a}, entonces ${a} ÷ ${d} = ${q}. ¡Siempre se puede comprobar multiplicando!` }
            ]
        });
    }
    const trozos = trozosDivision(a, d);
    const pasos = [
        { texto: `${a} ÷ ${d} es repartir ${a} entre ${d}. Con números grandes repartimos «por trozos» que sí conocemos de las tablas.`, visual: { tipo: 'ejemplo', enunciado: `${a} ÷ ${d} = ?` } },
        { texto: `Primer trozo: ${d} × ${trozos[0].c} es lo mayor que cabe en ${a} sin pasarnos.`, hazlo: hazloEn(`${d} × ${trozos[0].c} = ?`, trozos[0].parte, `Multiplica ${d} × ${trozos[0].c / (10 ** (String(trozos[0].c).length - 1))} y agrega ceros.`, trozos[0].c % 10 === 0 ? 10 : 1) }
    ];
    pasos[1].hazlo.explicacion = `${d} × ${trozos[0].c} = ${trozos[0].parte}, así que ${trozos[0].parte} ÷ ${d} = ${trozos[0].c}.`;
    if (trozos.length > 1) pasos.push({ texto: `Los demás trozos: ${trozos.slice(1).map((t) => `${d} × ${t.c} = ${t.parte}`).join('; ')}.` });
    pasos.push({ texto: `Sumamos lo que le toca a cada grupo: ${trozos.map((t) => t.c).join(' + ')} = ${q}. Entonces ${a} ÷ ${d} = ${q}.` });
    return validarLeccion({ titulo: 'Dividir por trozos', pasos });
}

// ---------- Orden de operaciones ----------

/** `datos.pasos`: [{ expr, nota }] que el generador ya calculó (la última expr es el resultado). */
export function leccionCombinadas({ pasos: calculo, primero }) {
    const pasos = [
        { texto: 'En una operación con varios signos hay un orden: 1.º lo que está entre paréntesis, 2.º las multiplicaciones y divisiones, 3.º las sumas y restas.', visual: { tipo: 'ejemplo', enunciado: calculo[0].expr } },
        { texto: `${calculo[0].nota}`, visual: { tipo: 'ejemplo', enunciado: calculo[0].expr }, ...(primero ? { hazlo: hazloEn(primero.enunciado, primero.respuesta, 'Haz solo esa operación.', primero.respuesta >= 20 ? 5 : 1) } : {}) }
    ];
    for (const c of calculo.slice(1, -1)) pasos.push({ texto: c.nota, visual: { tipo: 'ejemplo', enunciado: c.expr } });
    pasos.push({ texto: `Resultado: ${calculo[calculo.length - 1].expr}.`, visual: { tipo: 'ejemplo', enunciado: calculo.map((c) => c.expr).join('  →  ') } });
    return validarLeccion({ titulo: 'El orden de las operaciones', pasos });
}

// ---------- Múltiplos ----------

export function leccionMultiplos({ n }) {
    const lista = [1, 2, 3, 4, 5, 6].map((k) => n * k);
    return validarLeccion({
        titulo: 'Qué es un múltiplo',
        pasos: [
            { texto: `Los múltiplos de ${n} son los números de su tabla: ${lista.join(', ')}…`, visual: { tipo: 'recta', desde: 0, hasta: n * 6, saltos: lista.slice(0, 5).map((v, i) => ({ de: v, a: lista[i + 1], etiqueta: `+${n}` })), marcas: lista } },
            { texto: `Cada múltiplo es el anterior más ${n}. Después de ${n * 4}, ¿cuál sigue?`, hazlo: hazloEn(`${n} × 5 = ?`, n * 5, `Suma ${n} a ${n * 4}.`, n) },
            { texto: `Para saber si un número es múltiplo de ${n}, pregúntate: ¿está en la tabla del ${n}? O divídelo entre ${n}: si no sobra nada, es múltiplo.` }
        ]
    });
}

// ---------- Decimales ----------

const formatoDecimal = (v, decimales) => (v / 10 ** decimales).toFixed(decimales);

export function leccionDecimales({ a, b, decimales, esSuma }) {
    const A = formatoDecimal(a, decimales);
    const B = formatoDecimal(b, decimales);
    const r = esSuma ? a + b : a - b;
    const R = formatoDecimal(r, decimales);
    const signo = esSuma ? '+' : '−';
    const ultimaA = a % 10;
    const ultimaB = b % 10;
    const cruza = !esSuma && ultimaA < ultimaB;
    return validarLeccion({
        titulo: `${esSuma ? 'Sumar' : 'Restar'} números decimales`,
        pasos: [
            { texto: `Para ${esSuma ? 'sumar' : 'restar'} decimales se alinean los puntos: décimas con décimas, centésimas con centésimas…`, visual: { tipo: 'operacion', signo, arriba: A, abajo: B, resultado: '' } },
            {
                texto: `Se ${esSuma ? 'suma' : 'resta'} como si fueran números enteros, empezando por la última columna: ${esSuma ? `${ultimaA} + ${ultimaB} = ${ultimaA + ultimaB}` : cruza ? `${ultimaA + 10} − ${ultimaB} = ${ultimaA + 10 - ultimaB} (pedimos prestado)` : `${ultimaA} − ${ultimaB} = ${ultimaA - ultimaB}`}.`,
                hazlo: hazloEn(`${esSuma ? ultimaA : ultimaA + (cruza ? 10 : 0)} ${signo} ${ultimaB} = ?`, esSuma ? ultimaA + ultimaB : ultimaA + (cruza ? 10 : 0) - ultimaB, 'Es solo la columna de la derecha.')
            },
            { texto: `Al final, el punto del resultado se escribe justo debajo de los puntos: ${A} ${signo} ${B} = ${R}.`, visual: { tipo: 'operacion', signo, arriba: A, abajo: B, resultado: R } }
        ]
    });
}

// ---------- Selector ----------

/**
 * Lección de aritmética para una pregunta de Asteroides (gemela). `datos` lo produce cada generador.
 * @returns {Object|null} null si la habilidad no tiene lección propia
 */
export function leccionAritmetica(habilidad, datos) {
    if (!datos) return null;
    switch (habilidad) {
        case 'suma': return leccionSuma(datos);
        case 'resta': return leccionResta(datos);
        case 'multiplicacion': return leccionMultiplicacion(datos);
        case 'division': return leccionDivision(datos);
        case 'combinadas': return leccionCombinadas(datos);
        case 'multiplos': return leccionMultiplos(datos);
        case 'decimales': return leccionDecimales(datos);
        default: return null;
    }
}
