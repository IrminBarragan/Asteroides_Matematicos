/**
 * Empaqueta `dist/` en un ZIP listo para entregar (USB, correo, nube): entrega/portal-juegos-educativos-vX.Y.Z.zip.
 * Dentro hay UNA carpeta (al extraer no se riegan archivos) y un LEEME.txt con las instrucciones para la escuela.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { crearZip } from './zip.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paquete = JSON.parse(await readFile(path.join(raiz, 'package.json'), 'utf8'));
const carpeta = 'portal-juegos-educativos';

async function archivos(dir, prefijo = '') {
    const salida = [];
    for (const e of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const ruta = path.join(dir, e.name);
        if (e.isDirectory()) salida.push(...await archivos(ruta, `${prefijo}${e.name}/`));
        else salida.push({ nombre: `${prefijo}${e.name}`, datos: await readFile(ruta) });
    }
    return salida;
}

let contenido;
try {
    contenido = await archivos(path.join(raiz, 'dist'));
} catch (error) {
    if (error.code === 'ENOENT') { console.error('No existe dist/. Ejecuta primero: pnpm build'); process.exit(1); }
    throw error;
}
if (!contenido.some((a) => a.nombre === 'index.html')) { console.error('dist/ no tiene index.html'); process.exit(1); }

const leeme = await readFile(path.join(raiz, 'docs', 'LEEME-ENTREGA.txt'), 'utf8');
const entradas = [{ nombre: 'LEEME.txt', datos: leeme.replace('{{VERSION}}', paquete.version) }, ...contenido]
    .map((a) => ({ ...a, nombre: `${carpeta}/${a.nombre}` }));

const zip = crearZip(entradas);
await mkdir(path.join(raiz, 'entrega'), { recursive: true });
const salida = path.join('entrega', `${carpeta}-v${paquete.version}.zip`);
await writeFile(path.join(raiz, salida), zip);
console.log(`${salida}: ${entradas.length} archivos, ${(zip.length / 1024).toFixed(0)} KB`);
