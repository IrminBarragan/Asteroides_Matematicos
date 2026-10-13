import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarPregunta, GENERADORES, HABILIDADES_POR_GRADO, habilidadesParaGrado, TOPE_SUMA, NIVEL_MAX
} from '../src/games/asteroides/logica/generadores.js';
import { generarDistractores, distractoresNoMultiplos } from '../src/games/asteroides/logica/distractores.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';

const HABILIDADES = Object.keys(GENERADORES);
const GRADOS = [1, 2, 3, 4, 5, 6];
const NIVELES = [1, 2, 3];
const MUESTRAS = 120;

/** Evalúa un enunciado aritmético de forma INDEPENDIENTE del generador (solo en pruebas). */
function evaluar(enunciado) {
    const expresion = enunciado.replace(' = ?', '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    assert.match(expresion, /^[\d\s+\-*/().]+$/, `expresión inesperada: ${expresion}`);
    return new Function(`return (${expresion});`)();
}

function paraTodos(fn, muestras = MUESTRAS) {
    for (const grado of GRADOS) {
        for (const habilidad of HABILIDADES) {
            for (const nivel of NIVELES) {
                const az = crearAleatorioSembrado(grado * 1000 + nivel * 100 + habilidad.length);
                for (let i = 0; i < muestras; i++) fn(generarPregunta({ grado, habilidad, nivel, cantidad: 5, aleatorio: az }), { grado, habilidad, nivel });
            }
        }
    }
}

test('la respuesta guardada es matemáticamente correcta (verificada con un evaluador independiente)', () => {
    paraTodos((q, ctx) => {
        if (ctx.habilidad === 'multiplos') {
            const n = Number(q.enunciado.match(/\d+/)[0]);
            assert.equal(q.respuesta % n, 0, q.enunciado);
        } else if (ctx.habilidad === 'decimales') {
            const escala = q.textoRespuesta.split('.')[1].length;
            assert.equal(Math.round(evaluar(q.enunciado) * 10 ** escala), q.respuesta, q.enunciado);
        } else {
            assert.equal(evaluar(q.enunciado), q.respuesta, q.enunciado);
        }
    });
});

test('toda respuesta es un entero positivo (sin negativos, ceros ni fracciones)', () => {
    paraTodos((q) => {
        assert.ok(Number.isInteger(q.respuesta) && q.respuesta > 0, `${q.enunciado} → ${q.respuesta}`);
    });
});

test('las opciones son únicas, enteras, >= 0, incluyen la respuesta y respetan la cantidad pedida', () => {
    paraTodos((q) => {
        assert.equal(q.opciones.length, 5);
        const ids = q.opciones.map((o) => o.id);
        assert.equal(new Set(ids).size, 5, `repetidas en ${q.enunciado}`);
        assert.ok(ids.every((n) => Number.isInteger(n) && n >= 0));
        assert.ok(ids.includes(q.respuesta));
    }, 60);
});

test('las opciones de texto no repiten ni muestran valores raros (NaN/undefined)', () => {
    paraTodos((q) => {
        const textos = q.opciones.map((o) => o.texto);
        assert.equal(new Set(textos).size, textos.length);
        for (const t of [...textos, q.enunciado, q.pista, q.textoRespuesta]) {
            assert.ok(!/NaN|undefined|Infinity|null/.test(t), t);
        }
        assert.ok(q.pista.length > 10);
    }, 60);
});

test('cualquier cantidad de opciones entre 2 y 8 funciona para todas las habilidades', () => {
    for (const habilidad of HABILIDADES) {
        for (let cantidad = 2; cantidad <= 8; cantidad++) {
            for (const grado of GRADOS) {
                const az = crearAleatorioSembrado(cantidad * 7 + grado);
                for (let i = 0; i < 30; i++) {
                    const q = generarPregunta({ grado, habilidad, nivel: 1 + (i % 3), cantidad, aleatorio: az });
                    assert.equal(q.opciones.length, cantidad, `${habilidad} g${grado} c${cantidad}`);
                    assert.equal(new Set(q.opciones.map((o) => o.id)).size, cantidad);
                }
            }
        }
    }
});

test('los números crecen con el nivel (en promedio) para cada grado', () => {
    for (const grado of GRADOS) {
        const promedio = (nivel) => {
            const az = crearAleatorioSembrado(grado * 31 + nivel);
            let suma = 0;
            for (let i = 0; i < 400; i++) suma += generarPregunta({ grado, habilidad: 'suma', nivel, aleatorio: az }).respuesta;
            return suma / 400;
        };
        assert.ok(promedio(2) > promedio(1), `grado ${grado}: nivel 2 > 1`);
        assert.ok(promedio(3) > promedio(2), `grado ${grado}: nivel 3 > 2`);
    }
});

test('suma y resta respetan el tope del grado y nivel', () => {
    for (const grado of GRADOS) {
        for (const nivel of NIVELES) {
            const tope = TOPE_SUMA[grado][nivel - 1];
            const az = crearAleatorioSembrado(grado * 13 + nivel);
            for (let i = 0; i < 200; i++) {
                for (const habilidad of ['suma', 'resta']) {
                    const q = generarPregunta({ grado, habilidad, nivel, aleatorio: az });
                    const [a, b] = q.enunciado.replace(' = ?', '').split(/ [+−] /).map(Number);
                    assert.ok(a <= tope && b <= tope, `${q.enunciado} (tope ${tope})`);
                }
            }
        }
    }
});

test('1.º grado nunca pasa de sumas con resultado 40', () => {
    const az = crearAleatorioSembrado(5);
    for (let i = 0; i < 500; i++) {
        const q = generarPregunta({ grado: 1, habilidad: 'suma', nivel: 3, aleatorio: az });
        assert.ok(q.respuesta <= 40, q.enunciado);
    }
});

test('multiplicación de 1.º-3.º usa las tablas del nivel (2/5/10, 3/4/6, 7/8/9)', () => {
    const grupos = { 1: [2, 5, 10], 2: [3, 4, 6], 3: [7, 8, 9] };
    for (const nivel of NIVELES) {
        const az = crearAleatorioSembrado(nivel);
        for (let i = 0; i < 200; i++) {
            const q = generarPregunta({ grado: 3, habilidad: 'multiplicacion', nivel, aleatorio: az });
            const [a, b] = q.enunciado.replace(' = ?', '').split(' × ').map(Number);
            assert.ok(grupos[nivel].includes(a) || grupos[nivel].includes(b), q.enunciado);
            assert.ok(a >= 2 && b >= 2 && a <= 10 && b <= 10);
        }
    }
});

test('la división es exacta y el divisor nunca es 0 ni 1', () => {
    for (const grado of GRADOS) {
        for (const nivel of NIVELES) {
            const az = crearAleatorioSembrado(grado + nivel * 50);
            for (let i = 0; i < 150; i++) {
                const q = generarPregunta({ grado, habilidad: 'division', nivel, aleatorio: az });
                const [dividendo, divisor] = q.enunciado.replace(' = ?', '').split(' ÷ ').map(Number);
                assert.ok(divisor >= 2);
                assert.equal(dividendo % divisor, 0);
                assert.equal(dividendo / divisor, q.respuesta);
            }
        }
    }
});

test('operaciones combinadas: la jerarquía de operaciones se respeta y aparece el error típico como distractor', () => {
    let conErrorTipico = 0;
    let total = 0;
    const az = crearAleatorioSembrado(77);
    for (let i = 0; i < 600; i++) {
        const q = generarPregunta({ grado: 5, habilidad: 'combinadas', nivel: 1, cantidad: 5, aleatorio: az });
        const [, a, b, c] = q.enunciado.match(/^(\d+) \+ (\d+) × (\d+)/);
        const ingenuo = (Number(a) + Number(b)) * Number(c); // resolver de izquierda a derecha
        assert.notEqual(ingenuo, q.respuesta);
        total++;
        if (q.opciones.some((o) => o.id === ingenuo)) conErrorTipico++;
    }
    assert.ok(conErrorTipico / total > 0.5, `el error típico solo apareció en ${conErrorTipico}/${total}`);
});

test('múltiplos: la respuesta es múltiplo y NINGÚN distractor lo es', () => {
    for (const grado of [5, 6]) {
        for (const nivel of NIVELES) {
            const az = crearAleatorioSembrado(grado * 5 + nivel);
            for (let i = 0; i < 200; i++) {
                const q = generarPregunta({ grado, habilidad: 'multiplos', nivel, cantidad: 5, aleatorio: az });
                const n = Number(q.enunciado.match(/\d+/)[0]);
                const multiplos = q.opciones.filter((o) => o.id % n === 0);
                assert.equal(multiplos.length, 1, `${q.enunciado} → ${q.opciones.map((o) => o.id)}`);
                assert.equal(multiplos[0].id, q.respuesta);
            }
        }
    }
});

test('decimales: formato con 1 decimal (niveles 1-2) o 2 (nivel 3) y restas sin resultado negativo', () => {
    for (const nivel of NIVELES) {
        const az = crearAleatorioSembrado(nivel);
        for (let i = 0; i < 200; i++) {
            const q = generarPregunta({ grado: 6, habilidad: 'decimales', nivel, aleatorio: az });
            const esperados = nivel === 3 ? 2 : 1;
            for (const texto of [q.textoRespuesta, ...q.opciones.map((o) => o.texto)]) {
                assert.match(texto, /^\d+\.\d+$/);
                assert.equal(texto.split('.')[1].length, esperados);
            }
            assert.ok(q.respuesta > 0);
        }
    }
});

test('decimales: el resultado exacto evita el error de punto flotante (0.1 + 0.2)', () => {
    // La respuesta se guarda escalada como entero; 0.1 + 0.2 = 0.30000000000000004 en JS, pero 1 + 2 = 3 es exacto
    const az = crearAleatorioSembrado(2);
    for (let i = 0; i < 300; i++) {
        const q = generarPregunta({ grado: 6, habilidad: 'decimales', nivel: 1, aleatorio: az });
        assert.equal(q.textoRespuesta, (q.respuesta / 10).toFixed(1));
        assert.ok(!/\d{3,}$/.test(q.textoRespuesta.split('.')[1]));
    }
});

test('las preguntas son reproducibles con la misma semilla', () => {
    const a = generarPregunta({ grado: 4, habilidad: 'multiplicacion', nivel: 2, aleatorio: crearAleatorioSembrado(11) });
    const b = generarPregunta({ grado: 4, habilidad: 'multiplicacion', nivel: 2, aleatorio: crearAleatorioSembrado(11) });
    assert.deepEqual(a, b);
});

test('grado, nivel y cantidad fuera de rango se acotan sin romper', () => {
    const q = generarPregunta({ grado: 99, habilidad: 'suma', nivel: -5, cantidad: 100 });
    assert.equal(q.opciones.length, 8);
    const r = generarPregunta({ grado: -3, habilidad: 'suma', nivel: 99, cantidad: 0 });
    assert.equal(r.opciones.length, 2);
});

test('una habilidad desconocida falla con un error claro', () => {
    assert.throws(() => generarPregunta({ grado: 1, habilidad: 'algebra', nivel: 1 }), /desconocida/);
});

test('cobertura curricular: cada grado tiene sus habilidades, y todas existen como generador', () => {
    assert.deepEqual(HABILIDADES_POR_GRADO[1], ['suma', 'resta']);
    assert.deepEqual(HABILIDADES_POR_GRADO[2], ['suma', 'resta']);
    assert.ok(HABILIDADES_POR_GRADO[3].includes('multiplicacion'));
    assert.ok(HABILIDADES_POR_GRADO[4].includes('division'));
    assert.ok(HABILIDADES_POR_GRADO[5].includes('combinadas') && HABILIDADES_POR_GRADO[5].includes('multiplos'));
    assert.ok(HABILIDADES_POR_GRADO[6].includes('decimales'));
    for (const lista of Object.values(HABILIDADES_POR_GRADO)) {
        for (const h of lista) assert.ok(GENERADORES[h], h);
    }
    assert.deepEqual(Object.keys(habilidadesParaGrado(3)), HABILIDADES_POR_GRADO[3]);
    assert.equal(habilidadesParaGrado(3).suma.nivelMax, NIVEL_MAX);
    assert.deepEqual(habilidadesParaGrado(99), habilidadesParaGrado(6)); // acota el grado
});

// ---------- Distractores ----------

test('distractores: usa primero los errores típicos y siempre devuelve la cantidad pedida', () => {
    const az = crearAleatorioSembrado(1);
    const d = generarDistractores(20, az, 3, { preferidos: [21, 19, 30] });
    assert.deepEqual([...d].sort(), [19, 21, 30]);
    for (const respuesta of [0, 1, 2, 5, 100]) {
        for (let cantidad = 1; cantidad <= 7; cantidad++) {
            const r = generarDistractores(respuesta, az, cantidad);
            assert.equal(r.length, cantidad);
            assert.equal(new Set(r).size, cantidad);
            assert.ok(r.every((n) => Number.isInteger(n) && n >= 0 && n !== respuesta));
        }
    }
});

test('distractores: descarta preferidos inválidos (negativos, repetidos, iguales a la respuesta)', () => {
    const d = generarDistractores(10, crearAleatorioSembrado(2), 3, { preferidos: [-5, 10, 11, 11, 1.5] });
    assert.ok(d.includes(11));
    assert.ok(d.every((n) => n >= 0 && n !== 10 && Number.isInteger(n)));
    assert.equal(new Set(d).size, 3);
});

test('distractoresNoMultiplos nunca devuelve múltiplos y prefiere los cercanos', () => {
    const az = crearAleatorioSembrado(3);
    for (const n of [2, 3, 7, 12, 15]) {
        const r = distractoresNoMultiplos(n * 6, n, az, 4);
        assert.equal(r.length, 4);
        assert.ok(r.every((v) => v % n !== 0 && v > 0));
        assert.ok(r.every((v) => Math.abs(v - n * 6) <= 3 * n + 6));
    }
});
