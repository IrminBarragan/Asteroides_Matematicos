import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, resolverPreguntaBloques, jugarPartidaBloques, saltarLeccion } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

for (const grado of [1, 3, 6]) {
    test(`Bloques de Valor, ${grado}.º: misión de inicio y partida normal, resolviendo con los bloques`, { skip: MOTIVO_OMITIR }, async () => {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador);
        await crearJugador(pagina, { grado });
        await abrirJuego(pagina, 'Bloques de Valor');

        assert.match(await pagina.textContent('.aviso'), /Misión de inicio/);
        const mision = await jugarPartidaBloques(pagina);
        assert.equal(mision.preguntas, 8);
        assert.ok(mision.vias.every((v) => v === 'leer' || v === 'calculo'), `la misión no lleva bloques que manipular: ${mision.vias}`);
        assert.match(await pagina.textContent('body'), /Misión cumplida/);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 1);

        await pagina.click('text=Jugar otra vez');
        await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
        assert.match(await pagina.textContent('.juego-material__dato'), /de 10/);
        const normal = await jugarPartidaBloques(pagina);
        assert.equal(normal.preguntas, 10);
        assert.ok(normal.vias.some((v) => ['construir', 'juntar', 'quitar'].includes(v)), `se manipularon bloques: ${normal.vias}`);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 2, 'resolviendo bien, al menos 2 estrellas');
        await pagina.click('text=Más juegos');
        await pagina.waitForSelector('.tarjeta-juego');
        assert.deepEqual(problemas, [], problemas.join(' | '));
        await contexto.close();
    });
}

/** Juega partidas (con la misión ya hecha) hasta que aparezca una pregunta que se resuelva con ese tipo de bloques. */
async function irAPregunta(pagina, via, { intentos = 40 } = {}) {
    for (let i = 0; i < intentos; i++) {
        await saltarLeccion(pagina);
        const consigna = (await pagina.textContent('.juego-material__consigna')) || '';
        const hay = { juntar: consigna.startsWith('Junta los bloques'), quitar: consigna.startsWith('Están los bloques'), construir: consigna.startsWith('Construye') }[via];
        if (hay && (await pagina.locator('.juego-material__opcion').count()) === 0) return;
        await resolverPreguntaBloques(pagina);
        await pagina.click('text=Siguiente ➜');
        if (await pagina.locator('text=Jugar otra vez').count()) { await pagina.click('text=Jugar otra vez'); await pagina.waitForSelector('.juego-material__enunciado:not(:empty)'); }
    }
    throw new Error(`no apareció una pregunta de «${via}»`);
}

async function empezarConMisionHecha(grado, ancho = 1280, alto = 800) {
    const r = await nuevaPagina(navegador, { ancho, alto });
    await crearJugador(r.pagina, { grado });
    await abrirJuego(r.pagina, 'Bloques de Valor');
    await jugarPartidaBloques(r.pagina); // misión
    await r.pagina.click('text=Jugar otra vez');
    await r.pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
    return r;
}

test('Bloques de Valor: sumar con llevada — las opciones aparecen al cambiar 10 por 1, y equivocarse da pista y se corrige', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(4);
    await irAPregunta(pagina, 'juntar');
    assert.equal(await pagina.locator('.bloques-valor__columna--llena').count() >= 1, true, 'una columna con 10 o más se marca');
    // con teclado: se enfoca el botón «10 → 1» y se activa con Enter
    const cambio = pagina.locator('.bloques-valor__cambio:not([disabled])').first();
    await cambio.focus();
    const antes = await pagina.locator('.bloques-valor__resumen').textContent();
    await pagina.keyboard.press('Enter');
    assert.notEqual(await pagina.locator('.bloques-valor__resumen').textContent(), antes, 'el cambio se ve en el resumen');
    // las opciones aparecen exactamente cuando ya no queda ninguna columna con 10 o más
    const faltan = await pagina.locator('.bloques-valor__columna--llena').count();
    assert.equal((await pagina.locator('.juego-material__opcion').count()) > 0, faltan === 0, 'opciones ⇔ nada más que cambiar');
    // deshacer y empezar de nuevo
    await pagina.click('text=Deshacer');
    assert.equal(await pagina.locator('.bloques-valor__resumen').textContent(), antes);
    const { via } = await resolverPreguntaBloques(pagina, { fallarPrimero: true });
    assert.ok(['juntar', 'calculo'].includes(via), via);
    assert.match(await pagina.textContent('.juego-material__mensaje'), /Lo lograste! \+5 puntos/);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Bloques de Valor: restar con préstamo — se cambia 1 por 10 y se quita', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(4);
    await irAPregunta(pagina, 'quitar');
    const { via } = await resolverPreguntaBloques(pagina);
    assert.equal(via, 'quitar');
    assert.match(await pagina.textContent('.juego-material__mensaje'), /Correcto|Muy bien|Excelente|Genial|Perfecto/);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Bloques de Valor: armar un número con + y −', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(3);
    await irAPregunta(pagina, 'construir');
    const antes = await pagina.locator('.bloques-valor__resumen').textContent();
    await pagina.locator('.bloques-valor__columna--0 button[aria-label^="Poner"]').click();
    assert.notEqual(await pagina.locator('.bloques-valor__resumen').textContent(), antes);
    await pagina.locator('.bloques-valor__columna--0 button[aria-label^="Quitar"]').click();
    assert.equal(await pagina.locator('.bloques-valor__resumen').textContent(), antes, 'quitar deja como estaba');
    assert.equal(await pagina.locator('.bloques-valor__columna--0 button[aria-label^="Quitar"]').isDisabled(), true, 'no se pueden quitar bloques que no hay');
    const { via } = await resolverPreguntaBloques(pagina);
    assert.equal(via, 'construir');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Bloques de Valor: la ayuda se retira con los aciertos', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await empezarConMisionHecha(3);
    const etiquetas = [];
    for (let partida = 0; partida < 3 && !etiquetas.includes('Sin ayuda'); partida++) {
        for (let i = 0; i < 10; i++) {
            const { apoyo } = await resolverPreguntaBloques(pagina);
            etiquetas.push(apoyo);
            await pagina.click('text=Siguiente ➜');
        }
        await pagina.waitForSelector('text=Jugar otra vez');
        if (!etiquetas.includes('Sin ayuda')) { await pagina.click('text=Jugar otra vez'); await pagina.waitForSelector('.juego-material__enunciado:not(:empty)'); }
    }
    assert.ok(etiquetas.includes('Sin ayuda'), `la ayuda se retira del todo: ${etiquetas}`);
    assert.equal(etiquetas[0], 'Con bloques', 'la primera pregunta lleva ayuda');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('Bloques de Valor: en un celular de 360 px no hay desplazamiento horizontal con cuatro columnas', { skip: MOTIVO_OMITIR }, async () => {
    for (const grado of [3, 6]) {
        const { pagina, contexto, problemas } = await empezarConMisionHecha(grado, 360, 740);
        for (let i = 0; i < 6; i++) {
            await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
            await saltarLeccion(pagina);
            const ancho = await pagina.evaluate(() => ({ doc: document.documentElement.scrollWidth, vis: window.innerWidth }));
            assert.ok(ancho.doc <= ancho.vis, `grado ${grado}, pregunta ${i + 1}: ${ancho.doc} > ${ancho.vis}`);
            await resolverPreguntaBloques(pagina);
            await pagina.click('text=Siguiente ➜');
        }
        assert.deepEqual(problemas, []);
        await contexto.close();
    }
});
