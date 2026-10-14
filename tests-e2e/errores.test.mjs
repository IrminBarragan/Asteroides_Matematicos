import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, resolverPreguntaCalculo, jugarPartidaCalculo } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

async function entrarAlModoMaestro(pagina) {
    await pagina.click('text=Modo maestro');
    await pagina.fill('#pin', '2468');
    await pagina.click('button[type="submit"]');
    await pagina.waitForSelector('.ajustes-equipo');
}

test('las equivocaciones se acumulan y el modo maestro muestra «lo que más confunden» y exporta el CSV', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Mateo', grado: 6 });
    await abrirJuego(pagina, 'Taller de Cálculo');
    // Misión: se equivoca primero en 3 preguntas y luego las resuelve, y las demás las resuelve bien
    for (let i = 0; i < 8; i++) {
        await resolverPreguntaCalculo(pagina, { fallarPrimero: i < 3 });
        await pagina.click('text=Siguiente ➜');
        if (await pagina.locator('text=Jugar otra vez').count()) break;
    }
    await pagina.waitForSelector('text=Jugar otra vez');
    await pagina.click('text=Más juegos');
    await pagina.waitForSelector('.tarjeta-juego');
    await entrarAlModoMaestro(pagina);
    assert.ok(await pagina.locator('.maestro-errores').count(), 'aparece la sección «Lo que más confunden»');
    const texto = await pagina.textContent('.maestro-errores');
    assert.match(texto, /Lo que más confunden/);
    assert.match(texto, /Taller de Cálculo/);
    const filas = await pagina.locator('.maestro-errores tbody tr').count();
    assert.ok(filas >= 1, 'al menos una equivocación');
    const veces = await pagina.locator('.maestro-errores tbody tr').evaluateAll((trs) => trs.reduce((s, tr) => s + Number(tr.cells[3].textContent), 0));
    assert.equal(veces, 3, 'las tres equivocaciones intencionales, ni más ni menos');

    const [descarga] = await Promise.all([pagina.waitForEvent('download'), pagina.click('text=Descargar equivocaciones (CSV)')]);
    assert.equal(descarga.suggestedFilename(), 'equivocaciones.csv');
    const csv = await readFile(await descarga.path(), 'utf8');
    assert.match(csv, /jugador,grado,juego,habilidad,equivocacion,veces/);
    assert.match(csv, /Mateo,6,Taller de Cálculo,/);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('sin equivocaciones no aparece la sección (y los CSV siguen funcionando)', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Lola', grado: 3 });
    await abrirJuego(pagina, 'Taller de Cálculo');
    await jugarPartidaCalculo(pagina); // todo bien a la primera
    await pagina.click('text=Más juegos');
    await pagina.waitForSelector('.tarjeta-juego');
    await entrarAlModoMaestro(pagina);
    assert.equal(await pagina.locator('.maestro-errores').count(), 0);
    assert.ok(await pagina.locator('text=Descargar equivocaciones (CSV)').count());
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});
