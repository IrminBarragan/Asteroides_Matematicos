import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { crearZip, crc32 } from '../scripts/zip.mjs';

/** Lector independiente: recorre el directorio central y descomprime cada entrada verificando su CRC. */
function leerZip(buffer) {
    const fin = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    assert.ok(fin >= 0, 'falta el registro final');
    const total = buffer.readUInt16LE(fin + 10);
    let pos = buffer.readUInt32LE(fin + 16);
    const salida = new Map();
    for (let i = 0; i < total; i++) {
        assert.equal(buffer.readUInt32LE(pos), 0x02014b50);
        const metodo = buffer.readUInt16LE(pos + 10);
        const crc = buffer.readUInt32LE(pos + 16);
        const comprimido = buffer.readUInt32LE(pos + 20);
        const tamano = buffer.readUInt32LE(pos + 24);
        const n = buffer.readUInt16LE(pos + 28);
        const desplazamiento = buffer.readUInt32LE(pos + 42);
        const nombre = buffer.toString('utf8', pos + 46, pos + 46 + n);
        pos += 46 + n;

        assert.equal(buffer.readUInt32LE(desplazamiento), 0x04034b50, 'cabecera local');
        const nLocal = buffer.readUInt16LE(desplazamiento + 26);
        const inicio = desplazamiento + 30 + nLocal;
        assert.equal(metodo, 8);
        const datos = inflateRawSync(buffer.subarray(inicio, inicio + comprimido));
        assert.equal(datos.length, tamano, `tamaño de ${nombre}`);
        assert.equal(crc32(datos), crc, `CRC de ${nombre}`);
        salida.set(nombre, datos);
    }
    return salida;
}

test('crc32 coincide con el valor estándar de «123456789» (0xCBF43926)', () => {
    assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
    assert.equal(crc32(Buffer.alloc(0)), 0);
});

test('un ZIP se puede leer de vuelta: nombres, contenido y CRC', () => {
    const binario = Buffer.from(Array.from({ length: 5000 }, (_, i) => (i * 7) % 256));
    const zip = crearZip([
        { nombre: 'carpeta/index.html', datos: '<h1>Hola</h1>' },
        { nombre: 'carpeta/assets/nave.png', datos: binario },
        { nombre: 'carpeta/ñandú-áé.txt', datos: 'acentos: áéíóú ñ' },
        { nombre: 'carpeta/vacio.txt', datos: '' }
    ]);
    const leido = leerZip(zip);
    assert.deepEqual([...leido.keys()], ['carpeta/index.html', 'carpeta/assets/nave.png', 'carpeta/ñandú-áé.txt', 'carpeta/vacio.txt']);
    assert.equal(leido.get('carpeta/index.html').toString(), '<h1>Hola</h1>');
    assert.deepEqual(leido.get('carpeta/assets/nave.png'), binario);
    assert.equal(leido.get('carpeta/ñandú-áé.txt').toString(), 'acentos: áéíóú ñ');
    assert.equal(leido.get('carpeta/vacio.txt').length, 0);
});

test('es determinista: las mismas entradas dan los mismos bytes', () => {
    const entradas = [{ nombre: 'a/b.txt', datos: 'x'.repeat(1000) }];
    assert.deepEqual(crearZip(entradas), crearZip(entradas));
});

test('rechaza nombres peligrosos (ruta absoluta, «..», contrabarra: «zip slip»)', () => {
    for (const nombre of ['/etc/passwd', '../fuera.txt', 'a/../../b', 'a\\b.txt']) {
        assert.throws(() => crearZip([{ nombre, datos: 'x' }]), /no permitido/, nombre);
    }
});

test('comprime de verdad: un texto repetitivo ocupa mucho menos que el original', () => {
    const zip = crearZip([{ nombre: 'a.txt', datos: 'abc'.repeat(10000) }]);
    assert.ok(zip.length < 1000, `${zip.length} bytes`);
});
