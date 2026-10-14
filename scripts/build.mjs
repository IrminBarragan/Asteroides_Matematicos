/**
 * Build del proyecto.
 *
 * Objetivo: que `dist/index.html` se abra con doble clic, sin servidor y sin internet.
 * Por eso el JS se empaqueta como script CLÁSICO (iife), no como módulo ES:
 * los <script type="module"> no cargan desde file:// en Chrome.
 */
import { build } from 'esbuild';
import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => path.join(raiz, 'src', ...p);
const dist = (...p) => path.join(raiz, 'dist', ...p);
const modulos = (...p) => path.join(raiz, 'node_modules', ...p);

await rm(dist(), { recursive: true, force: true });
await mkdir(dist('assets', 'fonts'), { recursive: true });

// 1. JavaScript: un script clásico (iife), compatible con navegadores antiguos
await build({
    entryPoints: [src('main.js')],
    outfile: dist('app.js'),
    bundle: true,
    format: 'iife',
    target: ['es2018', 'chrome70', 'firefox68'],
    legalComments: 'none',
    minify: !process.env.SIN_MINIFICAR, // SIN_MINIFICAR=1 pnpm build → código legible para depurar en la escuela
    logLevel: 'warning'
});

// 2. HTML y CSS. El CSS es el del portal + el de cada juego (src/games/<juego>/estilos.css), en un solo archivo
await cp(src('index.html'), dist('index.html'));
let css = await readFile(src('estilos', 'portal.css'), 'utf8');
css += `\n${await readFile(src('estilos', 'material.css'), 'utf8')}`; // lo común a los juegos con material (ui/juegoConMaterial.js)
for (const juego of await readdir(src('games'), { withFileTypes: true })) {
    if (!juego.isDirectory()) continue;
    try {
        css += `\n${await readFile(src('games', juego.name, 'estilos.css'), 'utf8')}`;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error; // un juego sin CSS propio es válido
    }
}
await writeFile(dist('portal.css'), css);
await cp(src('games', 'asteroides', 'nave.png'), dist('assets', 'nave.png'));

// 3. Fuentes locales (antes venían de un CDN)
for (const peso of [400, 500, 600, 700]) {
    for (const [paquete, nombre] of [['poppins', 'poppins'], ['fredoka', 'fredoka']]) {
        const archivo = `${nombre}-latin-${peso}-normal.woff2`;
        await cp(modulos('@fontsource', paquete, 'files', archivo), dist('assets', 'fonts', archivo));
    }
}

console.log('Build listo en dist/ (abre dist/index.html)');
