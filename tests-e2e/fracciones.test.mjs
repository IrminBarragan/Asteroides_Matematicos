import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, jugarPartidaFracciones } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

const jugarPartida = async (pagina) => (await jugarPartidaFracciones(pagina)).preguntas;

for (const grado of [3, 4, 5, 6]) {
    test(`Tren de Fracciones, ${grado}.º: la misión de inicio y una partida normal terminan en resultados`, { skip: MOTIVO_OMITIR }, async () => {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador);
        await crearJugador(pagina, { grado });
        await abrirJuego(pagina, 'Tren de Fracciones');

        // 1.ª vez: MISIÓN DE INICIO (8 preguntas). Se juega «a lo bruto» (probando botones hasta acertar):
        // en la v1 eso daba 0 estrellas; ahora esforzarse da al menos una.
        assert.match(await pagina.textContent('.aviso'), /Misión de inicio/);
        assert.match(await pagina.textContent('.fracciones-juego__dato'), /de 8/);
        const preguntasMision = await jugarPartida(pagina);
        assert.equal(preguntasMision, 8);
        assert.match(await pagina.textContent('body'), /Misión cumplida/);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 1, 'terminar la misión da al menos 1 estrella');

        // 2.ª vez: partida normal de 10 preguntas
        await pagina.click('text=Jugar otra vez');
        await pagina.waitForSelector('.fracciones-juego__enunciado:not(:empty)');
        assert.match(await pagina.textContent('.fracciones-juego__dato'), /de 10/);
        assert.equal(await jugarPartida(pagina), 10);
        assert.equal(await pagina.locator('text=Misión cumplida').count(), 0);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 1);
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
