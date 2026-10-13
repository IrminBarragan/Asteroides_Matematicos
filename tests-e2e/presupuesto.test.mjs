import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Presupuesto de tamaño: el portal debe ser ligero para PCs viejas y para copiarlo en una memoria USB.
 * Se mide `dist/` (requiere `pnpm build`). Si crece de golpe, esta prueba avisa antes de que nadie lo note.
 */
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const hay = existsSync(path.join(dist, 'app.js'));
const opciones = { skip: hay ? false : 'No hay dist/ (ejecuta pnpm build)' };
const KB = 1024;

function tamanoTotal(dir) {
    return readdirSync(dir).reduce((suma, nombre) => {
        const ruta = path.join(dir, nombre);
        return suma + (statSync(ruta).isDirectory() ? tamanoTotal(ruta) : statSync(ruta).size);
    }, 0);
}

test('app.js comprimido pesa menos de 80 KB', opciones, () => {
    const gz = gzipSync(readFileSync(path.join(dist, 'app.js'))).length;
    assert.ok(gz < 80 * KB, `app.js gz = ${(gz / KB).toFixed(1)} KB`);
});

test('el CSS comprimido pesa menos de 15 KB', opciones, () => {
    const gz = gzipSync(readFileSync(path.join(dist, 'portal.css'))).length;
    assert.ok(gz < 15 * KB, `portal.css gz = ${(gz / KB).toFixed(1)} KB`);
});

test('todo dist/ pesa menos de 1 MB (cabe de sobra en cualquier USB)', opciones, () => {
    const total = tamanoTotal(dist);
    assert.ok(total < 1024 * KB, `dist = ${(total / KB).toFixed(0)} KB`);
});

test('dist/ no contiene referencias a internet (http/https) en el HTML ni en el CSS', opciones, () => {
    for (const archivo of ['index.html', 'portal.css']) {
        const texto = readFileSync(path.join(dist, archivo), 'utf8');
        assert.ok(!/https?:\/\//.test(texto), `${archivo} menciona una URL externa`);
    }
});
