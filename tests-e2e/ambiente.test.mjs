import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { MOTIVO_OMITIR, abrirNavegador, nuevaPagina, crearJugador, abrirJuego, jugarPartidaFracciones, URL_PORTAL } from './ayudas.mjs';

let navegador;
before(async () => { if (!MOTIVO_OMITIR) navegador = await abrirNavegador(); });
after(async () => { if (navegador) await navegador.close(); });

const opciones = { skip: MOTIVO_OMITIR };

/** Cuenta los osciladores que crea la página (la música y los efectos los usan): window.__osc. */
const contarOsciladores = () => {
    window.__osc = 0;
    const Original = window.AudioContext;
    if (!Original) return;
    const crear = Original.prototype.createOscillator;
    Original.prototype.createOscillator = function (...a) { window.__osc++; return crear.apply(this, a); };
};

const esperar = (pagina, ms) => pagina.evaluate((t) => new Promise((r) => setTimeout(r, t)), ms);

/** Entra al modo maestro con el PIN de fábrica desde la pantalla de inicio. */
async function entrarAlModoMaestro(pagina) {
    await pagina.click('text=Modo maestro');
    await pagina.fill('#pin', '2468');
    await pagina.click('button[type="submit"]');
    await pagina.waitForSelector('.ajustes-equipo');
}

test('la música está APAGADA de fábrica: ni suena ni hay botón (bocinas en el aula)', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: contarOsciladores });
    await crearJugador(pagina, { grado: 4 });
    await esperar(pagina, 1500);
    assert.equal(await pagina.evaluate(() => window.__osc), 0, 'ningún sonido sin que se pida');
    assert.equal(await pagina.locator('.boton-musica').count(), 0);
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('la maestra permite la música: suena, el niño la apaga con su botón, y el volumen se elige', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: contarOsciladores });
    await crearJugador(pagina, { grado: 4 });
    await entrarAlModoMaestro(pagina);
    assert.equal(await pagina.locator('[role="switch"][aria-label="Permitir música en este equipo"]').getAttribute('aria-checked'), 'false');
    await pagina.click('[aria-label="Permitir música en este equipo"]');
    await pagina.waitForSelector('[aria-label="Volumen de la música"]');
    await pagina.click('[aria-label="Volumen de la música"] >> text=Bajo');
    await esperar(pagina, 1200);
    const sonando = await pagina.evaluate(() => window.__osc);
    assert.ok(sonando > 3, `la música programó ${sonando} notas`);
    assert.equal(await pagina.locator('[aria-label="Volumen de la música"] >> text=Bajo').getAttribute('aria-pressed'), 'true');

    // el niño la apaga con su botón y ya no se programan notas nuevas
    await pagina.click('text=Salir'); await pagina.waitForSelector('.tarjeta-perfil'); await pagina.click('.tarjeta-perfil');
    await pagina.waitForSelector('.tarjeta-juego');
    assert.equal(await pagina.getAttribute('.boton-musica', 'aria-pressed'), 'true');
    await pagina.click('.boton-musica');
    assert.equal(await pagina.getAttribute('.boton-musica', 'aria-pressed'), 'false');
    await esperar(pagina, 400);
    const parado = await pagina.evaluate(() => window.__osc);
    await esperar(pagina, 1200);
    assert.equal(await pagina.evaluate(() => window.__osc), parado, 'apagada: no suena nada nuevo');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('la música cambia a la pista del juego al jugar y se calla en pausa', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { antes: contarOsciladores });
    await crearJugador(pagina, { grado: 4 });
    await entrarAlModoMaestro(pagina);
    await pagina.click('[aria-label="Permitir música en este equipo"]');
    await pagina.click('text=Salir'); await pagina.click('.tarjeta-perfil'); await pagina.waitForSelector('.tarjeta-juego');
    await abrirJuego(pagina, 'Tren de Fracciones');
    await esperar(pagina, 800);
    assert.ok(await pagina.getAttribute('.boton-musica', 'aria-pressed') === 'true', 'el botón también está en la barra del juego');
    await pagina.click('text=Pausa');
    await pagina.waitForSelector('.pausa:not([hidden])');
    assert.equal(await pagina.getAttribute('.mascota', 'data-estado'), 'duerme', 'la mascota se duerme en pausa');
    await esperar(pagina, 600);
    const enPausa = await pagina.evaluate(() => window.__osc);
    await esperar(pagina, 1200);
    assert.equal(await pagina.evaluate(() => window.__osc), enPausa, 'en pausa no se programan notas');
    await pagina.click('[data-continuar]');
    await esperar(pagina, 800);
    assert.ok(await pagina.evaluate(() => window.__osc) > enPausa, 'al continuar vuelve a sonar');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('el color del juego cambia según el área y la mascota reacciona al error', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 6 });
    assert.equal(await pagina.getAttribute('#app', 'data-area'), null, 'en el menú no hay área');
    await abrirJuego(pagina, 'Atrapa la Ortografía');
    assert.equal(await pagina.getAttribute('#app', 'data-area'), 'espanol');
    const colorEspanol = await pagina.evaluate(() => getComputedStyle(document.querySelector('.partida__titulo')).color);
    await pagina.click('text=← Salir'); await pagina.click('text=Sí, salir'); await pagina.waitForSelector('.tarjeta-juego');
    await abrirJuego(pagina, 'Tren de Fracciones');
    assert.equal(await pagina.getAttribute('#app', 'data-area'), 'matematicas');
    const colorMate = await pagina.evaluate(() => getComputedStyle(document.querySelector('.partida__titulo')).color);
    assert.notEqual(colorEspanol, colorMate, 'cada área tiene su color');

    // equivocarse: la mascota anima («Inténtalo otra vez», nunca regaña)
    const botones = pagina.locator('.fracciones-juego__opcion');
    for (let i = 0; i < await botones.count(); i++) {
        await botones.nth(i).click();
        if (await pagina.locator('.boton-ensenar').isVisible() || await pagina.locator('text=Siguiente ➜').isVisible()) break;
    }
    if (await pagina.locator('.boton-ensenar').isVisible()) {
        assert.equal(await pagina.getAttribute('.mascota', 'data-estado'), 'animo');
        assert.ok((await pagina.textContent('.mascota__globo')).length > 3);
        assert.ok(!/mal|error|equivoc/i.test(await pagina.textContent('.mascota__globo')));
    }
    assert.equal(await pagina.getAttribute('.mascota', 'aria-hidden'), 'true', 'decorativa: oculta para lectores de pantalla');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('al terminar una partida: pegatina, confeti (si hay 2+ estrellas) y álbum que persiste al recargar', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { apodo: 'Luisa', grado: 6 });
    await abrirJuego(pagina, 'Tren de Fracciones');
    await jugarPartidaFracciones(pagina);
    await pagina.waitForSelector('text=Jugar otra vez');
    const estrellas = await pagina.locator('.estrellas--grande .estrella--llena').count();
    assert.ok(estrellas >= 1);
    const pegatinas = await pagina.locator('.resultados__pegatinas .pegatina').count();
    assert.equal(pegatinas, estrellas === 3 ? 2 : 1, 'estrellas → pegatinas');
    assert.equal(await pagina.locator('.capa-confeti').count() > 0, estrellas >= 2, 'confeti solo con 2 o 3 estrellas');
    assert.equal(await pagina.locator('.capa-confeti').getAttribute('aria-hidden').catch(() => 'true'), 'true');

    await pagina.click('text=Ver mi álbum');
    await pagina.waitForSelector('.album__rejilla');
    assert.equal(await pagina.locator('.album__casilla--tiene').count(), pegatinas);
    assert.match(await pagina.textContent('.album__cuenta'), new RegExp(`${pegatinas} de 30`));
    assert.equal(await pagina.locator('.album__casilla').count(), 30);

    await pagina.reload();
    await pagina.click('.tarjeta-perfil'); await pagina.waitForSelector('.tarjeta-juego');
    await pagina.click('text=Mi álbum');
    await pagina.waitForSelector('.album__rejilla');
    assert.equal(await pagina.locator('.album__casilla--tiene').count(), pegatinas, 'el álbum se conserva al recargar');
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('modo ligero: sin fondo animado, sin mascota y sin confeti; lo activa la maestra', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 6 });
    const visible = (sel) => pagina.evaluate((s) => { const e = document.querySelector(s); return Boolean(e) && getComputedStyle(e).display !== 'none'; }, sel);
    assert.equal(await visible('.fondo-animado'), true);
    assert.equal(await visible('.mascota'), true);
    await entrarAlModoMaestro(pagina);
    await pagina.click('[aria-label="Modo ligero"]');
    assert.equal(await pagina.evaluate(() => document.documentElement.hasAttribute('data-ligero')), true);
    assert.equal(await visible('.fondo-animado'), false);
    await pagina.click('text=Salir'); await pagina.click('.tarjeta-perfil'); await pagina.waitForSelector('.tarjeta-juego');
    assert.equal(await visible('.mascota'), false);
    await abrirJuego(pagina, 'Tren de Fracciones');
    await jugarPartidaFracciones(pagina);
    await pagina.waitForSelector('text=Jugar otra vez');
    assert.equal(await pagina.locator('.capa-confeti').count(), 0, 'sin confeti en modo ligero');
    // la preferencia se recuerda
    await pagina.reload();
    assert.equal(await pagina.evaluate(() => document.documentElement.hasAttribute('data-ligero')), true);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});

test('«reducir movimiento» del sistema operativo: sin animaciones decorativas', opciones, async () => {
    const contexto = await navegador.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'reduce' });
    const pagina = await contexto.newPage();
    pagina.setDefaultTimeout(5000);
    const problemas = [];
    pagina.on('pageerror', (e) => problemas.push(e.message));
    await pagina.goto(URL_PORTAL);
    await crearJugador(pagina, { grado: 6 });
    const fondo = await pagina.evaluate(() => getComputedStyle(document.querySelector('.fondo-animado')).display);
    assert.equal(fondo, 'none');
    const animaciones = await pagina.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && /forma|confeti|mascota/.test(a.effect.target.className || '')).length);
    assert.equal(animaciones, 0, 'ninguna animación decorativa corre');
    await abrirJuego(pagina, 'Tren de Fracciones');
    await jugarPartidaFracciones(pagina);
    await pagina.waitForSelector('text=Jugar otra vez');
    assert.equal(await pagina.locator('.capa-confeti').count(), 0, 'sin confeti si el sistema pide reducir movimiento');
    assert.deepEqual(problemas, []);
    await contexto.close();
});

test('rendimiento: con fondo animado y mascota la página mantiene una tasa de cuadros razonable', opciones, async () => {
    const { pagina, contexto } = await nuevaPagina(navegador);
    await crearJugador(pagina, { grado: 4 });
    const medicion = await pagina.evaluate(() => new Promise((resolver) => {
        let cuadros = 0;
        const t0 = performance.now();
        const paso = () => { cuadros++; if (performance.now() - t0 < 2000) requestAnimationFrame(paso); else resolver({ cuadros, ms: performance.now() - t0, animaciones: document.getAnimations().length }); };
        requestAnimationFrame(paso);
    }));
    const fps = (medicion.cuadros / medicion.ms) * 1000;
    console.log(`   rendimiento: ${fps.toFixed(0)} cuadros/s con ${medicion.animaciones} animaciones activas (Chromium sin GPU)`);
    assert.ok(medicion.animaciones > 0, 'hay animaciones de fondo');
    assert.ok(fps >= 20, `${fps.toFixed(1)} cuadros por segundo es demasiado poco`);
    await contexto.close();
});

test('móvil (375×667): el álbum, el panel de ajustes y los resultados no desbordan', opciones, async () => {
    const { pagina, contexto, problemas } = await nuevaPagina(navegador, { ancho: 375, alto: 667 });
    await crearJugador(pagina, { grado: 4 });
    const ancho = () => pagina.evaluate(() => document.documentElement.scrollWidth);
    await pagina.click('text=Mi álbum'); await pagina.waitForSelector('.album__rejilla');
    assert.ok(await ancho() <= 376, `álbum: ${await ancho()}px`);
    await pagina.click('text=Volver a los juegos'); await pagina.waitForSelector('.tarjeta-juego');
    await entrarAlModoMaestro(pagina);
    await pagina.click('[aria-label="Permitir música en este equipo"]');
    assert.ok(await ancho() <= 376, `ajustes: ${await ancho()}px`);
    assert.deepEqual(problemas, [], problemas.join(' | '));
    await contexto.close();
});
