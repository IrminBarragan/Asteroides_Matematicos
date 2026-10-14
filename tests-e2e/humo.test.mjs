import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, nombresDeJuegos, abrirJuego, salirDelJuego } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

const opciones = { skip: MOTIVO_OMITIR };

test('el portal abre sin errores, sin internet, y pide crear un jugador', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    assert.equal(await pagina.textContent('h1'), '¡Bienvenido!');
    assert.equal(await pagina.evaluate(() => document.documentElement.lang), 'es');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('el formulario valida: sin apodo, sin avatar o sin grado no avanza y avisa', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await pagina.click('button[type="submit"]');
    assert.match(await pagina.textContent('.error-formulario'), /nombre|apodo/i);
    await pagina.fill('#apodo', 'Ana');
    await pagina.click('button[type="submit"]');
    assert.match(await pagina.textContent('.error-formulario'), /amigo/i);
    await pagina.locator('label.opcion:has(input[name="avatar"])').first().click();
    await pagina.click('button[type="submit"]');
    assert.match(await pagina.textContent('.error-formulario'), /grado/i);
    assert.equal(await pagina.locator('.tarjeta-juego').count(), 0);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('un apodo con HTML no se ejecuta (XSS): se limpia el «<>» y además se muestra siempre como texto', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: '<img src=x onerror=window.__xss=1>', grado: 3 });
    assert.equal(await pagina.evaluate(() => window.__xss), undefined);
    assert.equal(await pagina.locator('img[src="x"]').count(), 0);
    const texto = await pagina.textContent('body');
    assert.ok(!texto.includes('<img'), 'los signos < y > se eliminan al guardar el apodo');
    assert.match(texto, /img src=x/, 'lo que queda se ve como texto normal');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

// Cada grado ve sus juegos; entre los 6 grados se abren los 8 juegos del portal.
const vistos = new Set();
for (const grado of [1, 2, 3, 4, 5, 6]) {
    test(`${grado}.º: cada juego abre, se pausa con Escape, continúa y se puede salir`, opciones, async () => {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador);
        await crearJugador(pagina, { grado });
        const juegos = await nombresDeJuegos(pagina);
        assert.ok(juegos.length >= 2, `el ${grado}.º debería tener al menos 2 juegos, tiene ${juegos.length}`);
        for (const nombre of juegos) {
            vistos.add(nombre);
            await abrirJuego(pagina, nombre);
            await pagina.keyboard.press('Escape');
            await pagina.waitForSelector('.pausa:not([hidden])');
            await pagina.click('[data-continuar]');
            await pagina.waitForSelector('.pausa', { state: 'hidden' });
            await salirDelJuego(pagina);
        }
        assert.deepEqual(problemas, [], `${grado}.º: ${problemas.join(' | ')}`);
        await contexto.close();
    });
}

test('entre los 6 grados se probaron los 8 juegos', opciones, () => {
    assert.deepEqual([...vistos].sort(), ['Asteroides Matemáticos', 'Atrapa la Ortografía', 'Bloques de Valor', 'Cajas y Reparto', 'Memorama de Palabras', 'Reloj Aventurero', 'Taller de Cálculo', 'Tren de Fracciones']);
});

test('el jugador se conserva al recargar y se puede elegir de nuevo', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Luisa', grado: 4 });
    await pagina.reload();
    assert.equal(await pagina.textContent('h1'), '¿Quién juega?');
    await pagina.click('.tarjeta-perfil');
    await pagina.waitForSelector('.tarjeta-juego');
    assert.match(await pagina.textContent('body'), /Luisa/);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('móvil (375×667): ninguna pantalla se desborda horizontalmente', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { ancho: 375, alto: 667 });
    const sinDesborde = (donde) => pagina.evaluate((d) => {
        const ancho = document.documentElement.scrollWidth;
        return { donde: d, ok: ancho <= window.innerWidth + 1, ancho };
    }, donde);
    const revisiones = [await sinDesborde('crear')];
    await crearJugador(pagina, { grado: 3 });
    revisiones.push(await sinDesborde('inicio'));
    for (const nombre of await nombresDeJuegos(pagina)) {
        await abrirJuego(pagina, nombre);
        revisiones.push(await sinDesborde(nombre));
        await salirDelJuego(pagina);
    }
    assert.deepEqual(revisiones.filter((r) => !r.ok), []);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('sin fugas: abrir y cerrar juegos 10 veces no acumula elementos en la página', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 4 });
    const nodos = () => pagina.evaluate(() => document.querySelectorAll('*').length);
    const conteos = [];
    for (let i = 0; i < 10; i++) {
        for (const nombre of ['Tren de Fracciones', 'Reloj Aventurero', 'Atrapa la Ortografía']) {
            await abrirJuego(pagina, nombre);
            await salirDelJuego(pagina);
        }
        conteos.push(await nodos());
    }
    assert.ok(conteos.every((c) => c === conteos[0]), `los elementos cambian entre vueltas: ${conteos}`);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('rendimiento: el portal carga y se pinta en menos de 2 segundos', opciones, async () => {
    const { pagina, contexto } = await nuevaPagina(navegador);
    const t = await pagina.evaluate(() => {
        const [nav] = performance.getEntriesByType('navigation');
        return { dcl: nav.domContentLoadedEventEnd, carga: nav.loadEventEnd };
    });
    assert.ok(t.dcl < 2000 && t.carga < 2000, JSON.stringify(t));
    await contexto.close();
});
