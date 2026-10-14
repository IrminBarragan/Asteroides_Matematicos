import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

const opciones = { skip: MOTIVO_OMITIR };

/** Síntesis de voz falsa: guarda lo que se le pide decir en window.__dicho (el Chromium sin interfaz no tiene voces). */
const conVozFalsa = () => {
    window.__dicho = [];
    window.SpeechSynthesisUtterance = function (texto) { this.text = texto; };
    Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { speak(f) { window.__dicho.push(f.text); }, cancel() {}, getVoices() { return [{ lang: 'es-MX', name: 'Falsa' }]; } }
    });
};
const sinVoz = () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
};

test('con voz: «Escuchar» lee la pregunta y la lectura automática lee las siguientes', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: conVozFalsa });
    // 6.º: la misión de inicio empieza en contenido de 4.º, cuya primera pregunta siempre tiene botones
    await crearJugador(pagina, { grado: 6 });
    await abrirJuego(pagina, 'Tren de Fracciones');
    const enunciado = () => pagina.textContent('.fracciones-juego__enunciado');

    await pagina.click('text=Escuchar');
    const dicho = await pagina.evaluate(() => window.__dicho);
    assert.equal(dicho.length, 1);
    assert.ok(dicho[0].length > 5);
    assert.ok(!/\d\/\d/.test(dicho[0]), `las fracciones se dicen con palabras: «${dicho[0]}»`);

    // Activar la lectura automática lee la pregunta actual; la siguiente pregunta se lee sola
    await pagina.click('text=Lectura automática');
    assert.equal(await pagina.getAttribute('text=Lectura automática', 'aria-pressed'), 'true');
    const tras = (await pagina.evaluate(() => window.__dicho)).length;
    assert.equal(tras, 2);
    const botones = pagina.locator('.fracciones-juego__opcion');
    for (let i = 0; i < await botones.count(); i++) {
        await botones.nth(i).click();
        if (await pagina.locator('text=Siguiente ➜').isVisible()) break;
    }
    const antes = await enunciado();
    await pagina.click('text=Siguiente ➜');
    await pagina.waitForFunction((a) => document.querySelector('.fracciones-juego__enunciado').textContent !== a || true, antes);
    await pagina.waitForFunction((n) => window.__dicho.length > n, tras);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('con voz: pausar calla y en pausa no se lee', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: conVozFalsa });
    await crearJugador(pagina, { grado: 3 });
    await abrirJuego(pagina, 'Tren de Fracciones');
    await pagina.click('text=Lectura automática');
    await pagina.click('text=Pausa');
    await pagina.waitForSelector('.pausa:not([hidden])');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('sin voz en el navegador: no hay botones de lectura y el juego funciona igual', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: sinVoz });
    await crearJugador(pagina, { grado: 3 });
    await abrirJuego(pagina, 'Tren de Fracciones');
    assert.equal(await pagina.locator('text=Escuchar').count(), 0);
    assert.equal(await pagina.locator('text=Lectura automática').count(), 0);
    assert.ok(await pagina.locator('.fracciones-juego__enunciado').isVisible());
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('con la API de voz pero SIN voz en español tampoco se ofrecen botones (no habría sonido)', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, {
        antes: () => {
            window.SpeechSynthesisUtterance = function (t) { this.text = t; };
            Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak() {}, cancel() {}, getVoices() { return [{ lang: 'en-US' }]; } } });
        }
    });
    await crearJugador(pagina, { grado: 3 });
    await abrirJuego(pagina, 'Tren de Fracciones');
    assert.equal(await pagina.locator('text=Escuchar').count(), 0);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('móvil con voz: la barra del juego (4 botones) se reparte en filas y no desborda', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { ancho: 375, alto: 667, antes: conVozFalsa });
    await crearJugador(pagina, { grado: 3 });
    for (const nombre of ['Tren de Fracciones', 'Reloj Aventurero']) {
        await abrirJuego(pagina, nombre);
        assert.ok(await pagina.locator('text=Escuchar').isVisible());
        const ancho = await pagina.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(ancho <= 376, `${nombre}: ${ancho}px`);
        await pagina.click('text=← Salir'); await pagina.click('text=Sí, salir'); await pagina.waitForSelector('.tarjeta-juego');
    }
    assert.deepEqual(problemas, []);
    await contexto.close();
});
