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
