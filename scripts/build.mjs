/**
 * Build del proyecto.
 *
 * Objetivo: que `dist/index.html` se abra con doble clic, sin servidor y sin internet.
 * Por eso el JS se empaqueta como script CLÁSICO (iife), no como módulo ES:
 * los <script type="module"> no cargan desde file:// en Chrome.
 */
import { build } from 'esbuild';
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => path.join(raiz, 'src', ...p);
const dist = (...p) => path.join(raiz, 'dist', ...p);
const modulos = (...p) => path.join(raiz, 'node_modules', ...p);

await rm(dist(), { recursive: true, force: true });
await mkdir(dist('assets', 'vendor', 'bootstrap-icons'), { recursive: true });
await mkdir(dist('assets', 'fonts'), { recursive: true });

// 1. JavaScript: scripts clásicos (iife), compatibles con navegadores antiguos
const opcionesJs = {
    bundle: true,
    format: 'iife',
    target: ['es2018', 'chrome70', 'firefox68'],
    legalComments: 'none',
    logLevel: 'warning'
};
await build({ ...opcionesJs, entryPoints: [src('main.js')], outfile: dist('app.js') });
// Versión anterior de Asteroides: sigue disponible hasta que se migre al portal (Fase 3)
await build({ ...opcionesJs, entryPoints: [src('games', 'asteroides', 'juego.js')], outfile: dist('legacy-app.js') });

// 2. HTML, CSS propio e imágenes
await cp(src('index.html'), dist('index.html'));
await cp(src('estilos', 'portal.css'), dist('portal.css'));
await cp(src('games', 'asteroides', 'legacy.html'), dist('asteroides-legacy.html'));
await cp(src('games', 'asteroides', 'estilos-legacy.css'), dist('estilos-legacy.css'));
await cp(src('games', 'asteroides', 'nave.png'), dist('assets', 'nave.png'));

// 3. Dependencias visuales locales (antes venían de un CDN)
const quitarSourceMap = (css) => css.replace(/\/\*# sourceMappingURL=.*?\*\//g, '');
const bootstrapCss = await readFile(modulos('bootstrap', 'dist', 'css', 'bootstrap.min.css'), 'utf8');
await writeFile(dist('assets', 'vendor', 'bootstrap.min.css'), quitarSourceMap(bootstrapCss));

const iconosCss = await readFile(modulos('bootstrap-icons', 'font', 'bootstrap-icons.min.css'), 'utf8');
await writeFile(dist('assets', 'vendor', 'bootstrap-icons', 'bootstrap-icons.min.css'), quitarSourceMap(iconosCss));
await cp(modulos('bootstrap-icons', 'font', 'fonts'), dist('assets', 'vendor', 'bootstrap-icons', 'fonts'), { recursive: true });

for (const peso of [300, 400, 500, 600, 700]) {
    const archivo = `poppins-latin-${peso}-normal.woff2`;
    await cp(modulos('@fontsource', 'poppins', 'files', archivo), dist('assets', 'fonts', archivo));
}
for (const peso of [400, 500, 600, 700]) {
    const archivo = `fredoka-latin-${peso}-normal.woff2`;
    await cp(modulos('@fontsource', 'fredoka', 'files', archivo), dist('assets', 'fonts', archivo));
}

console.log('Build listo en dist/ (abre dist/index.html)');
