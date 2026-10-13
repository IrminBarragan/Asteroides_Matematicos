import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    mcd, mcm, fraccion, simplificar, estaSimplificada, comparar, sonEquivalentes, aDenominadorComun, sumar, restar,
    multiplicarPorFactor, aMixta, desdeMixta, centesimas, formatoDecimal, centesimasDeTexto, formato, formatoMixto,
    fraccionEnPalabras, mixtaEnPalabras
} from '../src/core/fracciones.js';

const MAX = 24;
function paraTodasLasFracciones(fn) {
    for (let d = 1; d <= MAX; d++) for (let n = 0; n <= 2 * MAX; n++) fn({ n, d });
}
// Verificación INDEPENDIENTE de igualdad de valores: multiplicación cruzada explícita
const igualValor = (a, b) => a.n * b.d === b.n * a.d;

// ---------- mcd y mcm ----------

test('mcd y mcm con casos conocidos y la identidad mcd × mcm = a × b', () => {
    assert.equal(mcd(12, 18), 6);
    assert.equal(mcd(7, 13), 1);
    assert.equal(mcd(0, 5), 5);
    assert.equal(mcd(5, 0), 5);
    assert.equal(mcm(4, 6), 12);
    assert.equal(mcm(3, 5), 15);
    for (let a = 1; a <= 40; a++) for (let b = 1; b <= 40; b++) {
        assert.equal(mcd(a, b) * mcm(a, b), a * b);
        assert.equal(mcm(a, b) % a, 0);
        assert.equal(mcm(a, b) % b, 0);
    }
});

// ---------- Simplificar y equivalencia ----------

test('simplificar: conserva el valor, queda irreducible y es idempotente (para todas las fracciones de la prueba)', () => {
    paraTodasLasFracciones((f) => {
        const s = simplificar(f);
        assert.ok(igualValor(f, s), `${f.n}/${f.d} → ${s.n}/${s.d}`);
        assert.ok(estaSimplificada(s));
        assert.deepEqual(simplificar(s), s);
        if (f.n > 0) assert.equal(mcd(s.n, s.d), 1);
    });
    assert.deepEqual(simplificar({ n: 6, d: 8 }), { n: 3, d: 4 });
    assert.deepEqual(simplificar({ n: 0, d: 7 }), { n: 0, d: 1 });
    assert.deepEqual(simplificar({ n: 5, d: 5 }), { n: 1, d: 1 });
});

test('multiplicar numerador y denominador por el mismo número da una equivalente (y solo eso)', () => {
    for (let k = 1; k <= 12; k++) {
        const f = { n: 3, d: 4 };
        const g = multiplicarPorFactor(f, k);
        assert.ok(sonEquivalentes(f, g));
        assert.equal(g.n, 3 * k);
    }
    assert.ok(!sonEquivalentes({ n: 2, d: 4 }, { n: 3, d: 5 }), 'sumar lo mismo arriba y abajo NO conserva el valor');
    assert.ok(!sonEquivalentes({ n: 1, d: 2 }, { n: 2, d: 3 }));
});

test('comparar: -1, 0, 1 coherentes con el orden real (verificado con multiplicación cruzada explícita)', () => {
    for (let d1 = 1; d1 <= 12; d1++) for (let d2 = 1; d2 <= 12; d2++) for (let n1 = 0; n1 <= 14; n1++) for (let n2 = 0; n2 <= 14; n2++) {
        const esperado = Math.sign(n1 * d2 - n2 * d1);
        assert.equal(comparar({ n: n1, d: d1 }, { n: n2, d: d2 }), esperado);
    }
    assert.equal(comparar({ n: 1, d: 2 }, { n: 2, d: 4 }), 0);
    assert.equal(comparar({ n: 1, d: 3 }, { n: 1, d: 2 }), -1);
    assert.equal(comparar({ n: 3, d: 4 }, { n: 2, d: 3 }), 1);
});

test('comparar es antisimétrica y transitiva', () => {
    const fs = [];
    for (let d = 1; d <= 6; d++) for (let n = 0; n <= 8; n++) fs.push({ n, d });
    for (const a of fs) for (const b of fs) {
        // Se suman en vez de negar: -0 y 0 no son iguales para assert.equal (Object.is).
        assert.equal(comparar(a, b) + comparar(b, a), 0);
        for (const c of fs.slice(0, 12)) {
            if (comparar(a, b) <= 0 && comparar(b, c) <= 0) assert.ok(comparar(a, c) <= 0);
        }
    }
});

// ---------- Suma y resta ----------

test('aDenominadorComun usa el mcm y conserva el valor de cada fracción', () => {
    const [x, y] = aDenominadorComun({ n: 1, d: 2 }, { n: 1, d: 3 });
    assert.deepEqual([x, y], [{ n: 3, d: 6 }, { n: 2, d: 6 }]);
    for (let d1 = 1; d1 <= 12; d1++) for (let d2 = 1; d2 <= 12; d2++) {
        const a = { n: 1, d: d1 };
        const b = { n: 1, d: d2 };
        const [p, q] = aDenominadorComun(a, b);
        assert.equal(p.d, q.d);
        assert.equal(p.d, mcm(d1, d2), 'el denominador común más pequeño');
        assert.ok(igualValor(a, p) && igualValor(b, q));
    }
});

test('sumar: resultado correcto (verificado SIN usar mcm) y simplificado, para miles de pares', () => {
    for (let d1 = 1; d1 <= 12; d1++) for (let d2 = 1; d2 <= 12; d2++) for (let n1 = 0; n1 <= 14; n1++) for (let n2 = 0; n2 <= 14; n2 += 3) {
        const a = { n: n1, d: d1 };
        const b = { n: n2, d: d2 };
        const r = sumar(a, b);
        // r debería valer (n1·d2 + n2·d1) / (d1·d2)
        assert.equal(r.n * d1 * d2, (n1 * d2 + n2 * d1) * r.d, `${formato(a)} + ${formato(b)} = ${formato(r)}`);
        assert.ok(estaSimplificada(r));
    }
    assert.deepEqual(sumar({ n: 1, d: 2 }, { n: 1, d: 3 }), { n: 5, d: 6 });
    assert.deepEqual(sumar({ n: 1, d: 4 }, { n: 1, d: 4 }), { n: 1, d: 2 });
    assert.deepEqual(sumar({ n: 3, d: 4 }, { n: 3, d: 4 }), { n: 3, d: 2 });
    assert.deepEqual(sumar({ n: 1, d: 2 }, { n: 1, d: 2 }), { n: 1, d: 1 });
});

test('restar: correcta (verificada sin mcm), simplificada, y es la inversa de sumar', () => {
    for (let d1 = 1; d1 <= 12; d1++) for (let d2 = 1; d2 <= 12; d2++) for (let n1 = 0; n1 <= 14; n1++) for (let n2 = 0; n2 <= 14; n2 += 3) {
        const a = { n: n1, d: d1 };
        const b = { n: n2, d: d2 };
        if (comparar(a, b) < 0) continue;
        const r = restar(a, b);
        assert.equal(r.n * d1 * d2, (n1 * d2 - n2 * d1) * r.d);
        assert.ok(estaSimplificada(r));
        assert.ok(sonEquivalentes(sumar(r, b), a), 'r + b debe volver a a');
    }
    assert.deepEqual(restar({ n: 3, d: 4 }, { n: 1, d: 2 }), { n: 1, d: 4 });
    assert.throws(() => restar({ n: 1, d: 3 }, { n: 1, d: 2 }), /negativa/);
});

test('la suma NO es "sumar numeradores y denominadores" (el error clásico): 1/2 + 1/3 ≠ 2/5', () => {
    assert.ok(!sonEquivalentes(sumar({ n: 1, d: 2 }, { n: 1, d: 3 }), { n: 2, d: 5 }));
    assert.ok(!sonEquivalentes(sumar({ n: 1, d: 4 }, { n: 1, d: 4 }), { n: 2, d: 8 }));
});

test('no hay errores de punto flotante: 1/10 + 2/10 es exactamente 3/10', () => {
    assert.notEqual(0.1 + 0.2, 0.3, 'recordatorio de por qué existe este módulo');
    assert.deepEqual(sumar({ n: 1, d: 10 }, { n: 2, d: 10 }), { n: 3, d: 10 });
});

// ---------- Mixtas ----------

test('aMixta y desdeMixta son inversas, para todas las fracciones', () => {
    paraTodasLasFracciones((f) => {
        const m = aMixta(f);
        assert.ok(m.n < m.d && m.entero >= 0);
        assert.deepEqual(desdeMixta(m), f);
    });
    assert.deepEqual(aMixta({ n: 7, d: 4 }), { entero: 1, n: 3, d: 4 });
    assert.deepEqual(aMixta({ n: 8, d: 4 }), { entero: 2, n: 0, d: 4 });
    assert.deepEqual(desdeMixta({ entero: 2, n: 1, d: 3 }), { n: 7, d: 3 });
});

// ---------- Decimales (en centésimas enteras) ----------

test('centesimas: solo para denominadores que dividen a 100', () => {
    assert.equal(centesimas({ n: 3, d: 4 }), 75);
    assert.equal(centesimas({ n: 1, d: 2 }), 50);
    assert.equal(centesimas({ n: 1, d: 5 }), 20);
    assert.equal(centesimas({ n: 7, d: 100 }), 7);
    assert.equal(centesimas({ n: 5, d: 4 }), 125);
    assert.equal(centesimas({ n: 1, d: 3 }), null);
    assert.equal(centesimas({ n: 1, d: 8 }), null, '1/8 = 0.125 necesita 3 cifras');
});

test('formatoDecimal y centesimasDeTexto son inversos para 0..1000 centésimas', () => {
    for (let c = 0; c <= 1000; c++) {
        const texto = formatoDecimal(c);
        assert.ok(!/\.\d*0$/.test(texto), `ceros sobrantes: ${texto}`);
        assert.equal(centesimasDeTexto(texto), c, `${c} → ${texto}`);
    }
    assert.equal(formatoDecimal(75), '0.75');
    assert.equal(formatoDecimal(50), '0.5');
    assert.equal(formatoDecimal(4), '0.04');
    assert.equal(formatoDecimal(150), '1.5');
    assert.equal(formatoDecimal(200), '2');
    assert.equal(centesimasDeTexto('1.234'), null);
    assert.equal(centesimasDeTexto('abc'), null);
});

test('el decimal exacto coincide con la fracción (verificado con multiplicación cruzada)', () => {
    for (const d of [2, 4, 5, 10, 20, 25, 50, 100]) for (let n = 0; n <= 3 * d; n++) {
        const c = centesimas({ n, d });
        assert.equal(c * d, n * 100, `${n}/${d}`);
    }
});

// ---------- Formatos y lectura ----------

test('formatos de texto', () => {
    assert.equal(formato({ n: 3, d: 4 }), '3/4');
    assert.equal(formatoMixto({ entero: 1, n: 3, d: 4 }), '1 3/4');
    assert.equal(formatoMixto({ entero: 2, n: 0, d: 4 }), '2');
    assert.equal(formatoMixto({ entero: 0, n: 3, d: 4 }), '3/4');
});

test('fraccionEnPalabras: singular/plural y denominadores sin nombre corto', () => {
    assert.equal(fraccionEnPalabras({ n: 1, d: 2 }), '1 medio');
    assert.equal(fraccionEnPalabras({ n: 3, d: 4 }), '3 cuartos');
    assert.equal(fraccionEnPalabras({ n: 1, d: 3 }), '1 tercio');
    assert.equal(fraccionEnPalabras({ n: 2, d: 3 }), '2 tercios');
    assert.equal(fraccionEnPalabras({ n: 7, d: 8 }), '7 octavos');
    assert.equal(fraccionEnPalabras({ n: 5, d: 12 }), '5 entre 12');
    assert.equal(mixtaEnPalabras({ entero: 1, n: 3, d: 4 }), '1 y 3 cuartos');
    assert.equal(mixtaEnPalabras({ entero: 2, n: 0, d: 4 }), '2');
});

test('fraccion() valida; denominador 0 o negativos lanzan', () => {
    assert.deepEqual(fraccion(1, 2), { n: 1, d: 2 });
    assert.throws(() => fraccion(1, 0), /inválida/);
    assert.throws(() => fraccion(-1, 2), /inválida/);
    assert.throws(() => fraccion(1.5, 2), /inválida/);
    assert.throws(() => simplificar({ n: 1, d: 0 }), /inválida/);
});
