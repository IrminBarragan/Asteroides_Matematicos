/**
 * Escritor mínimo de archivos ZIP (formato PKZIP, compresión DEFLATE), sin dependencias.
 *
 * Por qué no usar una librería: el proyecto limita sus dependencias por seguridad (ver docs/SEGURIDAD-DEPENDENCIAS.md)
 * y `node:zlib` ya trae DEFLATE; el contenedor ZIP son solo tres estructuras (cabecera local, directorio central y
 * registro final) y se puede escribir y VERIFICAR en pocas líneas.
 *
 * Es determinista: la misma entrada produce los mismos bytes (fecha fija), útil para comparar entregas.
 */
import { deflateRawSync } from 'node:zlib';

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});

export function crc32(datos) {
    let c = 0xffffffff;
    for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const FECHA_DOS = (1 << 5) | 1; // 1980-01-01 (el mínimo que admite el formato)
const FLAG_UTF8 = 0x0800;       // los nombres están en UTF-8 (acentos)

/**
 * @param {Array<{nombre:string, datos:Buffer|string}>} entradas  nombre con "/" como separador
 * @returns {Buffer}
 */
export function crearZip(entradas) {
    const partes = [];
    const central = [];
    let desplazamiento = 0;

    for (const { nombre, datos } of entradas) {
        if (/^\/|\.\.|\\/.test(nombre)) throw new Error(`Nombre no permitido en el ZIP: ${nombre}`);
        const contenido = Buffer.isBuffer(datos) ? datos : Buffer.from(datos, 'utf8');
        const comprimido = deflateRawSync(contenido, { level: 9 });
        const nombreBytes = Buffer.from(nombre, 'utf8');
        const crc = crc32(contenido);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);            // versión necesaria
        local.writeUInt16LE(FLAG_UTF8, 6);
        local.writeUInt16LE(8, 8);             // método 8 = DEFLATE
        local.writeUInt16LE(0, 10);            // hora
        local.writeUInt16LE(FECHA_DOS, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(comprimido.length, 18);
        local.writeUInt32LE(contenido.length, 22);
        local.writeUInt16LE(nombreBytes.length, 26);
        local.writeUInt16LE(0, 28);
        partes.push(local, nombreBytes, comprimido);

        const entradaCentral = Buffer.alloc(46);
        entradaCentral.writeUInt32LE(0x02014b50, 0);
        entradaCentral.writeUInt16LE(20, 4);   // versión con la que se creó
        entradaCentral.writeUInt16LE(20, 6);
        entradaCentral.writeUInt16LE(FLAG_UTF8, 8);
        entradaCentral.writeUInt16LE(8, 10);
        entradaCentral.writeUInt16LE(0, 12);
        entradaCentral.writeUInt16LE(FECHA_DOS, 14);
        entradaCentral.writeUInt32LE(crc, 16);
        entradaCentral.writeUInt32LE(comprimido.length, 20);
        entradaCentral.writeUInt32LE(contenido.length, 24);
        entradaCentral.writeUInt16LE(nombreBytes.length, 28);
        entradaCentral.writeUInt32LE(desplazamiento, 42);
        central.push(entradaCentral, nombreBytes);

        desplazamiento += local.length + nombreBytes.length + comprimido.length;
    }

    const directorio = Buffer.concat(central);
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0);
    fin.writeUInt16LE(entradas.length, 8);
    fin.writeUInt16LE(entradas.length, 10);
    fin.writeUInt32LE(directorio.length, 12);
    fin.writeUInt32LE(desplazamiento, 16);
    return Buffer.concat([...partes, directorio, fin]);
}
