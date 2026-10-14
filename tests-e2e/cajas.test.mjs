import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, resolverPreguntaCajas, jugarPartidaCajas, saltarLeccion } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

for (const grado of [1, 3, 6]) {
    test(`Cajas y Reparto, ${grado}.º: misión de inicio y partida normal, resolviendo con el material`, { skip: MOTIVO_OMITIR }, async () => {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador);
        await crearJugador(pagina, { grado });
        await abrirJuego(pagina, 'Cajas y Reparto');

        assert.match(await pagina.textContent('.aviso'), /Misión de inicio/);
        const mision = await jugarPartidaCajas(pagina);
        assert.equal(mision.preguntas, 8);
        assert.ok(mision.vias.every((v) => v === 'calculo'), `la misión no lleva material que manipular: ${mision.vias}`);
        assert.match(await pagina.textContent('body'), /Misión cumplida/);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 1);

        await pagina.click('text=Jugar otra vez');
        await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
        assert.match(await pagina.textContent('.juego-material__dato'), /de 10/);
        const normal = await jugarPartidaCajas(pagina);
        assert.equal(normal.preguntas, 10);
        if (grado <= 3) assert.ok(normal.vias.some((v) => ['grupos', 'reparto', 'cuadricula'].includes(v)), `se manipuló material: ${normal.vias}`);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 2, 'resolviendo bien, al menos 2 estrellas');
        await pagina.click('text=Más juegos');
        await pagina.waitForSelector('.tarjeta-juego');
        assert.deepEqual(problemas, [], problemas.join(' | '));
        await contexto.close();
    });
}

async function empezarConMisionHecha(grado, ancho = 1280, alto = 800) {
    const r = await nuevaPagina(navegador, { ancho, alto });
    await crearJugador(r.pagina, { grado });
    await abrirJuego(r.pagina, 'Cajas y Reparto');
    await jugarPartidaCajas(r.pagina); // misión
    await r.pagina.click('text=Jugar otra vez');
    await r.pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
    return r;
}

/** Sigue jugando (bien) hasta que aparezca una pregunta con ese material obligatorio. */
async function irAPregunta(pagina, empieza, { intentos = 50 } = {}) {
    for (let i = 0; i < intentos; i++) {
        await saltarLeccion(pagina);
        const consigna = (await pagina.textContent('.juego-material__consigna')) || '';
        if (empieza.test(consigna) && (await pagina.locator('.juego-material__opcion').count()) === 0) return;
        await resolverPreguntaCajas(pagina);
        await pagina.click('text=Siguiente ➜');
        if (await pagina.locator('text=Jugar otra vez').count()) { await pagina.click('text=Jugar otra vez'); await pagina.waitForSelector('.juego-material__enunciado:not(:empty)'); }
    }
    throw new Error(`no apareció una pregunta con la consigna ${empieza}`);
}

test('Cajas y Reparto: repartir de uno en uno — las opciones aparecen cuando el reparto es justo y ya no alcanza', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(3);
    await irAPregunta(pagina, /^Reparte/);
    const platos = await pagina.locator('.grupos-obj__grupo').count();
    // un reparto parejo a medias no basta
    await pagina.locator('.grupos-obj__grupo').first().locator('button[aria-label^="Dar uno"]').click();
    assert.equal(await pagina.locator('.juego-material__opcion').count(), 0, 'un plato con uno y los demás con cero: no es justo');
    assert.equal(platos >= 2, true);
    await pagina.click('text=Deshacer');
    const { via } = await resolverPreguntaCajas(pagina, { fallarPrimero: true });
    assert.equal(via, 'reparto');
    assert.match(await pagina.textContent('.juego-material__mensaje'), /Lo lograste! \+5 puntos/);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Cajas y Reparto: poner el mismo número en cada caja con + y −', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(2);
    await irAPregunta(pagina, /^Pon \d+/);
    const caja = pagina.locator('.grupos-obj__grupo').first();
    await caja.locator('button[aria-label^="Poner uno"]').click();
    assert.equal(await caja.locator('.grupos-obj__numero').textContent(), '1');
    await caja.locator('button[aria-label^="Quitar uno"]').click();
    assert.equal(await caja.locator('.grupos-obj__numero').textContent(), '0');
    assert.equal(await caja.locator('button[aria-label^="Quitar uno"]').isDisabled(), true, 'no se pueden quitar objetos que no hay');
    const { via } = await resolverPreguntaCajas(pagina);
    assert.equal(via, 'grupos');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Cajas y Reparto: armar una cuadrícula con filas y columnas', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(3);
    await irAPregunta(pagina, /^Arma una cuadrícula/);
    await pagina.click('button[aria-label="Agregar una fila"]');
    await pagina.click('button[aria-label="Agregar una columna"]');
    assert.equal(await pagina.locator('.cuadricula__cuadro').count(), 1);
    await pagina.click('text=Deshacer');
    await pagina.click('text=Deshacer');
    assert.equal(await pagina.locator('.cuadricula__cuadro').count(), 0);
    assert.equal(await pagina.locator('button[aria-label="Quitar una fila"]').isDisabled(), true);
    const { via } = await resolverPreguntaCajas(pagina);
    assert.equal(via, 'cuadricula');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Cajas y Reparto: la ayuda se retira con los aciertos', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(3);
    const etiquetas = [];
    for (let partida = 0; partida < 3 && !etiquetas.includes('Sin ayuda'); partida++) {
        for (let i = 0; i < 10; i++) {
            const { apoyo } = await resolverPreguntaCajas(pagina);
            etiquetas.push(apoyo);
            await pagina.click('text=Siguiente ➜');
        }
        await pagina.waitForSelector('text=Jugar otra vez');
        if (!etiquetas.includes('Sin ayuda')) { await pagina.click('text=Jugar otra vez'); await pagina.waitForSelector('.juego-material__enunciado:not(:empty)'); }
    }
    assert.ok(etiquetas.includes('Sin ayuda'), `la ayuda se retira del todo: ${etiquetas}`);
    assert.equal(etiquetas[0], 'Con material', 'la primera pregunta lleva ayuda');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('Cajas y Reparto: en un celular de 360 px no hay desplazamiento horizontal con cajas, platos y cuadrículas', { skip: MOTIVO_OMITIR }, async () => {
    for (const grado of [2, 3]) {
        const { pagina, contexto, problemas } = await empezarConMisionHecha(grado, 360, 740);
        for (let i = 0; i < 8; i++) {
            await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
            await saltarLeccion(pagina);
            // se comprueba con el material a medio armar, que es cuando más ancho se pone
            const ancho = await pagina.evaluate(() => ({ doc: document.documentElement.scrollWidth, vis: window.innerWidth }));
            assert.ok(ancho.doc <= ancho.vis, `grado ${grado}, pregunta ${i + 1}: ${ancho.doc} > ${ancho.vis}`);
            await resolverPreguntaCajas(pagina);
            const final = await pagina.evaluate(() => ({ doc: document.documentElement.scrollWidth, vis: window.innerWidth }));
            assert.ok(final.doc <= final.vis, `grado ${grado}, pregunta ${i + 1} resuelta: ${final.doc} > ${final.vis}`);
            await pagina.click('text=Siguiente ➜');
        }
        assert.deepEqual(problemas, []);
        await contexto.close();
    }
});
