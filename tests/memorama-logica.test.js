import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generarTablero, HABILIDADES_POR_GRADO, habilidadesParaGrado, cantidadParejas, columnasPara, instruccionPara, INSTRUCCIONES, NIVEL_MAX
} from '../src/games/memorama/logica/generadores.js';
import { Tablero } from '../src/games/memorama/logica/tablero.js';
import { Partida, TABLEROS_POR_PARTIDA, PUNTOS_PAREJA, BONUS_TABLERO_PERFECTO } from '../src/games/memorama/logica/partida.js';
import { normalizar } from '../src/games/memorama/logica/contenido.js';
import { crearAleatorioSembrado } from '../src/core/aleatorio.js';
import { normalizarResultado } from '../src/core/resultado.js';

const TODAS = [...new Set(Object.values(HABILIDADES_POR_GRADO).flat())];

function paraTodos(fn, muestras = 60) {
    for (const habilidad of TODAS) {
        for (const grado of [1, 2, 3]) {
            for (let nivel = 1; nivel <= NIVEL_MAX; nivel++) {
                const az = crearAleatorioSembrado(grado * 100 + nivel * 10 + habilidad.length);
                for (let i = 0; i < muestras; i++) fn(generarTablero({ grado, habilidad, nivel, aleatorio: az }), { habilidad, grado, nivel });
            }
        }
    }
}

// ---------- Generación de tableros ----------

test('cada tablero tiene 2 cartas por pareja, con la cantidad de parejas del nivel', () => {
    paraTodos((t, { habilidad, nivel }) => {
        assert.equal(t.parejas.length, cantidadParejas(habilidad, nivel), habilidad);
        assert.equal(t.cartas.length, t.parejas.length * 2);
        for (const p of t.parejas) assert.equal(t.cartas.filter((c) => c.parejaId === p.id).length, 2);
    });
});

test('NUNCA hay dos parejas del mismo grupo en un tablero (ninguna carta tiene dos parejas válidas)', () => {
    paraTodos((t) => {
        const grupos = t.parejas.map((p) => p.grupo);
        assert.equal(new Set(grupos).size, grupos.length, `grupos repetidos: ${grupos}`);
    }, 150);
});

test('ninguna carta se repite visualmente: los textos del mismo tipo son únicos en el tablero', () => {
    paraTodos((t) => {
        const claves = t.cartas.map((c) => `${c.contenido.tipo}:${c.contenido.texto}`);
        assert.equal(new Set(claves).size, claves.length, claves.join(' | '));
    }, 100);
});

test('rimas: en un tablero ninguna palabra rima con otra que NO sea su pareja', () => {
    const az = crearAleatorioSembrado(3);
    for (let i = 0; i < 500; i++) {
        const t = generarTablero({ grado: 3, habilidad: 'rimas', nivel: 3, aleatorio: az });
        for (const a of t.cartas) {
            for (const b of t.cartas) {
                if (a === b || a.parejaId === b.parejaId) continue;
                const fin = (x) => normalizar(x.contenido.texto).slice(-3);
                assert.notEqual(fin(a), fin(b), `${a.contenido.texto} y ${b.contenido.texto} riman pero no son pareja`);
            }
        }
    }
});

test('sílaba inicial: las sílabas de las parejas de un tablero son todas distintas', () => {
    for (const grado of [1, 2]) {
        const az = crearAleatorioSembrado(grado);
        for (let i = 0; i < 300; i++) {
            const t = generarTablero({ grado, habilidad: 'silaba-inicial', nivel: 3, aleatorio: az });
            const silabas = t.parejas.map((p) => normalizar(p.b.texto));
            assert.equal(new Set(silabas).size, silabas.length);
        }
    }
});

test('contar sílabas: cada pareja tiene una cantidad distinta y el nivel limita el máximo (3, 4 o 5)', () => {
    for (let nivel = 1; nivel <= 3; nivel++) {
        const az = crearAleatorioSembrado(nivel);
        for (let i = 0; i < 200; i++) {
            const t = generarTablero({ grado: 2, habilidad: 'conteo-silabas', nivel, aleatorio: az });
            const numeros = t.parejas.map((p) => Number(p.b.texto)).sort();
            assert.deepEqual(numeros, Array.from({ length: nivel + 2 }, (_, k) => k + 1), `nivel ${nivel}`);
        }
    }
});

test('los tableros varían entre partidas (no siempre las mismas parejas)', () => {
    const az = crearAleatorioSembrado(1);
    const vistos = new Set();
    for (let i = 0; i < 40; i++) vistos.add(generarTablero({ grado: 3, habilidad: 'rimas', nivel: 1, aleatorio: az }).parejas.map((p) => p.id).sort().join());
    assert.ok(vistos.size > 20, `solo ${vistos.size} tableros distintos`);
});

test('las cartas se mezclan: la pareja no queda siempre al lado', () => {
    const az = crearAleatorioSembrado(5);
    const posiciones = new Set();
    for (let i = 0; i < 100; i++) {
        const t = generarTablero({ grado: 3, habilidad: 'rimas', nivel: 1, aleatorio: az });
        posiciones.add(t.cartas.findIndex((c) => c.parejaId === t.parejas[0].id));
    }
    assert.ok(posiciones.size >= 4);
});

test('la instrucción corresponde a la habilidad y las columnas dan filas razonables', () => {
    paraTodos((t, { habilidad, grado }) => {
        assert.equal(t.instruccion, instruccionPara(habilidad, grado));
        assert.ok(t.columnas >= 3 && t.columnas <= 5);
        assert.equal(t.cartas.length % t.columnas === 0 || t.cartas.length / t.columnas <= 3, true);
    }, 5);
    assert.deepEqual([6, 8, 10, 12].map(columnasPara), [3, 4, 5, 4]);
});

test('la instrucción nombra lo que ve el niño: dibujos en 1.º, palabras en 2.º', () => {
    assert.match(instruccionPara('silaba-inicial', 1), /dibujo/);
    assert.match(instruccionPara('silaba-inicial', 2), /palabra/);
    for (const g of [1, 2, 3]) {
        const t = generarTablero({ grado: g, habilidad: 'silaba-inicial', nivel: 1, aleatorio: crearAleatorioSembrado(g) });
        const tipoCarta = t.cartas.find((c) => c.contenido.tipo !== 'silaba').contenido.tipo;
        assert.ok(t.instruccion.includes(tipoCarta === 'imagen' ? 'dibujo' : 'palabra'), `${g}.º: ${t.instruccion}`);
    }
    assert.ok(Object.values(INSTRUCCIONES).every((t) => t.endsWith('.')));
});

test('el grado se acota a 1–3 y una habilidad desconocida falla con error claro', () => {
    assert.doesNotThrow(() => generarTablero({ grado: 6, habilidad: 'rimas', nivel: 2 }));
    assert.doesNotThrow(() => generarTablero({ grado: 0, habilidad: 'imagen-palabra', nivel: 99 }));
    assert.throws(() => generarTablero({ grado: 1, habilidad: 'ortografia', nivel: 1 }), /desconocida/);
});

test('cobertura por grado', () => {
    assert.deepEqual(HABILIDADES_POR_GRADO[1], ['imagen-palabra', 'silaba-inicial']);
    assert.ok(HABILIDADES_POR_GRADO[2].includes('rimas') && HABILIDADES_POR_GRADO[2].includes('conteo-silabas'));
    assert.deepEqual(HABILIDADES_POR_GRADO[3], ['rimas', 'sinonimos', 'antonimos']);
    assert.deepEqual(Object.keys(habilidadesParaGrado(99)), HABILIDADES_POR_GRADO[3]);
});

// ---------- Motor del tablero ----------

const cartas = (...pares) => pares.flatMap((p) => [{ id: `${p}1`, parejaId: p }, { id: `${p}2`, parejaId: p }]);

test('voltear una carta nueva la deja visible como "primera"', () => {
    const t = new Tablero(cartas('A', 'B'));
    const r = t.voltear('A1');
    assert.equal(r.tipo, 'primera');
    assert.equal(t.porId.get('A1').estado, 'visible');
});

test('dos cartas de la misma pareja quedan encontradas y se cuenta la pareja', () => {
    const t = new Tablero(cartas('A', 'B'));
    t.voltear('A1');
    const r = t.voltear('A2');
    assert.equal(r.tipo, 'pareja');
    assert.equal(r.parejaId, 'A');
    assert.equal(t.porId.get('A1').estado, 'encontrada');
    assert.equal(t.parejasEncontradas, 1);
    assert.equal(t.completo, false);
    t.voltear('B1'); t.voltear('B2');
    assert.equal(t.completo, true);
});

test('un fallo a ciegas (nunca se vio la pareja) NO es evitable', () => {
    const t = new Tablero(cartas('A', 'B', 'C'));
    t.voltear('A1');
    const r = t.voltear('B1');
    assert.equal(r.tipo, 'fallo');
    assert.equal(r.evitable, false);
});

test('fallar cuando la pareja de la PRIMERA carta ya se había visto SÍ es evitable', () => {
    const t = new Tablero(cartas('A', 'B', 'C'));
    t.voltear('A1'); t.voltear('B1');   // fallo a ciegas: se ven A1 y B1
    t.ocultarFallo();
    t.voltear('A2');                    // la pareja de A2 (A1) ya se vio
    const r = t.voltear('C1');
    assert.equal(r.tipo, 'fallo');
    assert.equal(r.evitable, true);
});

test('si la pareja de la primera no se había visto, el fallo no es evitable aunque la SEGUNDA sea conocida', () => {
    const t = new Tablero(cartas('A', 'B', 'C'));
    t.voltear('A1'); t.voltear('B1');
    t.ocultarFallo();
    t.voltear('C1');                    // pareja de C1 (C2) nunca vista
    const r = t.voltear('A1');          // A1 conocida como segunda carta
    assert.equal(r.tipo, 'fallo');
    assert.equal(r.evitable, false);
});

test('con un fallo a la vista el tablero queda bloqueado hasta ocultarlo', () => {
    const t = new Tablero(cartas('A', 'B', 'C'));
    t.voltear('A1'); t.voltear('B1');
    assert.equal(t.bloqueado, true);
    assert.equal(t.voltear('C1').tipo, 'ignorada');
    const ocultas = t.ocultarFallo();
    assert.equal(ocultas.length, 2);
    assert.equal(t.bloqueado, false);
    assert.ok(ocultas.every((c) => c.estado === 'oculta'));
    assert.equal(t.voltear('C1').tipo, 'primera');
});

test('voltear la misma carta dos veces, una encontrada o una inexistente se ignora', () => {
    const t = new Tablero(cartas('A', 'B'));
    t.voltear('A1');
    assert.equal(t.voltear('A1').tipo, 'ignorada', 'la misma carta no es su propia pareja');
    t.voltear('A2');
    assert.equal(t.voltear('A1').tipo, 'ignorada', 'ya encontrada');
    assert.equal(t.voltear('Z9').tipo, 'ignorada');
    assert.equal(t.parejasEncontradas, 1);
});

test('ocultarFallo sin fallo pendiente no hace nada', () => {
    assert.deepEqual(new Tablero(cartas('A')).ocultarFallo(), []);
});

test('un jugador de memoria perfecta termina sin ningún error evitable', () => {
    const az = crearAleatorioSembrado(2);
    for (let i = 0; i < 100; i++) {
        const dat = generarTablero({ grado: 3, habilidad: 'rimas', nivel: 3, aleatorio: az });
        const t = new Tablero(dat.cartas);
        const conocidas = new Map(); // parejaId → carta ya vista
        let evitables = 0;
        const pendientes = [...dat.cartas];
        while (!t.completo) {
            // Estrategia óptima: si conoce una pareja, la completa; si no, explora cartas nuevas
            const conocida = pendientes.find((c) => c.estado !== 'encontrada' && conocidas.has(c.parejaId) && conocidas.get(c.parejaId).id !== c.id);
            if (conocida) {
                t.voltear(conocidas.get(conocida.parejaId).id);
                t.voltear(conocida.id);
                pendientes.splice(pendientes.indexOf(conocida), 1);
                continue;
            }
            const nueva = dat.cartas.find((c) => t.porId.get(c.id).estado === 'oculta' && !t.porId.get(c.id).vista);
            t.voltear(nueva.id);
            const nueva2 = dat.cartas.find((c) => t.porId.get(c.id).estado === 'oculta' && !t.porId.get(c.id).vista);
            const r = t.voltear(nueva2.id);
            conocidas.set(nueva.parejaId, nueva);
            conocidas.set(nueva2.parejaId, nueva2);
            if (r.tipo === 'fallo') { if (r.evitable) evitables++; t.ocultarFallo(); }
            else { conocidas.delete(r.parejaId); }
        }
        assert.equal(evitables, 0);
    }
});

// ---------- Partida ----------

const nueva = (extra = {}) => new Partida({ grado: 3, aleatorio: crearAleatorioSembrado(1), ...extra });

/**
 * Resuelve el tablero actual de la partida. Con `conError`, antes comete UN error evitable a propósito:
 *   1) ve a (de la pareja 1) y x (de la pareja 2): fallo a ciegas, no cuenta;
 *   2) voltea b (la pareja de a, que ya se vio) y luego una carta de la pareja 3: fallo EVITABLE.
 */
function resolverTablero(p, { conError = false } = {}) {
    const T = p.tablero;
    const pares = p.datos.parejas.map((par) => p.datos.cartas.filter((c) => c.parejaId === par.id));
    const jugar = (id) => { const r = T.voltear(id); return { r, s: p.procesar(r) }; };

    if (conError) {
        jugar(pares[0][0].id);
        jugar(pares[1][0].id);
        T.ocultarFallo();
        jugar(pares[0][1].id);
        const { r } = jugar(pares[2][0].id);
        assert.equal(r.tipo, 'fallo');
        assert.equal(r.evitable, true);
        T.ocultarFallo();
    }
    for (const [a, b] of pares) { jugar(a.id); jugar(b.id); }
}

test('una partida tiene TABLEROS_POR_PARTIDA tableros y luego no hay más', () => {
    const p = nueva();
    let n = 0;
    while (p.iniciarTablero()) { resolverTablero(p); n++; }
    assert.equal(n, TABLEROS_POR_PARTIDA);
    assert.equal(p.iniciarTablero(), null);
});

test('cada pareja encontrada suma 10; un tablero sin errores evitables da bonus', () => {
    const p = nueva();
    const datos = p.iniciarTablero();
    resolverTablero(p);
    assert.equal(p.aciertos, datos.parejas.length);
    assert.equal(p.puntaje, datos.parejas.length * PUNTOS_PAREJA + BONUS_TABLERO_PERFECTO);
    assert.equal(p.fallos, 0);
});

test('un error evitable cuenta como fallo, no resta puntos y quita el bonus', () => {
    const p = nueva();
    const datos = p.iniciarTablero();
    resolverTablero(p, { conError: true });
    assert.equal(p.fallos, 1);
    assert.equal(p.puntaje, datos.parejas.length * PUNTOS_PAREJA, 'sin bonus, y sin descuento');
});

test('un fallo a ciegas no cuenta como error ni alimenta al motor', () => {
    const p = nueva();
    p.iniciarTablero();
    const [a] = p.datos.cartas;
    const otra = p.datos.cartas.find((c) => c.parejaId !== a.parejaId);
    p.procesar(p.tablero.voltear(a.id));
    const salida = p.procesar(p.tablero.voltear(otra.id));
    assert.deepEqual(salida, {});
    assert.equal(p.fallos, 0);
});

test('procesar una pareja devuelve la pareja (con su explicación) para mostrarla al niño', () => {
    const p = nueva();
    p.iniciarTablero();
    const par = p.datos.parejas[0];
    const [a, b] = p.datos.cartas.filter((c) => c.parejaId === par.id);
    p.procesar(p.tablero.voltear(a.id));
    const salida = p.procesar(p.tablero.voltear(b.id));
    assert.equal(salida.pareja.id, par.id);
    assert.ok(salida.pareja.explicacion.length > 10);
});

test('el resultado cumple el formato común: aciertos = parejas, estrellas según errores evitables', () => {
    const p = nueva();
    while (p.iniciarTablero()) resolverTablero(p);
    const r = normalizarResultado(p.resultado(90_000));
    assert.equal(r.fallos, 0);
    assert.equal(r.estrellas, 3);
    assert.ok(Object.keys(r.habilidades).length >= 3);
});

test('el motor aprende: tras muchos tableros bien resueltos sube el nivel (más parejas)', () => {
    const p = new Partida({ grado: 1, aleatorio: crearAleatorioSembrado(7), total: 12 });
    const niveles = new Set();
    while (p.iniciarTablero()) { resolverTablero(p); niveles.add(p.datos.nivel); }
    assert.ok(niveles.has(2), `niveles vistos: ${[...niveles]}`);
});

test('restaura habilidades guardadas e ignora las que no existen en el grado', () => {
    const p = new Partida({ grado: 1, habilidadesGuardadas: { 'imagen-palabra': { nivel: 3 }, rimas: { nivel: 2 } } });
    assert.equal(p.motor.nivel('imagen-palabra'), 3);
    assert.equal(p.motor.habilidades.rimas, undefined);
});
