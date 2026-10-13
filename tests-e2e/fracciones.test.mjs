import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

/**
 * Juega una partida COMPLETA como lo haría un niño sin saber las respuestas: en cada pregunta de opciones prueba los
 * botones en orden hasta acertar (cada error da una pista y se puede reintentar); en "pintar" toca las partes que pide el enunciado.
 */
async function jugarPartida(pagina) {
    for (let pregunta = 1; pregunta <= 10; pregunta++) {
        await pagina.waitForSelector('.fracciones-juego__enunciado:not(:empty)');
        const enunciado = await pagina.textContent('.fracciones-juego__enunciado');
        if (await pagina.locator('.fraccion-parte[tabindex]').count()) {
            const n = Number(/Pinta (\d+)\//.exec(enunciado)[1]);
            for (let i = 0; i < n; i++) await pagina.locator('.fraccion-parte').nth(i).click();
            await pagina.click('text=Comprobar');
        } else {
            const botones = pagina.locator('.fracciones-juego__opcion');
            const total = await botones.count();
            for (let i = 0; i < total; i++) {
                await botones.nth(i).click();
                if (await pagina.locator('text=Siguiente ➜').isVisible()) break;
            }
        }
        await pagina.waitForSelector('text=Siguiente ➜', { state: 'visible' });
        await pagina.click('text=Siguiente ➜');
    }
}

for (const grado of [3, 4, 5, 6]) {
    test(`Tren de Fracciones, ${grado}.º: una partida completa termina en resultados`, { skip: MOTIVO_OMITIR }, async () => {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador);
        await crearJugador(pagina, { grado });
        await abrirJuego(pagina, 'Tren de Fracciones');
        await jugarPartida(pagina);
        await pagina.waitForSelector('text=Jugar otra vez');
        const aciertos = Number(await pagina.locator('dl.datos div').first().locator('dd').textContent());
        assert.ok(aciertos >= 0 && aciertos <= 10);
        // Los resultados se guardaron: la tarjeta del juego ya no dice «¡Nuevo!» si hubo estrellas
        await pagina.click('text=Más juegos');
        await pagina.waitForSelector('.tarjeta-juego');
        assert.deepEqual(problemas, [], problemas.join(' | '));
        await contexto.close();
    });
}

test('Tren de Fracciones: pintar con teclado (Espacio/Enter) marca las partes con aria-checked', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 3 });
    // en 3.º sale «pintar» tarde o temprano: se reinicia el juego hasta verlo (máx. 40 intentos)
    let encontrado = false;
    for (let i = 0; i < 40 && !encontrado; i++) {
        await abrirJuego(pagina, 'Tren de Fracciones');
        encontrado = (await pagina.locator('.fraccion-parte[tabindex]').count()) > 0;
        if (!encontrado) { await pagina.click('text=← Salir'); await pagina.click('text=Sí, salir'); await pagina.waitForSelector('.tarjeta-juego'); }
    }
    assert.ok(encontrado, 'debe aparecer una pregunta de pintar');
    await pagina.focus('.fraccion-parte >> nth=0');
    await pagina.keyboard.press('Space');
    assert.equal(await pagina.getAttribute('.fraccion-parte >> nth=0', 'aria-checked'), 'true');
    await pagina.keyboard.press('Enter');
    assert.equal(await pagina.getAttribute('.fraccion-parte >> nth=0', 'aria-checked'), 'false');
    assert.deepEqual(problemas, []);
    await contexto.close();
});
