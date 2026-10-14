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
 * Respuesta de un problema leyendo la historia como lo haría un niño (por sus palabras clave), o null si no la reconoce.
 * Es independiente del código del juego: solo mira el texto que se ve en pantalla.
 */
export function respuestaDeProblema(texto) {
    const n = (texto.match(/\d+/g) || []).map(Number);
    if (n.length !== 2) return null;
    const [x, y] = n;
    if (/Le dieron \d+ más y ahora tiene/.test(texto)) return y - x;   // busca el inicio: el total (segundo número) menos lo que le dieron (el primero)
    if (/Regaló \d+ y le quedaron/.test(texto)) return x + y;
    if (/Le regalan|en total/.test(texto)) return x + y;
    if (/ regala \d+\.|más tiene/.test(texto)) return x - y;
    return null;
}

/**
 * Resuelve la pregunta de «Taller de Cálculo» que hay en pantalla como lo haría un niño que SÍ sabe: usa el material
 * si es obligatorio (fichas o saltos) y, si no, calcula la operación. En problemas (sin material) prueba los botones
 * en orden hasta acertar. Devuelve cómo se resolvió, para que las pruebas vean que el material de verdad se usó.
 * @returns {Promise<{via:'marcos'|'recta'|'calculo'|'tanteo', apoyo:string}>}
 */
export async function resolverPreguntaCalculo(pagina, { fallarPrimero = false } = {}) {
    await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
    await pagina.evaluate(() => new Promise((r) => setTimeout(r, 40))); // por si aparece una lección de introducción
    if (await pagina.locator('.modal-fondo--leccion').count()) {
        await pagina.click('.modal-fondo--leccion >> text=Saltar');
        await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });
    }
    // Los números de 5 cifras o más se escriben con espacio fino («12 345»): para razonar se lee el número sin él
    const sinFino = (t) => t.replace(/\u202f/g, '');
    const enunciado = sinFino(await pagina.textContent('.juego-material__enunciado'));
    const consigna = sinFino((await pagina.textContent('.juego-material__consigna')) || '');
    const apoyo = (await pagina.textContent('.juego-material__dato--apoyo')) || '';
    const opciones = pagina.locator('.juego-material__opcion');
    const conFino = (n) => (n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') : String(n));
    const clicOpcion = async (texto) => pagina.locator('.juego-material__opcion', { hasText: new RegExp(`^${/^\d+$/.test(texto) ? conFino(Number(texto)) : texto}$`) }).click();
    let via;

    const ecuacion = /^(\d+) ([+−]) (\d+) = \?$/.exec(enunciado);
    const obligatorio = (await opciones.count()) === 0;
    if (obligatorio && /Pon (\d+) fichas azules y (\d+) fichas naranjas/.test(consigna)) {
        const [, a, b] = /Pon (\d+) fichas azules y (\d+) fichas naranjas/.exec(consigna);
        for (let i = 0; i < Number(a); i++) await pagina.click('text=Poner azul');
        for (let i = 0; i < Number(b); i++) await pagina.click('text=Poner naranja');
        await pagina.waitForSelector('.juego-material__opcion');
        await clicOpcion(String(Number(a) + Number(b)));
        via = 'marcos';
    } else if (obligatorio && /Hay (\d+) fichas\. Tacha (\d+)/.test(consigna)) {
        const [, a, b] = /Hay (\d+) fichas\. Tacha (\d+)/.exec(consigna);
        for (let i = 0; i < Number(b); i++) await pagina.locator('button.marcos__casilla--a').first().click();
        await pagina.waitForSelector('.juego-material__opcion');
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
    } else if (respuestaDeProblema(enunciado) !== null) {
        const r = respuestaDeProblema(enunciado);
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
            pagina.waitForSelector('.juego-material__enunciado:not(:empty)').then(() => 'pregunta'),
            pagina.waitForSelector('text=Jugar otra vez').then(() => 'fin')
        ]);
        if (que === 'fin') return { preguntas: guardia, vias };
        vias.push((await resolverPreguntaCalculo(pagina)).via);
        await pagina.click('text=Siguiente ➜');
    }
    throw new Error(`la partida no terminó en ${max} preguntas`);
}

/** Si hay una lección de introducción abierta, la salta (tapa el resto de la pantalla). */
export async function saltarLeccion(pagina) {
    await pagina.evaluate(() => new Promise((r) => setTimeout(r, 60)));
    if (await pagina.locator('.modal-fondo--leccion').count()) {
        await pagina.click('.modal-fondo--leccion >> text=Saltar');
        await pagina.waitForSelector('.modal-fondo--leccion', { state: 'detached' });
    }
}

// ---------- Bloques de Valor ----------

const VALOR_COLUMNA = { 'unidad': 1, 'unidades': 1, 'decena': 10, 'decenas': 10, 'centena': 100, 'centenas': 100, 'unidad de millar': 1000, 'unidades de millar': 1000, 'decena de millar': 10000, 'decenas de millar': 10000, 'centena de millar': 100000, 'centenas de millar': 100000 };
const NOMBRES_COL = Object.keys(VALOR_COLUMNA).sort((a, b) => b.length - a.length).join('|');
const INDICE_COLUMNA = { 1: 0, 10: 1, 100: 2, 1000: 3 };

/** Valor de «3 centenas, 4 decenas y 7 unidades» (cada frase vale cantidad × valor de su columna). */
export const valorDeFrases = (texto) => [...texto.matchAll(new RegExp(`(\\d+) (${NOMBRES_COL})`, 'g'))].reduce((s, m) => s + Number(m[1]) * VALOR_COLUMNA[m[2]], 0);

/**
 * Respuesta de las preguntas de «valor de las cifras» leyendo SOLO el texto de la pantalla (como lo haría un niño).
 * @returns {number|null} null si el enunciado no es de ese tipo
 */
export function respuestaDePosicion(enunciado) {
    const t = enunciado.replace(/ /g, '');
    let m = /En el número (\d+), ¿qué valor tiene la cifra (\d)\?/.exec(t);
    if (m) return Number(m[2]) * 10 ** (m[1].length - 1 - m[1].indexOf(m[2]));
    m = /¿Qué número es ([\d +]+)\?/.exec(t);
    if (m) return m[1].split(' + ').reduce((s, x) => s + Number(x), 0);
    if (/¿Qué número es .* y .*\?/.test(t)) return valorDeFrases(t);
    return null;
}

/**
 * Resuelve la pregunta de «Bloques de Valor» que hay en pantalla como un niño que SÍ sabe: usa los bloques si son
 * obligatorios (construye, cambia 10 por 1, quita y cambia 1 por 10) y, si no, lee el número o calcula.
 * @returns {Promise<{via:'construir'|'juntar'|'quitar'|'leer'|'calculo'|'tanteo', apoyo:string}>}
 */
export async function resolverPreguntaBloques(pagina, { fallarPrimero = false } = {}) {
    await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
    await saltarLeccion(pagina);
    const enunciado = await pagina.textContent('.juego-material__enunciado');
    const consigna = (await pagina.textContent('.juego-material__consigna')) || '';
    const apoyo = (await pagina.textContent('.juego-material__dato--apoyo')) || '';
    const opciones = pagina.locator('.juego-material__opcion');
    const clicOpcion = async (valor) => pagina.locator('.juego-material__opcion', { hasText: new RegExp(`^${String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, valor >= 10000 ? '\\u202f' : '')}$`) }).click();
    const columna = (c) => pagina.locator(`.bloques-valor__columna--${c}`);
    const leerCuenta = async (c) => Number(await columna(c).locator('.bloques-valor__numero').textContent());
    let via;
    let respuesta;

    const obligatorio = (await opciones.count()) === 0;
    if (obligatorio && consigna.startsWith('Construye con bloques')) {
        for (const m of consigna.matchAll(new RegExp(`(\\d+) (${NOMBRES_COL})`, 'g'))) {
            const c = INDICE_COLUMNA[VALOR_COLUMNA[m[2]]];
            for (let i = 0; i < Number(m[1]); i++) await columna(c).locator('button[aria-label^="Poner"]').click();
        }
        respuesta = valorDeFrases(consigna);
        via = 'construir';
    } else if (obligatorio && consigna.startsWith('Junta los bloques')) {
        const [a, b] = consigna.match(/\d+/g).map(Number).slice(0, 2);
        for (let c = 0; c < 4 && (await columna(c).count()); c++) {
            while ((await leerCuenta(c)) >= 10 && (await columna(c).locator('.bloques-valor__cambio').count())) await columna(c).locator('.bloques-valor__cambio').click();
        }
        respuesta = a + b;
        via = 'juntar';
    } else if (obligatorio && consigna.startsWith('Están los bloques')) {
        const [a, b] = consigna.match(/\d+/g).map(Number).slice(0, 2);
        const quitar = String(b).split('').reverse().map(Number);
        const columnas = await pagina.locator('.bloques-valor__columna').count();
        for (let c = 0; c < quitar.length; c++) {
            for (let i = 0; i < quitar[c]; i++) {
                if ((await leerCuenta(c)) === 0) {
                    // cambia 1 por 10 desde la columna más cercana de la izquierda que tenga bloques, bajando hasta esta
                    let alta = c + 1;
                    while (alta < columnas && (await leerCuenta(alta)) === 0) alta++;
                    for (let k = alta; k > c; k--) await columna(k).locator('.bloques-valor__cambio').click();
                }
                await columna(c).locator('button[aria-label^="Quitar una pieza"]').click();
            }
        }
        respuesta = a - b;
        via = 'quitar';
    } else if (enunciado.startsWith('¿Qué número muestran los bloques?')) {
        const columnas = await pagina.locator('.bloques-valor__columna').count();
        respuesta = 0;
        for (let c = 0; c < columnas; c++) respuesta += (await leerCuenta(c)) * 10 ** c;
        via = 'leer';
    } else if (/^(\d+) ([+−]) (\d+) = \?$/.test(enunciado)) {
        const [, a, signo, b] = /^(\d+) ([+−]) (\d+) = \?$/.exec(enunciado);
        respuesta = signo === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
        via = 'calculo';
    } else if (enunciado.startsWith('¿Qué número tiene')) {
        respuesta = valorDeFrases(enunciado);
        via = 'calculo';
    } else if (respuestaDePosicion(enunciado) !== null) {
        respuesta = respuestaDePosicion(enunciado);
        via = 'calculo';
    }

    if (respuesta === undefined) {
        const total = await opciones.count();
        for (let i = 0; i < total; i++) {
            await opciones.nth(i).click();
            if (await pagina.locator('text=Siguiente ➜').isVisible()) break;
        }
        via = 'tanteo';
    } else {
        await pagina.waitForSelector('.juego-material__opcion');
        if (fallarPrimero) {
            const mala = await opciones.evaluateAll((bs, bien) => bs.map((x) => x.getAttribute('aria-label')).find((t) => t.replace(/ /g, '') !== String(bien)), respuesta);
            await pagina.locator('.juego-material__opcion', { hasText: mala }).first().click();
            await pagina.waitForSelector('text=/Casi\\. Pista/');
        }
        await clicOpcion(respuesta);
    }
    await pagina.waitForSelector('text=Siguiente ➜', { state: 'visible' });
    return { via, apoyo };
}

/** Juega una partida COMPLETA de «Bloques de Valor» resolviendo bien cada pregunta. */
export async function jugarPartidaBloques(pagina, { max = 14 } = {}) {
    const vias = [];
    for (let guardia = 0; guardia < max; guardia++) {
        const que = await Promise.race([
            pagina.waitForSelector('.juego-material__enunciado:not(:empty)').then(() => 'pregunta'),
            pagina.waitForSelector('text=Jugar otra vez').then(() => 'fin')
        ]);
        if (que === 'fin') return { preguntas: guardia, vias };
        vias.push((await resolverPreguntaBloques(pagina)).via);
        await pagina.click('text=Siguiente ➜');
    }
    throw new Error(`la partida no terminó en ${max} preguntas`);
}

// ---------- Cajas y Reparto ----------

/** Respuesta de lo que se ve en el enunciado (multiplicar, dividir, repartir), o null si no lo reconoce. */
export function respuestaDeCajas(enunciado) {
    let m = /^(\d+) × (\d+) = \?$/.exec(enunciado);
    if (m) return Number(m[1]) * Number(m[2]);
    m = /^(\d+) ÷ (\d+) = \?$/.exec(enunciado);
    if (m) return Number(m[1]) / Number(m[2]);
    m = /^\? × (\d+) = (\d+)$/.exec(enunciado) || /^(\d+) × \? = (\d+)$/.exec(enunciado);
    if (m) return Number(m[2]) / Number(m[1]);
    m = /^Se reparten (\d+) \S+ en partes iguales entre (\d+) platos\. ¿\S+ \S+ (sobran|le tocan a cada plato)\?$/.exec(enunciado);
    if (m) return m[3] === 'sobran' ? Number(m[1]) % Number(m[2]) : Math.floor(Number(m[1]) / Number(m[2]));
    m = /^(\d+) (?:cajas|bolsas|canastas|charolas) con (\d+) /.exec(enunciado);
    if (m) return Number(m[1]) * Number(m[2]);
    m = /^Una cuadrícula tiene (\d+) filas y (\d+) columnas/.exec(enunciado);
    if (m) return Number(m[1]) * Number(m[2]);
    return null;
}

/**
 * Resuelve la pregunta de «Cajas y Reparto» que hay en pantalla como un niño que SÍ sabe: usa el material si es
 * obligatorio (pone objetos en las cajas, reparte de uno en uno, arma la cuadrícula) y, si no, calcula.
 * @returns {Promise<{via:'grupos'|'reparto'|'cuadricula'|'calculo'|'tanteo', apoyo:string}>}
 */
export async function resolverPreguntaCajas(pagina, { fallarPrimero = false } = {}) {
    await pagina.waitForSelector('.juego-material__enunciado:not(:empty)');
    await saltarLeccion(pagina);
    const enunciado = await pagina.textContent('.juego-material__enunciado');
    const consigna = (await pagina.textContent('.juego-material__consigna')) || '';
    const apoyo = (await pagina.textContent('.juego-material__dato--apoyo')) || '';
    const opciones = pagina.locator('.juego-material__opcion');
    const obligatorio = (await opciones.count()) === 0;
    let via;
    let respuesta = respuestaDeCajas(enunciado);

    if (obligatorio && /^Pon (\d+) /.test(consigna)) {
        const b = Number(/^Pon (\d+) /.exec(consigna)[1]);
        const grupos = await pagina.locator('.grupos-obj__grupo').count();
        for (let g = 0; g < grupos; g++) for (let i = 0; i < b; i++) await pagina.locator('.grupos-obj__grupo').nth(g).locator('button[aria-label^="Poner uno"]').click();
        via = 'grupos';
    } else if (obligatorio && consigna.startsWith('Reparte')) {
        const platos = await pagina.locator('.grupos-obj__grupo').count();
        let monton = Number(await pagina.locator('.grupos-obj__monton-numero').textContent());
        while (monton >= platos) {
            for (let g = 0; g < platos; g++) await pagina.locator('.grupos-obj__grupo').nth(g).locator('button[aria-label^="Dar uno"]').click();
            monton -= platos;
        }
        via = 'reparto';
    } else if (obligatorio && /^Arma una cuadrícula/.test(consigna)) {
        const [f, c] = consigna.match(/\d+/g).map(Number);
        for (let i = 0; i < f; i++) await pagina.click('button[aria-label="Agregar una fila"]');
        for (let i = 0; i < c; i++) await pagina.click('button[aria-label="Agregar una columna"]');
        via = 'cuadricula';
    } else if (obligatorio && /^La cuadrícula tiene/.test(consigna)) {
        const [f, total] = consigna.match(/\d+/g).map(Number);
        for (let i = 0; i < total / f; i++) await pagina.click('button[aria-label="Agregar una columna"]');
        via = 'cuadricula';
    } else if (respuesta !== null) {
        via = 'calculo';
    }

    if (respuesta === null) {
        const total = await opciones.count();
        for (let i = 0; i < total; i++) {
            await opciones.nth(i).click();
            if (await pagina.locator('text=Siguiente ➜').isVisible()) break;
        }
        via = 'tanteo';
    } else {
        await pagina.waitForSelector('.juego-material__opcion');
        if (fallarPrimero) {
            const mala = await opciones.evaluateAll((bs, bien) => bs.map((x) => x.getAttribute('aria-label')).find((t) => t !== String(bien)), respuesta);
            await pagina.locator('.juego-material__opcion', { hasText: new RegExp(`^${mala}$`) }).first().click();
            await pagina.waitForSelector('text=/Casi\\. Pista/');
        }
        await pagina.locator('.juego-material__opcion', { hasText: new RegExp(`^${respuesta}$`) }).click();
    }
    await pagina.waitForSelector('text=Siguiente ➜', { state: 'visible' });
    return { via, apoyo };
}

/** Juega una partida COMPLETA de «Cajas y Reparto» resolviendo bien cada pregunta. */
export async function jugarPartidaCajas(pagina, { max = 14 } = {}) {
    const vias = [];
    for (let guardia = 0; guardia < max; guardia++) {
        const que = await Promise.race([
            pagina.waitForSelector('.juego-material__enunciado:not(:empty)').then(() => 'pregunta'),
            pagina.waitForSelector('text=Jugar otra vez').then(() => 'fin')
        ]);
        if (que === 'fin') return { preguntas: guardia, vias };
        vias.push((await resolverPreguntaCajas(pagina)).via);
        await pagina.click('text=Siguiente ➜');
    }
    throw new Error(`la partida no terminó en ${max} preguntas`);
}
