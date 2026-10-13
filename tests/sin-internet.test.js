import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

async function archivos(dir) {
    const salida = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const ruta = path.join(dir, e.name);
        if (e.isDirectory()) salida.push(...await archivos(ruta));
        else if (/\.(html|css|js)$/.test(e.name)) salida.push(ruta);
    }
    return salida;
}

test('el código fuente no depende de recursos remotos (debe funcionar offline)', async () => {
    // Solo se revisan referencias a cargar recursos: src/href/@import/url()
    const patron = /(?:src|href)\s*=\s*["']https?:\/\/|@import\s+url\(\s*["']?https?:|url\(\s*["']?https?:/i;
    for (const f of await archivos(src)) {
        const texto = await readFile(f, 'utf8');
        assert.ok(!patron.test(texto), `${path.relative(src, f)} carga un recurso remoto`);
    }
});
