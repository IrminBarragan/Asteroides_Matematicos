import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, resolverPreguntaCalculo, jugarPartidaCalculo, saltarLeccion } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

for (const grado of [1, 3, 6]) {
    test(`Taller de Cálculo, ${grado}.º: misión de inicio y partida normal, resolviendo con el material`, { skip: MOTIVO_OMITIR }, async () => {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador);
        await crearJugador(pagina, { grado });
        await abrirJuego(pagina, 'Taller de Cálculo');

        // Misión de inicio: 8 preguntas sin material (se mide, no se enseña)
        assert.match(await pagina.textContent('.aviso'), /Misión de inicio/);
        const mision = await jugarPartidaCalculo(pagina);
        assert.equal(mision.preguntas, 8);
        assert.ok(mision.vias.every((v) => v === 'calculo' || v === 'tanteo'), `sin material en la misión: ${mision.vias}`);
        assert.match(await pagina.textContent('body'), /Misión cumplida/);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 1);

        // Partida normal: arranca con ayuda y el material de verdad se usa
        await pagina.click('text=Jugar otra vez');
        await pagina.waitForSelector('.calculo-juego__enunciado:not(:empty)');
        assert.match(await pagina.textContent('.calculo-juego__dato'), /de 10/);
        const normal = await jugarPartidaCalculo(pagina);
        assert.equal(normal.preguntas, 10);
        assert.ok(normal.vias.some((v) => v === 'marcos' || v === 'recta'), `se usó material: ${normal.vias}`);
        assert.ok(await pagina.locator('.estrellas .estrella--llena').count() >= 2, 'resolviendo bien, al menos 2 estrellas');
        await pagina.click('text=Más juegos');
        await pagina.waitForSelector('.tarjeta-juego');
        assert.deepEqual(problemas, [], problemas.join(' | '));
        await contexto.close();
    });
}

test('Taller de Cálculo: la ayuda se retira con los aciertos', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 3 });
    await abrirJuego(pagina, 'Taller de Cálculo');
    await jugarPartidaCalculo(pagina); // misión

    // Cada habilidad necesita 3 preguntas para llegar a «Sin ayuda»; se juega hasta verlo (máx. 3 partidas)
    const etiquetas = [];
    for (let partida = 0; partida < 3 && !etiquetas.includes('Sin ayuda'); partida++) {
        await pagina.click('text=Jugar otra vez');
        for (let i = 0; i < 10; i++) {
            const { apoyo } = await resolverPreguntaCalculo(pagina);
            etiquetas.push(apoyo);
            await pagina.click('text=Siguiente ➜');
        }
        await pagina.waitForSelector('text=Jugar otra vez');
    }
    assert.ok(etiquetas.includes('Sin ayuda'), `con aciertos la ayuda se retira del todo: ${etiquetas}`);
    assert.equal(etiquetas[0], 'Con material', 'la primera pregunta lleva ayuda');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('Taller de Cálculo: equivocarse con la recta da pista y «Ver cómo se hace», y se puede corregir', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 4 });
    // se reinicia hasta que la primera pregunta tenga la recta obligatoria (nivel 1 → ayuda completa)
    let con = false;
    for (let i = 0; i < 30 && !con; i++) {
        await abrirJuego(pagina, 'Taller de Cálculo');
        if (i === 0) { await jugarPartidaCalculo(pagina); await pagina.click('text=Jugar otra vez'); await pagina.waitForSelector('.calculo-juego__enunciado:not(:empty)'); }
        await saltarLeccion(pagina);
        con = (await pagina.locator('.recta-int').count()) > 0 && (await pagina.locator('.calculo-juego__opcion').count()) === 0;
        if (!con) { await pagina.click('text=← Salir'); await pagina.click('text=Sí, salir'); await pagina.waitForSelector('.tarjeta-juego'); }
    }
    assert.ok(con, 'debe aparecer una pregunta con recta obligatoria');
    const { via } = await resolverPreguntaCalculo(pagina, { fallarPrimero: true });
    assert.equal(via, 'recta');
    assert.match(await pagina.textContent('.calculo-juego__mensaje'), /Lo lograste! \+5 puntos/, 'recuperar da la mitad de puntos');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('Taller de Cálculo: la recta se maneja con teclado y la posición se anuncia', { skip: MOTIVO_OMITIR }, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 3 });
    let hay = false;
    for (let i = 0; i < 40 && !hay; i++) {
        await abrirJuego(pagina, 'Taller de Cálculo');
        if (i === 0) { await jugarPartidaCalculo(pagina); await pagina.click('text=Jugar otra vez'); await pagina.waitForSelector('.calculo-juego__enunciado:not(:empty)'); }
        await saltarLeccion(pagina);
        hay = (await pagina.locator('.recta-int:visible').count()) > 0;
        if (!hay && (await pagina.locator('button:has-text("Usar la recta")').count())) {
            await pagina.click('button:has-text("Usar la recta")');
            hay = true;
        }
        if (!hay) { await pagina.click('text=← Salir'); await pagina.click('text=Sí, salir'); await pagina.waitForSelector('.tarjeta-juego'); }
    }
    assert.ok(hay, 'debe aparecer la recta');
    const antes = Number(/Estás en: (\d+)/.exec(await pagina.textContent('.recta-int__posicion'))[1]);
    await pagina.focus('.recta-int__fila--avanza button >> nth=1');
    await pagina.keyboard.press('Enter');
    await pagina.keyboard.press('Enter');
    assert.equal(Number(/Estás en: (\d+)/.exec(await pagina.textContent('.recta-int__posicion'))[1]), antes + 20);
    assert.equal(await pagina.getAttribute('.recta-int__posicion', 'aria-live'), 'polite');
    await pagina.click('text=Deshacer');
    assert.equal(Number(/Estás en: (\d+)/.exec(await pagina.textContent('.recta-int__posicion'))[1]), antes + 10);
    await pagina.click('text=Empezar de nuevo');
    assert.equal(Number(/Estás en: (\d+)/.exec(await pagina.textContent('.recta-int__posicion'))[1]), antes);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('Taller de Cálculo: en un celular no hay desplazamiento horizontal con marcos ni con recta', { skip: MOTIVO_OMITIR }, async () => {
    for (const grado of [2, 6]) {
        const { pagina, contexto, problemas } = await nuevaPagina(navegador, { ancho: 360, alto: 740 });
        await crearJugador(pagina, { grado });
        await abrirJuego(pagina, 'Taller de Cálculo');
        await jugarPartidaCalculo(pagina); // misión
        await pagina.click('text=Jugar otra vez');
        for (let i = 0; i < 4; i++) {
            await pagina.waitForSelector('.calculo-juego__enunciado:not(:empty)');
            const ancho = await pagina.evaluate(() => ({ doc: document.documentElement.scrollWidth, vis: window.innerWidth }));
            assert.ok(ancho.doc <= ancho.vis, `grado ${grado}, pregunta ${i + 1}: ${ancho.doc} > ${ancho.vis}`);
            await resolverPreguntaCalculo(pagina);
            await pagina.click('text=Siguiente ➜');
        }
        assert.deepEqual(problemas, []);
        await contexto.close();
    }
});
