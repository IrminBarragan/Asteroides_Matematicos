import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, jugarPartidaFracciones } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

const opciones = { skip: MOTIVO_OMITIR };

const conVozFalsa = () => {
    window.__dicho = [];
    window.SpeechSynthesisUtterance = function (texto) { this.text = texto; };
    Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { speak(f) { window.__dicho.push(f.text); }, cancel() {}, getVoices() { return [{ lang: 'es-MX', name: 'Falsa' }]; } }
    });
};

/** Hace la misión de inicio de Fracciones y deja al jugador en la pantalla de resultados. */
async function hacerMision(pagina) {
    await abrirJuego(pagina, 'Tren de Fracciones');
    const { lecciones } = await jugarPartidaFracciones(pagina);
    assert.deepEqual(lecciones, [], 'en la misión de inicio se MIDE: no se muestran lecciones de introducción');
}

/** En la partida actual de Fracciones, se equivoca a propósito hasta que aparece «Ver cómo se hace». */
async function equivocarseHastaVerElBoton(pagina) {
    for (let q = 0; q < 8; q++) {
        await pagina.waitForSelector('.fracciones-juego__enunciado:not(:empty)');
        await pagina.evaluate(() => new Promise((r) => setTimeout(r, 40)));
        if (await pagina.locator('.modal-fondo--leccion').count()) await pagina.click('.modal-fondo--leccion >> text=Saltar');
        if (await pagina.locator('.fraccion-parte[tabindex]').count()) { // «pintar»
            // pintar TODAS las partes siempre es un error (hay que pintar menos de las que tiene la figura)
            const partes = pagina.locator('.fraccion-parte');
            for (let i = 0; i < await partes.count(); i++) await partes.nth(i).click();
            await pagina.click('text=Comprobar');
        } else {
            const botones = pagina.locator('.fracciones-juego__opcion');
            for (let i = 0; i < await botones.count(); i++) {
                await botones.nth(i).click();
                if (await pagina.locator('.boton-ensenar').isVisible() || await pagina.locator('text=Siguiente ➜').isVisible()) break;
            }
        }
        if (await pagina.locator('.boton-ensenar').isVisible()) return;
        if (await pagina.locator('text=Siguiente ➜').isVisible()) await pagina.click('text=Siguiente ➜');
    }
    throw new Error('no se logró equivocarse');
}

test('tras la misión, la PRIMERA vez que aparece una habilidad se muestra su introducción (omitible) y no se repite', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Mateo', grado: 6 });
    await hacerMision(pagina);

    await pagina.click('text=Jugar otra vez');
    await pagina.waitForSelector('.modal-fondo--leccion');
    assert.match(await pagina.textContent('.leccion__titulo'), /^Antes de empezar: /);
    assert.match(await pagina.textContent('.leccion__contador'), /Paso 1 de \d/);
    assert.ok(await pagina.locator('text=Saltar').isVisible(), 'la introducción se puede saltar');
    // la 1.ª pregunta puede ser de «pintar» (sin opciones): basta con que el juego siga montado detrás
    assert.equal(await pagina.locator('.fracciones-juego__enunciado').isVisible(), true, 'el juego está detrás, no se cerró');

    // la leemos entera avanzando con «Siguiente»
    for (let g = 0; g < 6 && await pagina.locator('text=¡Entendido!').count() === 0; g++) await pagina.click('.modal__acciones .boton--primario');
    await pagina.click('text=¡Entendido!');
    await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });

    // el resto de la partida: sin repetir la misma introducción
    const { lecciones } = await jugarPartidaFracciones(pagina);
    assert.equal(new Set(lecciones).size, lecciones.length, `se repitió una introducción: ${lecciones}`);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('«Ver cómo se hace» aparece tras equivocarse, abre un ejemplo resuelto y Escape lo cierra sin perder la pregunta', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Mateo', grado: 6 });
    await hacerMision(pagina);
    await pagina.click('text=Jugar otra vez');
    await pagina.waitForSelector('.modal-fondo--leccion');
    await pagina.click('.modal-fondo--leccion >> text=Saltar');

    assert.equal(await pagina.locator('.boton-ensenar').isVisible(), false, 'oculto mientras no se equivoque');
    await equivocarseHastaVerElBoton(pagina);
    const enunciado = await pagina.textContent('.fracciones-juego__enunciado');
    await pagina.click('.boton-ensenar');
    await pagina.waitForSelector('.modal-fondo--leccion');
    assert.match(await pagina.textContent('.leccion__titulo'), /^Un ejemplo de /);
    assert.match(await pagina.textContent('.leccion__texto'), /ejemplo parecido|clave/i);
    await pagina.keyboard.press('Escape');
    await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });

    assert.equal(await pagina.textContent('.fracciones-juego__enunciado'), enunciado, 'sigue la misma pregunta');
    assert.ok(await pagina.locator('.boton-ensenar').isVisible(), 'puede volver a verla');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('Asteroides: tras fallar se ofrece una lección con material y «hazlo tú» que hay que resolver para avanzar', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Ana', grado: 2 });
    await abrirJuego(pagina, 'Asteroides Matemáticos');
    // Sin tocar nada, el asteroide se escapa (cuenta como fallo): aparece el botón de la lección
    await pagina.waitForSelector('.boton-ensenar', { state: 'visible', timeout: 45000 });
    await pagina.click('.boton-ensenar');
    await pagina.waitForSelector('.modal-fondo--leccion');
    const titulo = await pagina.textContent('.leccion__titulo');
    assert.match(titulo, /Sumar|Restar|suma|resta|Completar/i);
    assert.ok(await pagina.locator('.leccion__visual svg, .leccion__visual pre').count() > 0, 'trae material visual');

    // se recorre completa; en cada «hazlo tú» se prueban las opciones hasta acertar
    let vioHazlo = false;
    for (let g = 0; g < 10; g++) {
        const opcionesHazlo = pagina.locator('.leccion__opcion');
        if (await opcionesHazlo.count()) {
            vioHazlo = true;
            assert.equal(await pagina.locator('.modal__acciones .boton--primario').isDisabled(), true, 'no se avanza sin resolverlo');
            for (let i = 0; i < await opcionesHazlo.count(); i++) {
                if (await pagina.locator('.modal__acciones .boton--primario').isEnabled()) break;
                await opcionesHazlo.nth(i).click();
            }
            assert.match(await pagina.textContent('.leccion__mensaje'), /¡Eso es!/);
        }
        if (await pagina.locator('text=¡Entendido!').count()) break;
        await pagina.click('.modal__acciones .boton--primario');
    }
    assert.ok(vioHazlo, 'la lección tiene al menos un «hazlo tú»');
    await pagina.click('text=¡Entendido!');
    await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });
    assert.ok(await pagina.locator('canvas').isVisible());
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('la lección con voz: «Escuchar» lee el paso actual con palabras', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: conVozFalsa });
    await crearJugador(pagina, { apodo: 'Mateo', grado: 6 });
    await hacerMision(pagina);
    await pagina.click('text=Jugar otra vez');
    await pagina.waitForSelector('.modal-fondo--leccion');
    await pagina.click('.modal-fondo--leccion >> text=Escuchar');
    const dicho = await pagina.evaluate(() => window.__dicho);
    assert.ok(dicho.length >= 1 && dicho.at(-1).length > 5);
    assert.ok(!/\d\/\d/.test(dicho.at(-1)), `las fracciones se dicen con palabras: «${dicho.at(-1)}»`);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('móvil (375×667): la lección cabe, se puede recorrer y no desborda horizontalmente', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { ancho: 375, alto: 667 });
    await crearJugador(pagina, { apodo: 'Mateo', grado: 6 });
    await hacerMision(pagina);
    await pagina.click('text=Jugar otra vez');
    await pagina.waitForSelector('.modal-fondo--leccion');
    const medidas = await pagina.evaluate(() => {
        const d = document.querySelector('.modal.leccion').getBoundingClientRect();
        return { ancho: document.documentElement.scrollWidth, izq: d.left, der: d.right, vw: window.innerWidth };
    });
    assert.ok(medidas.ancho <= medidas.vw + 1, `desborda: ${JSON.stringify(medidas)}`);
    assert.ok(medidas.izq >= 0 && medidas.der <= medidas.vw, `el diálogo se sale: ${JSON.stringify(medidas)}`);
    await pagina.click('.modal-fondo--leccion >> text=Saltar');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});
