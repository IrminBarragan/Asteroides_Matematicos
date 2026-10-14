import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarPregunta, habilidadesParaGrado, parNumeros, ESCALAS, HABILIDADES_POR_GRADO,
    hayLlevada, hayPrestamo, sumaSinLlevar, restaAlReves, cifras, sumaDeCifras, cantidadOpciones
} from '../src/games/calculo/logica/generadores.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

/*
 * Las comprobaciones NO usan el código que prueban: leen los números que el niño VE en la pantalla, recalculan
 * con aritmética propia y exigen que coincida (validar al generador con el generador no probaría nada).
 */

const SEMILLAS = 120;
const GRADOS = [1, 2, 3, 4, 5, 6];
const NIVELES = [1, 2, 3];
const ECUACION = /^(\d+) ([+−]) (\d+) = \?$/;

/** Hay llevada en a + b si, en alguna posición k, los restos de a y b módulo 10^k suman 10^k o más. */
const llevadaIndependiente = (a, b) => { for (let k = 1; k <= 8; k++) if ((a % 10 ** k) + (b % 10 ** k) >= 10 ** k) return true; return false; };
/** Hay préstamo en a − b si, en alguna posición k, el resto de a módulo 10^k es menor que el de b. */
const prestamoIndependiente = (a, b) => { for (let k = 1; k <= 8; k++) if ((a % 10 ** k) < (b % 10 ** k)) return true; return false; };
const sumaDigitos = (n) => [...String(n)].reduce((s, c) => s + Number(c), 0);

function paraTodas(fn) {
    for (const grado of GRADOS) {
        for (const habilidad of HABILIDADES_POR_GRADO[grado]) {
            for (const nivel of NIVELES) {
                for (let semilla = 1; semilla <= SEMILLAS; semilla++) {
                    const cantidad = semilla % 2 ? 3 : 4;
                    const apoyo = ['completo', 'ligero', 'ninguno'][semilla % 3];
                    const q = generarPregunta({ grado, habilidad, nivel, cantidad, apoyo, aleatorio: crearAleatorioSembrado(semilla * 97 + nivel) });
                    fn(q, { grado, habilidad, nivel, cantidad, apoyo, semilla });
                }
            }
        }
    }
}

test('cada pregunta: la respuesta, las opciones y los ids son coherentes', () => {
    paraTodas((q, c) => {
        const donde = `${c.habilidad} gc${c.grado} n${c.nivel} #${c.semilla}`;
        const ids = q.opciones.map((o) => o.id);
        assert.equal(q.opciones.length, c.cantidad, donde);
        assert.equal(new Set(ids).size, ids.length, `opciones repetidas ${donde}`);
        assert.equal(ids.filter((id) => id === q.respuesta).length, 1, `una sola correcta ${donde}`);
        for (const o of q.opciones) {
            assert.ok(Number.isInteger(o.id) && o.id >= 0, `id entero no negativo ${donde}`);
            assert.equal(o.texto, String(o.id), 'el texto de la opción es su id');
        }
        assert.equal(q.textoRespuesta, String(q.respuesta));
        assert.equal(q.habilidad, c.habilidad);
        assert.equal(q.apoyo, c.apoyo);
        assert.ok(q.pista.length > 10 && q.explicacion.length > 5);
        assert.doesNotMatch(`${q.enunciado}${q.pista}${q.explicacion}`, /undefined|NaN|null|Infinity/, donde);
    });
});

test('suma y resta: la respuesta es la que sale al recalcular con los números de la pantalla', () => {
    let vistas = 0;
    paraTodas((q, c) => {
        if (c.habilidad === 'problemas') return;
        const m = ECUACION.exec(q.enunciado);
        assert.ok(m, `formato «${q.enunciado}»`);
        const [a, b] = [Number(m[1]), Number(m[3])];
        const esperado = m[2] === '+' ? a + b : a - b;
        assert.equal(q.respuesta, esperado, q.enunciado);
        assert.equal(m[2] === '+', c.habilidad === 'suma', 'el signo corresponde a la habilidad');
        assert.deepEqual(q.datos, { a, b });
        if (c.habilidad === 'resta') assert.ok(a > b && esperado >= 1, 'la resta nunca da negativos ni cero');
        vistas++;
    });
    assert.ok(vistas > 3000);
});

test('el material coincide con la operación y respeta su capacidad', () => {
    paraTodas((q, c) => {
        if (c.habilidad === 'problemas') { assert.equal(q.material, null); assert.equal(q.tipo, 'opciones'); return; }
        const [, , a, b] = [0, 0, q.datos.a, q.datos.b];
        if (c.apoyo === 'ninguno') { assert.equal(q.material, null); assert.equal(q.tipo, 'opciones'); return; }
        const esc = ESCALAS[c.grado];
        assert.equal(q.tipo, esc.material);
        assert.equal(q.material.tipo, esc.material);
        assert.equal(q.material.operacion, c.habilidad);
        assert.equal(q.material.a, a);
        assert.equal(q.material.b, b);
        if (esc.material === 'marcos') {
            assert.ok(Math.max(a, c.habilidad === 'suma' ? a + b : a) <= esc.capacidad, 'cabe en los marcos');
            assert.equal(q.material.capacidad, esc.capacidad);
        } else {
            assert.equal(q.material.desde, a);
            assert.deepEqual(q.material.saltos, esc.saltos);
            // Con los saltos disponibles se llega a la respuesta: cada cifra de b tiene su salto
            assert.ok(b < 10 ** esc.saltos.length, 'b solo usa cifras que tienen salto');
            assert.ok(sumaDeCifras(b) <= 12, 'se llega con pocos saltos');
            const destino = c.habilidad === 'suma' ? a + b : a - b;
            assert.ok(destino >= 0 && destino <= q.material.maximo);
            assert.ok(a <= q.material.maximo);
        }
    });
});

test('1.º: todo cabe en 10 y los niveles suben el total', () => {
    const topes = { 1: [2, 5], 2: [6, 8], 3: [9, 10] };
    for (let semilla = 1; semilla <= 400; semilla++) {
        for (const nivel of NIVELES) {
            const az = crearAleatorioSembrado(semilla);
            const s = parNumeros('suma', 1, nivel, az);
            assert.ok(s.a >= 1 && s.b >= 1);
            assert.ok(s.a + s.b >= topes[nivel][0] && s.a + s.b <= topes[nivel][1], `suma nivel ${nivel}: ${s.a}+${s.b}`);
            const r = parNumeros('resta', 1, nivel, az);
            assert.ok(r.a >= topes[nivel][0] && r.a <= topes[nivel][1] && r.b >= 1 && r.b < r.a, `resta nivel ${nivel}: ${r.a}-${r.b}`);
        }
    }
});

test('2.º: el nivel 1 NO cruza la decena, el 2 SIEMPRE la cruza, el 3 mezcla; nunca pasa de 20', () => {
    const visto3 = { suma: new Set(), resta: new Set() };
    for (let semilla = 1; semilla <= 500; semilla++) {
        const az = crearAleatorioSembrado(semilla);
        for (const nivel of NIVELES) {
            const s = parNumeros('suma', 2, nivel, az);
            const cruzaS = Math.floor(s.a / 10) !== Math.floor((s.a + s.b - 1) / 10) || (s.a < 10 && s.a + s.b > 10);
            assert.ok(s.a + s.b <= 20 && s.a >= 2 && s.b >= 1, `${s.a}+${s.b}`);
            if (nivel === 1) assert.ok(s.a >= 10 && (s.a % 10) + s.b <= 9, `sin cruzar ${s.a}+${s.b}`);
            if (nivel === 2) assert.ok(s.a < 10 && s.b < 10 && s.a + s.b >= 11, `cruzando ${s.a}+${s.b}`);
            if (nivel === 3) visto3.suma.add(s.a < 10 ? 'cruza' : 'no');
            void cruzaS;
            const r = parNumeros('resta', 2, nivel, az);
            assert.ok(r.a >= 11 && r.a <= 19 && r.b >= 1 && r.b < r.a, `${r.a}-${r.b}`);
            if (nivel === 1) assert.ok(r.a - r.b >= 10, `sin cruzar ${r.a}-${r.b}`);
            if (nivel === 2) assert.ok(r.a - r.b < 10 && r.b > r.a % 10, `cruzando ${r.a}-${r.b}`);
            if (nivel === 3) visto3.resta.add(r.a - r.b >= 10 ? 'no' : 'cruza');
        }
    }
    assert.deepEqual([...visto3.suma].sort(), ['cruza', 'no'], 'el nivel 3 mezcla las dos');
    assert.deepEqual([...visto3.resta].sort(), ['cruza', 'no']);
});

test('3.º a 6.º: nivel 1 mueve una sola cifra; nivel 2 sin llevada ni préstamo; nivel 3 con llevada y préstamo', () => {
    for (const grado of [3, 4, 5, 6]) {
        const esc = ESCALAS[grado];
        const unidad = 10 ** (esc.saltos.length - 1);
        const tope = 10 ** esc.cifras;
        for (let semilla = 1; semilla <= 300; semilla++) {
            const az = crearAleatorioSembrado(semilla * 13 + grado);
            for (const operacion of ['suma', 'resta']) {
                for (const nivel of NIVELES) {
                    const { a, b } = parNumeros(operacion, grado, nivel, az);
                    const donde = `${operacion} gc${grado} n${nivel}: ${a}, ${b}`;
                    assert.ok(a >= 10 ** (esc.cifras - 1) && a < tope, `a tiene ${esc.cifras} cifras ${donde}`);
                    assert.ok(b >= 1 && b < 10 ** esc.saltos.length, `b alcanzable con los saltos ${donde}`);
                    if (operacion === 'suma') assert.ok(a + b < tope, `la suma no se sale de la escala ${donde}`);
                    else assert.ok(a > b, donde);
                    if (nivel === 1) {
                        assert.equal(a % unidad, 0, donde);
                        assert.equal(b % unidad, 0, donde);
                        assert.ok(b / unidad >= 1 && b / unidad <= 9, `b es de una sola cifra ${donde}`);
                    } else {
                        assert.notEqual(b % 10, 0, `b tiene unidades ${donde}`);
                        assert.ok(sumaDigitos(b) <= 12, donde);
                        const hay = operacion === 'suma' ? llevadaIndependiente(a, b) : prestamoIndependiente(a, b);
                        assert.equal(hay, nivel === 3, `${nivel === 3 ? 'debe' : 'no debe'} haber ${operacion === 'suma' ? 'llevada' : 'préstamo'}: ${donde}`);
                    }
                }
            }
        }
    }
});

test('las funciones de llevada y préstamo del módulo coinciden con la comprobación independiente', () => {
    for (let semilla = 1; semilla <= 3000; semilla++) {
        const az = crearAleatorioSembrado(semilla);
        const a = Math.floor(az() * 99999) + 1;
        const b = Math.floor(az() * 9999) + 1;
        assert.equal(hayLlevada(a, b), llevadaIndependiente(a, b), `${a} + ${b}`);
        if (a >= b) assert.equal(hayPrestamo(a, b), prestamoIndependiente(a, b), `${a} − ${b}`);
    }
    assert.equal(hayLlevada(45, 32), false);
    assert.equal(hayLlevada(47, 38), true);
    assert.equal(hayPrestamo(78, 35), false);
    assert.equal(hayPrestamo(52, 38), true);
});

test('errores típicos: suma sin llevar y resta «al revés»', () => {
    assert.equal(sumaSinLlevar(47, 38), 75);
    assert.equal(sumaSinLlevar(5, 7), 2);
    assert.equal(restaAlReves(52, 38), 26);
    assert.equal(restaAlReves(1000, 1), 1001, 'columna de 0 − 1 → 1 (resta el menor del mayor)');
    assert.deepEqual(cifras(405, 5), [5, 0, 4, 0, 0]);
});

test('los errores típicos de verdad aparecen entre las opciones (siempre en el nivel 3) y nunca son la respuesta', () => {
    let sinLlevar = 0;
    let alReves = 0;
    let contraria = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
        const s = generarPregunta({ grado: 4, habilidad: 'suma', nivel: 3, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
        const { a, b } = s.datos;
        const sl = sumaSinLlevar(a, b);
        assert.notEqual(sl, a + b, 'con llevada, olvidarla da otro número');
        if (s.opciones.some((o) => o.id === sl)) sinLlevar++;
        const t = generarPregunta({ grado: 4, habilidad: 'resta', nivel: 3, cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
        const ar = restaAlReves(t.datos.a, t.datos.b);
        assert.notEqual(ar, t.datos.a - t.datos.b, 'con préstamo, restar al revés da otro número');
        if (t.opciones.some((o) => o.id === ar)) alReves++;
        if (t.opciones.some((o) => o.id === t.datos.a + t.datos.b)) contraria++;
    }
    assert.equal(sinLlevar, 400, 'olvidar la llevada se ofrece siempre en el nivel 3');
    assert.equal(alReves, 400, 'restar al revés se ofrece siempre en el nivel 3');
    assert.ok(contraria > 100, `la operación contraria aparece a menudo (${contraria}/400)`);
});

test('en 1.º y 2.º ninguna opción se sale de los marcos', () => {
    paraTodas((q, c) => {
        if (c.grado === 1) assert.ok(q.opciones.every((o) => o.id <= 10), `${q.enunciado}: ${q.opciones.map((o) => o.id)}`);
        if (c.grado === 2 && c.habilidad !== 'problemas') assert.ok(q.opciones.every((o) => o.id <= 20), `${q.enunciado}: ${q.opciones.map((o) => o.id)}`);
    });
});

// ---------- Problemas ----------

const CON_SINGULAR = ['canica', 'galleta', 'estampa', 'manzana', 'pegatina', 'libro', 'lápiz', 'globo', 'carrito', 'dulce'];
const PLURAL = { canica: 'canicas', galleta: 'galletas', estampa: 'estampas', manzana: 'manzanas', pegatina: 'pegatinas', libro: 'libros', lápiz: 'lápices', globo: 'globos', carrito: 'carritos', dulce: 'dulces' };

/** La operación que cada historia pide, según las palabras de la historia (independiente de los datos del generador). */
function operacionPorPalabras(historia) {
    if (/Le dieron \d+ más y ahora tiene/.test(historia)) return 'resta';   // busca el inicio: total − lo que le dieron
    if (/Regaló \d+ y le quedaron/.test(historia)) return 'suma';           // busca el inicio: lo que quedó + lo que regaló
    if (/Le regalan/.test(historia)) return 'suma';
    if (/ regala \d+\./.test(historia)) return 'resta';
    if (/en total/.test(historia)) return 'suma';
    if (/más tiene/.test(historia)) return 'resta';
    throw new Error(`historia no reconocida: ${historia}`);
}

test('problemas: la operación depende de lo que cuenta la historia y el resultado es el correcto', () => {
    let vistos = 0;
    paraTodas((q, c) => {
        if (c.habilidad !== 'problemas') return;
        const numeros = (q.enunciado.match(/\d+/g) || []).map(Number);
        assert.deepEqual([...numeros].sort((x, y) => x - y), [q.datos.x, q.datos.y].sort((x, y) => x - y), `los números de la historia: ${q.enunciado}`);
        const operacion = operacionPorPalabras(q.enunciado);
        assert.equal(q.datos.operacion, operacion, q.enunciado);
        const esperado = operacion === 'suma' ? q.datos.x + q.datos.y : q.datos.x - q.datos.y;
        assert.equal(q.respuesta, esperado, q.enunciado);
        assert.ok(esperado >= 1);
        if (c.nivel === 3) assert.match(q.enunciado, /al principio/, 'el nivel 3 busca el dato inicial');
        vistos++;
    });
    assert.ok(vistos > 1500);
});

test('problemas: concordancia (singular/plural y género) y sin números rotos', () => {
    paraTodas((q, c) => {
        if (c.habilidad !== 'problemas') return;
        const t = q.enunciado;
        for (const s of CON_SINGULAR) {
            const p = PLURAL[s];
            for (const m of t.matchAll(new RegExp(`(\\d+) (${s}|${p})(?![a-zñáéíóú])`, 'g'))) {
                assert.equal(m[2], Number(m[1]) === 1 ? s : p, `«${m[0]}» en: ${t}`);
            }
        }
        const femenino = /Cuántas (canicas|galletas|estampas|manzanas|pegatinas)/.test(t);
        const masculino = /Cuántos (libros|lápices|globos|carritos|dulces)/.test(t);
        assert.ok(femenino !== masculino, `género de «cuántos/cuántas» en: ${t}`);
        assert.match(t, /^[A-ZÁÉÍÓÚ]/);
        assert.doesNotMatch(t, /\s{2,}| ,| \./);
    });
});

test('problemas: el error clásico (la operación contraria) se ofrece a menudo', () => {
    let contraria = 0;
    let total = 0;
    for (let semilla = 1; semilla <= 400; semilla++) {
        const q = generarPregunta({ grado: 3, habilidad: 'problemas', nivel: 1 + (semilla % 3), cantidad: 4, aleatorio: crearAleatorioSembrado(semilla) });
        const { x, y, operacion } = q.datos;
        const contrario = operacion === 'suma' ? Math.abs(x - y) : x + y;
        assert.notEqual(contrario, q.respuesta);
        total++;
        if (q.opciones.some((o) => o.id === contrario)) contraria++;
    }
    assert.equal(contraria, total, 'la operación contraria SIEMPRE se ofrece');
});

test('problemas: empiezan en 2.º', () => {
    assert.throws(() => generarPregunta({ grado: 1, habilidad: 'problemas', nivel: 1 }), /2\.º/);
    assert.deepEqual(Object.keys(habilidadesParaGrado(1)), ['suma', 'resta']);
    assert.deepEqual(Object.keys(habilidadesParaGrado(2)), ['suma', 'resta', 'problemas']);
});

test('grados y niveles fuera de rango se acotan; habilidades desconocidas fallan', () => {
    assert.equal(generarPregunta({ grado: 0, habilidad: 'suma', nivel: 0 }).habilidad, 'suma');
    assert.equal(generarPregunta({ grado: 9, habilidad: 'resta', nivel: 9, apoyo: 'completo' }).material.tipo, 'recta');
    assert.throws(() => generarPregunta({ grado: 3, habilidad: 'otra', nivel: 1 }), /desconocida/);
    assert.equal(cantidadOpciones(1), 3);
    assert.equal(cantidadOpciones(2), 4);
});

test('es reproducible con la misma semilla y varía con otra', () => {
    const uno = (s) => generarPregunta({ grado: 4, habilidad: 'suma', nivel: 3, aleatorio: crearAleatorioSembrado(s) });
    assert.deepEqual(uno(5), uno(5));
    const distintas = new Set(Array.from({ length: 40 }, (_, i) => uno(i + 1).enunciado));
    assert.ok(distintas.size > 30, `variedad: ${distintas.size}/40`);
});
