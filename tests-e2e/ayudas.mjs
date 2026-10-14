/**
 * Ayudas de las pruebas de navegador (end-to-end).
 *
 * Abren `dist/index.html` por `file://` EXACTAMENTE como se hará en la escuela (doble clic, sin servidor)
 * en un Chromium sin interfaz, y vigilan tres cosas en todas las pruebas: errores de consola, errores de la página
 * y cualquier petición que no sea local (el portal debe funcionar sin internet).
 *
 * Necesitan un Chromium. Se busca en CHROMIUM_PATH, en PLAYWRIGHT_BROWSERS_PATH y en rutas comunes;
 * si no hay ninguno, las pruebas se OMITEN (no fallan) y lo dicen.
 */
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const URL_PORTAL = pathToFileURL(path.join(raiz, 'dist', 'index.html')).href;

export function buscarChromium() {
    const candidatos = [process.env.CHROMIUM_PATH];
    const navegadores = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    candidatos.push(path.join(navegadores, 'chromium'));
    if (existsSync(navegadores)) {
        for (const d of readdirSync(navegadores)) {
            candidatos.push(path.join(navegadores, d, 'chrome-linux', 'chrome'), path.join(navegadores, d, 'chrome-linux64', 'chrome'));
        }
    }
    candidatos.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
    return candidatos.find((c) => c && existsSync(c)) || null;
}

export const RUTA_CHROMIUM = buscarChromium();
export const MOTIVO_OMITIR = RUTA_CHROMIUM ? false : 'No hay Chromium (define CHROMIUM_PATH). Prueba de navegador omitida.';

export async function abrirNavegador() {
    return chromium.launch({ executablePath: RUTA_CHROMIUM, args: ['--no-sandbox'] });
}

/** Página nueva con los vigilantes puestos. `problemas` junta todo lo que no debería pasar. */
export async function nuevaPagina(navegador, { ancho = 1280, alto = 800, antes = null } = {}) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto } });
    const pagina = await contexto.newPage();
    pagina.setDefaultTimeout(5000);
    const problemas = [];
    pagina.on('pageerror', (e) => problemas.push(`error de página: ${e.message}`));
    pagina.on('console', (m) => { if (m.type() === 'error') problemas.push(`consola: ${m.text()}`); });
    pagina.on('request', (r) => {
        const u = r.url();
        if (!/^(file|data|blob):/.test(u)) problemas.push(`petición NO local: ${u}`);
    });
    pagina.on('requestfailed', (r) => problemas.push(`petición fallida: ${r.url()}`));
    if (antes) await pagina.addInitScript(antes);
    await pagina.goto(URL_PORTAL);
    return { pagina, contexto, problemas };
}

/** Crea un jugador con el formulario real (apodo, avatar, grado) y deja la pantalla de inicio abierta. */
export async function crearJugador(pagina, { apodo = 'Prueba', grado = 3 } = {}) {
    await pagina.fill('#apodo', apodo);
    await pagina.locator('label.opcion:has(input[name="avatar"])').first().click();
    await pagina.locator(`label.opcion:has(input[name="grado"][value="${grado}"])`).click();
    await pagina.click('button[type="submit"]');
    await pagina.waitForSelector('.tarjeta-juego');
}

export const nombresDeJuegos = (pagina) => pagina.locator('.tarjeta-juego h3').allTextContents();

export async function abrirJuego(pagina, nombre) {
    await pagina.click(`button[aria-label="Jugar ${nombre}"]`);
    await pagina.waitForSelector('.partida .zona-juego > *');
}

/** «← Salir» → confirma el diálogo → vuelve al inicio. */
export async function salirDelJuego(pagina) {
    await pagina.click('text=← Salir');
    await pagina.click('text=Sí, salir');
    await pagina.waitForSelector('.tarjeta-juego');
}

/**
 * Juega una partida COMPLETA de Tren de Fracciones como lo haría un niño sin saber las respuestas: en cada pregunta
 * de opciones prueba los botones en orden hasta acertar (cada error da una pista y se puede reintentar); en «pintar»
 * toca las partes que pide el enunciado. Si aparece una lección de introducción, la salta (y la anota).
 * @returns {Promise<{preguntas:number, lecciones:string[]}>}  cuántas preguntas se jugaron y los títulos de las lecciones vistas
 */
export async function jugarPartidaFracciones(pagina) {
    const lecciones = [];
    for (let guardia = 0; guardia < 14; guardia++) {
        const que = await Promise.race([
            pagina.waitForSelector('.fracciones-juego__enunciado:not(:empty)').then(() => 'pregunta'),
            pagina.waitForSelector('text=Jugar otra vez').then(() => 'fin')
        ]);
        if (que === 'fin') return { preguntas: guardia, lecciones };
        await pagina.evaluate(() => new Promise((r) => setTimeout(r, 40))); // deja que aparezca una lección de introducción, si toca
        if (await pagina.locator('.modal-fondo--leccion').count()) {
            lecciones.push(await pagina.textContent('.leccion__titulo'));
            await pagina.click('.modal-fondo--leccion >> text=Saltar');
            await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });
        }
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
    throw new Error('la partida no terminó en 14 preguntas');
}

/**
 * Resuelve la pregunta de «Taller de Cálculo» que hay en pantalla como lo haría un niño que SÍ sabe: usa el material
 * si es obligatorio (fichas o saltos) y, si no, calcula la operación. En problemas (sin material) prueba los botones
 * en orden hasta acertar. Devuelve cómo se resolvió, para que las pruebas vean que el material de verdad se usó.
 * @returns {Promise<{via:'marcos'|'recta'|'calculo'|'tanteo', apoyo:string}>}
 */
export async function resolverPreguntaCalculo(pagina, { fallarPrimero = false } = {}) {
    await pagina.waitForSelector('.calculo-juego__enunciado:not(:empty)');
    await pagina.evaluate(() => new Promise((r) => setTimeout(r, 40))); // por si aparece una lección de introducción
    if (await pagina.locator('.modal-fondo--leccion').count()) {
        await pagina.click('.modal-fondo--leccion >> text=Saltar');
        await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });
    }
    const enunciado = await pagina.textContent('.calculo-juego__enunciado');
    const consigna = (await pagina.textContent('.calculo-juego__consigna')) || '';
    const apoyo = (await pagina.textContent('.calculo-juego__dato--apoyo')) || '';
    const opciones = pagina.locator('.calculo-juego__opcion');
    const clicOpcion = async (texto) => pagina.locator('.calculo-juego__opcion', { hasText: new RegExp(`^${texto}$`) }).click();
    let via;

    const ecuacion = /^(\d+) ([+−]) (\d+) = \?$/.exec(enunciado);
    const obligatorio = (await opciones.count()) === 0;
    if (obligatorio && /Pon (\d+) fichas azules y (\d+) fichas naranjas/.test(consigna)) {
        const [, a, b] = /Pon (\d+) fichas azules y (\d+) fichas naranjas/.exec(consigna);
        for (let i = 0; i < Number(a); i++) await pagina.click('text=Poner azul');
        for (let i = 0; i < Number(b); i++) await pagina.click('text=Poner naranja');
        await pagina.waitForSelector('.calculo-juego__opcion');
        await clicOpcion(String(Number(a) + Number(b)));
        via = 'marcos';
    } else if (obligatorio && /Hay (\d+) fichas\. Tacha (\d+)/.test(consigna)) {
        const [, a, b] = /Hay (\d+) fichas\. Tacha (\d+)/.exec(consigna);
        for (let i = 0; i < Number(b); i++) await pagina.locator('button.marcos__casilla--a').first().click();
        await pagina.waitForSelector('.calculo-juego__opcion');
        await clicOpcion(String(Number(a) - Number(b)));
        via = 'marcos';
    } else if (obligatorio && /Empiezas en (\d+)\. (Avanza|Retrocede) (\d+)/.test(consigna)) {
        const [, , verbo, b] = /Empiezas en (\d+)\. (Avanza|Retrocede) (\d+)/.exec(consigna);
        if (fallarPrimero) {
            await pagina.click('text=Listo'); // sin moverse: se queda en el número de partida
            await pagina.waitForSelector('text=/Casi\\. Llegaste a/');
        }
        const fila = verbo === 'Avanza' ? '.recta-int__fila--avanza' : '.recta-int__fila--retrocede';
        const signo = verbo === 'Avanza' ? '+' : '−';
        const digitos = String(b).split('').reverse();
        for (let p = 0; p < digitos.length; p++) {
            for (let i = 0; i < Number(digitos[p]); i++) await pagina.locator(`${fila} button`, { hasText: new RegExp(`^\\${signo}${10 ** p}$`) }).click();
        }
        await pagina.click('text=Listo');
        via = 'recta';
    } else if (ecuacion) {
        const [, a, signo, b] = ecuacion;
        const r = signo === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
        if (fallarPrimero) {
            const mala = await opciones.evaluateAll((bs, bien) => bs.map((x) => x.textContent).find((t) => t !== String(bien)), r);
            await clicOpcion(mala);
        }
        await clicOpcion(String(r));
        via = 'calculo';
    } else {
        const total = await opciones.count();
        for (let i = 0; i < total; i++) {
            await opciones.nth(i).click();
            if (await pagina.locator('text=Siguiente ➜').isVisible()) break;
        }
        via = 'tanteo';
    }
    await pagina.waitForSelector('text=Siguiente ➜', { state: 'visible' });
    return { via, apoyo };
}

/** Juega una partida COMPLETA de «Taller de Cálculo» resolviendo bien cada pregunta. @returns {Promise<{preguntas:number, vias:string[]}>} */
export async function jugarPartidaCalculo(pagina, { max = 14 } = {}) {
    const vias = [];
    for (let guardia = 0; guardia < max; guardia++) {
        const que = await Promise.race([
            pagina.waitForSelector('.calculo-juego__enunciado:not(:empty)').then(() => 'pregunta'),
            pagina.waitForSelector('text=Jugar otra vez').then(() => 'fin')
        ]);
        if (que === 'fin') return { preguntas: guardia, vias };
        vias.push((await resolverPreguntaCalculo(pagina)).via);
        await pagina.click('text=Siguiente ➜');
    }
    throw new Error(`la partida no terminó en ${max} preguntas`);
}
