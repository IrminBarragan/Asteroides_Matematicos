import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MotorAdaptativo } from '../src/adaptativo/motor.js';

const crear = (extra) => new MotorAdaptativo({
    suma: { nivelMax: 3 },
    resta: { nivelMax: 3 }
}, extra);

function registrarVarios(motor, habilidad, patron) {
    let ultimo;
    for (const ok of patron) ultimo = motor.registrar(habilidad, ok, 1000);
    return ultimo;
}

test('arranca en nivel 1 sin dominio medido', () => {
    const m = crear();
    assert.equal(m.nivel('suma'), 1);
    assert.equal(m.dominio('suma'), null);
});

test('sube de nivel con buen dominio y reinicia la ventana', () => {
    const m = crear();
    const r = registrarVarios(m, 'suma', [true, true, true, true, true]);
    assert.equal(r.cambio, 'subio');
    assert.equal(m.nivel('suma'), 2);
    assert.equal(m.dominio('suma'), null); // ventana limpia en el nuevo nivel
});

test('no decide nada antes de minIntentos', () => {
    const m = crear();
    const r = registrarVarios(m, 'suma', [true, true, true, true]);
    assert.equal(r.cambio, null);
    assert.equal(m.nivel('suma'), 1);
});

test('baja de nivel si le cuesta, pero nunca por debajo de 1', () => {
    const m = crear({ minIntentos: 5 });
    m.importar({ suma: { nivel: 3 } });
    const r = registrarVarios(m, 'suma', [false, false, false, false, false]);
    assert.equal(r.cambio, 'bajo');
    assert.equal(m.nivel('suma'), 2);
    registrarVarios(m, 'suma', [false, false, false, false, false]);
    assert.equal(m.nivel('suma'), 1);
    const r3 = registrarVarios(m, 'suma', [false, false, false, false, false]);
    assert.equal(r3.cambio, null);
    assert.equal(m.nivel('suma'), 1);
});

test('no sube más allá de nivelMax', () => {
    const m = crear();
    for (let i = 0; i < 10; i++) registrarVarios(m, 'suma', [true, true, true, true, true]);
    assert.equal(m.nivel('suma'), 3);
});

test('rendimiento intermedio (50-85%) mantiene el nivel', () => {
    const m = crear();
    registrarVarios(m, 'suma', [true, false, true, false, true, false]); // 50%
    assert.equal(m.nivel('suma'), 1);
});

test('las habilidades son independientes entre sí', () => {
    const m = crear();
    registrarVarios(m, 'suma', [true, true, true, true, true]);
    assert.equal(m.nivel('suma'), 2);
    assert.equal(m.nivel('resta'), 1);
});

test('la ventana solo recuerda los últimos intentos', () => {
    const m = crear({ ventana: 4, minIntentos: 100 }); // minIntentos alto: no cambia de nivel
    registrarVarios(m, 'suma', [false, false, false, false, true, true, true, true]);
    assert.equal(m.dominio('suma'), 1); // los fallos viejos salieron de la ventana
});

test('necesitaPista tras fallos seguidos y se quita al acertar', () => {
    const m = crear();
    m.registrar('suma', false);
    assert.equal(m.necesitaPista('suma'), false);
    m.registrar('suma', false);
    assert.equal(m.necesitaPista('suma'), true);
    m.registrar('suma', true);
    assert.equal(m.necesitaPista('suma'), false);
});

test('habilidadAReforzar devuelve la de menor dominio bajo el umbral', () => {
    const m = crear({ minIntentos: 100 }); // evita cambios de nivel para aislar la prueba
    registrarVarios(m, 'suma', [true, true, true, true]);          // 100%
    registrarVarios(m, 'resta', [false, false, true, false]);      // 25%
    assert.equal(m.habilidadAReforzar(), 'resta');
});

test('habilidadAReforzar es null si no hay datos suficientes o todo va bien', () => {
    const m = crear({ minIntentos: 100 });
    assert.equal(m.habilidadAReforzar(), null);
    registrarVarios(m, 'resta', [false, false]); // solo 2 intentos: pocos datos
    assert.equal(m.habilidadAReforzar(), null);
    registrarVarios(m, 'suma', [true, true, true]);
    assert.equal(m.habilidadAReforzar(), null);
});

test('elegirHabilidad: las que cuestan salen más, pero todas pueden salir', () => {
    const m = crear({ minIntentos: 100 });
    registrarVarios(m, 'suma', [true, true, true, true]);          // domina: peso 1
    registrarVarios(m, 'resta', [false, false, false, false]);     // no domina: peso 4
    // Barrido determinista del rango [0,1): cuenta cuánto "espacio" ocupa cada una
    const conteo = { suma: 0, resta: 0 };
    const N = 1000;
    for (let i = 0; i < N; i++) conteo[m.elegirHabilidad(() => i / N)]++;
    assert.ok(conteo.resta > conteo.suma * 3, JSON.stringify(conteo));
    assert.ok(conteo.suma > 0);
});

test('elegirHabilidad con aleatorio extremo (≈1) no se sale de rango', () => {
    const m = crear();
    assert.ok(['suma', 'resta'].includes(m.elegirHabilidad(() => 0.999999999)));
});

test('exportar/importar conserva el estado (ida y vuelta)', () => {
    const m = crear();
    registrarVarios(m, 'suma', [true, true, true, true, true]);
    registrarVarios(m, 'resta', [true, false]);
    const copia = crear();
    copia.importar(JSON.parse(JSON.stringify(m.exportar())));
    assert.deepEqual(copia.exportar(), m.exportar());
});

test('importar ignora habilidades desconocidas y acota valores manipulados', () => {
    const m = crear();
    m.importar({
        suma: { nivel: 999, intentos: [{ ok: true }, 'basura', null], total: -5, totalOk: 50, fallosSeguidos: 'x' },
        fantasma: { nivel: 2 }
    });
    assert.equal(m.nivel('suma'), 3);               // acotado a nivelMax
    assert.equal(m.habilidades.suma.intentos.length, 1);
    assert.equal(m.habilidades.suma.total, 0);
    assert.equal(m.habilidades.suma.totalOk, 0);    // no puede superar el total
    assert.equal(m.habilidades.suma.fallosSeguidos, 0);
    assert.equal(m.habilidades.fantasma, undefined);
});

test('importar tolera entradas no válidas', () => {
    const m = crear();
    m.importar(null);
    m.importar('texto');
    m.importar(42);
    assert.equal(m.nivel('suma'), 1);
});

test('habilidad desconocida lanza error claro', () => {
    assert.throws(() => crear().registrar('algebra', true), /desconocida/);
});

test('configuración inválida se rechaza', () => {
    assert.throws(() => new MotorAdaptativo({}), /al menos una/);
    assert.throws(() => new MotorAdaptativo({ a: { nivelMax: 0 } }), /nivelMax/);
});

test('resumen para el modo maestro', () => {
    const m = crear({ minIntentos: 100 });
    m.registrar('suma', true, 2000);
    m.registrar('suma', false, 4000);
    const fila = m.resumen().find((r) => r.habilidad === 'suma');
    assert.equal(fila.intentosTotales, 2);
    assert.equal(fila.precisionGlobal, 0.5);
    assert.equal(fila.tiempoPromedioMs, 3000);
});

// Límites exactos: con ventana de 20 intentos, 17/20 = 85% y 10/20 = 50%
const preciso = () => new MotorAdaptativo({ h: { nivelMax: 3 } }, { ventana: 20, minIntentos: 20 });
const intentos = (aciertos, total) => Array.from({ length: total }, (_, i) => i < aciertos);

test('límite: exactamente 85% de dominio SÍ sube; 80% no', () => {
    const justo = preciso();
    registrarVarios(justo, 'h', intentos(17, 20));
    assert.equal(justo.nivel('h'), 2);

    const debajo = preciso();
    registrarVarios(debajo, 'h', intentos(16, 20));
    assert.equal(debajo.nivel('h'), 1);
});

test('límite: exactamente 50% NO baja; menos de 50% sí', () => {
    const justo = preciso();
    justo.importar({ h: { nivel: 3 } });
    registrarVarios(justo, 'h', intentos(10, 20));
    assert.equal(justo.nivel('h'), 3);

    const debajo = preciso();
    debajo.importar({ h: { nivel: 3 } });
    registrarVarios(debajo, 'h', intentos(9, 20));
    assert.equal(debajo.nivel('h'), 2);
});
