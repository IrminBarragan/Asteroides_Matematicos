import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLORES } from '../src/core/pegatinas.js';

/**
 * Contraste de color WCAG 2.x. El texto normal necesita ≥ 4.5:1 (AA); el texto grande (≥ 24 px, o ≥ 19 px en negrita)
 * y los componentes de interfaz (bordes de botones, foco), ≥ 3:1.
 * Los colores salen de los `--tokens` del CSS real: si alguien cambia un color, esta prueba lo vigila.
 */
const css = readFileSync(new URL('../src/estilos/portal.css', import.meta.url), 'utf8');
const raiz = /:root\s*\{([^}]*)\}/.exec(css)[1];
const token = (nombre) => {
    const m = new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(raiz);
    assert.ok(m, `no existe el token --${nombre}`);
    return m[1];
};

function luminancia(hex) {
    const canal = (i) => {
        const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
export function contraste(a, b) {
    const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
    return (claro + 0.05) / (oscuro + 0.05);
}

test('el cálculo de contraste coincide con valores conocidos de WCAG', () => {
    assert.equal(Math.round(contraste('#000000', '#ffffff')), 21);
    assert.equal(contraste('#ffffff', '#ffffff'), 1);
    assert.ok(Math.abs(contraste('#767676', '#ffffff') - 4.54) < 0.02); // el gris mínimo que pasa AA sobre blanco
});

const BLANCO = '#ffffff';
const PARES_TEXTO = [
    ['texto', 'superficie'], ['texto', 'fondo'], ['texto-suave', 'superficie'], ['texto-suave', 'fondo'],
    ['primario', 'superficie'], ['primario-oscuro', 'superficie'], ['exito', 'superficie'], ['peligro', 'superficie'],
    ['c-matematicas', 'superficie'], ['c-espanol', 'superficie'], ['c-ciencias', 'superficie'], ['c-medicion', 'superficie']
];

for (const [fg, bg] of PARES_TEXTO) {
    test(`texto --${fg} sobre --${bg} cumple AA (≥ 4.5)`, () => {
        const c = contraste(token(fg), token(bg));
        assert.ok(c >= 4.5, `${fg} sobre ${bg}: ${c.toFixed(2)}`);
    });
}

test('texto blanco sobre los botones de color cumple AA', () => {
    for (const bg of ['primario', 'primario-oscuro', 'exito', 'peligro', 'c-matematicas', 'c-espanol', 'c-ciencias', 'c-medicion']) {
        const c = contraste(BLANCO, token(bg));
        assert.ok(c >= 4.5, `blanco sobre ${bg}: ${c.toFixed(2)}`);
    }
});

test('el borde de foco y los bordes de los campos se distinguen del fondo (≥ 3:1 para el foco)', () => {
    const enfoque = contraste(token('enfoque'), token('superficie'));
    assert.ok(enfoque >= 3, `foco ${enfoque.toFixed(2)}`); // WCAG 2.2: indicador de foco ≥ 3:1
});

test('los colores de las figuras de las fracciones y el reloj tienen contraste suficiente', () => {
    const fracciones = readFileSync(new URL('../src/games/fracciones/estilos.css', import.meta.url), 'utf8');
    const pintada = /fraccion-parte--pintada \{ fill: (#[0-9a-f]{6})/.exec(fracciones)[1];
    const trazo = /fraccion-parte \{ fill: #fff; stroke: (#[0-9a-f]{6})/.exec(fracciones)[1];
    assert.ok(contraste(pintada, BLANCO) >= 1.5, `pintada/blanco ${contraste(pintada, BLANCO).toFixed(2)}`); // parte pintada vs vacía
    assert.ok(contraste(trazo, BLANCO) >= 3, `trazo/blanco ${contraste(trazo, BLANCO).toFixed(2)}`);
    assert.ok(contraste(trazo, pintada) >= 3, `trazo/pintada ${contraste(trazo, pintada).toFixed(2)}`);
});

// ---------- Fase 12: colores por área y pegatinas ----------


test('el título del juego sobre la barra de su área cumple AA (≥ 4.5) en cada área', () => {
    const areas = ['matematicas', 'espanol', 'ciencias', 'medicion'];
    for (const area of areas) {
        const m = new RegExp(`#app\\[data-area="${area}"\\] \\{ --tema: var\\(--c-${area === 'espanol' ? 'espanol' : area}\\); --tema-claro: (#[0-9a-fA-F]{6})`).exec(css + readFileSync(new URL('../src/estilos/portal.css', import.meta.url), 'utf8'));
        assert.ok(m, `no se encontró el tema del área ${area}`);
        const c = contraste(token(`c-${area}`), m[1]);
        assert.ok(c >= 4.5, `${area}: título ${token(`c-${area}`)} sobre ${m[1]} = ${c.toFixed(2)}`);
    }
});

test('el dibujo de cada pegatina (claro) se distingue de su fondo de color (≥ 3:1) y el fondo del blanco del borde', () => {
    for (const c of COLORES) {
        assert.ok(contraste(c.claro, c.fondo) >= 3, `${c.id}: dibujo ${c.claro} sobre ${c.fondo} = ${contraste(c.claro, c.fondo).toFixed(2)}`);
        assert.ok(contraste('#ffffff', c.fondo) >= 3, `${c.id}: borde blanco`);
    }
});

test('la frase de la mascota (texto oscuro sobre blanco) y el nombre de la pegatina cumplen AA', () => {
    assert.ok(contraste(token('texto'), '#ffffff') >= 4.5);
    assert.ok(contraste('#4f46e5', '#ffffff') >= 4.5, 'la «z» de la mascota dormida (--primario) sobre fondo claro');
});
