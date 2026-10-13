/**
 * Contenido del Memorama de Palabras (datos, sin lógica de juego).
 *
 * Está separado del código para que una maestra o maestro pueda revisarlo y ampliarlo sin tocar las reglas.
 * Las sílabas se escriben a mano (no con un algoritmo): la división silábica del español tiene excepciones
 * (hiatos, diptongos) y es preferible que cada palabra esté verificada por una persona.
 *
 * Cada PAREJA tiene un `grupo`: un tablero nunca mezcla dos parejas del mismo grupo. Así ninguna carta puede
 * tener dos parejas válidas (p. ej. "gato" rima con "pato" y con "plato": solo uno de los dos entra por tablero).
 */

/** Palabras con dibujo. `imagen` es el id en ui/ilustraciones.js. */
export const PALABRAS_ILUSTRADAS = [
    { texto: 'sol', imagen: 'sol', silabas: ['sol'] },
    { texto: 'luna', imagen: 'luna', silabas: ['lu', 'na'] },
    { texto: 'casa', imagen: 'casa', silabas: ['ca', 'sa'] },
    { texto: 'árbol', imagen: 'arbol', silabas: ['ár', 'bol'] },
    { texto: 'flor', imagen: 'flor', silabas: ['flor'] },
    { texto: 'pez', imagen: 'pez', silabas: ['pez'] },
    { texto: 'pelota', imagen: 'pelota', silabas: ['pe', 'lo', 'ta'] },
    { texto: 'libro', imagen: 'libro', silabas: ['li', 'bro'] },
    { texto: 'estrella', imagen: 'estrella', silabas: ['es', 'tre', 'lla'] },
    { texto: 'nube', imagen: 'nube', silabas: ['nu', 'be'] },
    { texto: 'manzana', imagen: 'manzana', silabas: ['man', 'za', 'na'] },
    { texto: 'mesa', imagen: 'mesa', silabas: ['me', 'sa'] },
    { texto: 'silla', imagen: 'silla', silabas: ['si', 'lla'] },
    { texto: 'pan', imagen: 'pan', silabas: ['pan'] },
    { texto: 'taza', imagen: 'taza', silabas: ['ta', 'za'] },
    { texto: 'llave', imagen: 'llave', silabas: ['lla', 've'] },
    { texto: 'gato', imagen: 'gato', silabas: ['ga', 'to'] },
    { texto: 'perro', imagen: 'perro', silabas: ['pe', 'rro'] },
    { texto: 'conejo', imagen: 'conejo', silabas: ['co', 'ne', 'jo'] },
    { texto: 'zorro', imagen: 'zorro', silabas: ['zo', 'rro'] },
    { texto: 'panda', imagen: 'panda', silabas: ['pan', 'da'] },
    { texto: 'león', imagen: 'leon', silabas: ['le', 'ón'] },
    { texto: 'rana', imagen: 'rana', silabas: ['ra', 'na'] },
    { texto: 'pulpo', imagen: 'pulpo', silabas: ['pul', 'po'] }
];

/** Palabras sin dibujo para contar sílabas (de 1 a 5). */
export const PALABRAS_POR_SILABAS = [
    { texto: 'mar', silabas: ['mar'] },
    { texto: 'luz', silabas: ['luz'] },
    { texto: 'tren', silabas: ['tren'] },
    { texto: 'pie', silabas: ['pie'] },
    { texto: 'pato', silabas: ['pa', 'to'] },
    { texto: 'caballo', silabas: ['ca', 'ba', 'llo'] },
    { texto: 'zapato', silabas: ['za', 'pa', 'to'] },
    { texto: 'camino', silabas: ['ca', 'mi', 'no'] },
    { texto: 'tortuga', silabas: ['tor', 'tu', 'ga'] },
    { texto: 'ventana', silabas: ['ven', 'ta', 'na'] },
    { texto: 'naranja', silabas: ['na', 'ran', 'ja'] },
    { texto: 'cuaderno', silabas: ['cua', 'der', 'no'] },
    { texto: 'mariposa', silabas: ['ma', 'ri', 'po', 'sa'] },
    { texto: 'elefante', silabas: ['e', 'le', 'fan', 'te'] },
    { texto: 'calabaza', silabas: ['ca', 'la', 'ba', 'za'] },
    { texto: 'bicicleta', silabas: ['bi', 'ci', 'cle', 'ta'] },
    { texto: 'chocolate', silabas: ['cho', 'co', 'la', 'te'] },
    { texto: 'caballero', silabas: ['ca', 'ba', 'lle', 'ro'] },
    { texto: 'computadora', silabas: ['com', 'pu', 'ta', 'do', 'ra'] },
    { texto: 'hipopótamo', silabas: ['hi', 'po', 'pó', 'ta', 'mo'] },
    { texto: 'refrigerador', silabas: ['re', 'fri', 'ge', 'ra', 'dor'] },
    { texto: 'helicóptero', silabas: ['he', 'li', 'cóp', 'te', 'ro'] }
];

/**
 * Rimas CONSONANTES: las dos palabras terminan igual desde la vocal tónica. `rima` es esa terminación
 * (también es el `grupo`). Se evitan las rimas solo "asonantes" (casa–mesa) dentro de una pareja.
 */
export const RIMAS = [
    ['gato', 'pato', 'ato'], ['casa', 'masa', 'asa'], ['luna', 'cuna', 'una'], ['mesa', 'fresa', 'esa'],
    ['sol', 'col', 'ol'], ['pan', 'flan', 'an'], ['ratón', 'balón', 'ón'], ['pino', 'vino', 'ino'],
    ['rana', 'lana', 'ana'], ['foca', 'boca', 'oca'], ['mano', 'grano', 'ano'], ['vela', 'tela', 'ela'],
    ['nube', 'sube', 'ube'], ['techo', 'hecho', 'echo'], ['queso', 'beso', 'eso'], ['rosa', 'cosa', 'osa'],
    ['piña', 'niña', 'iña'], ['hoja', 'roja', 'oja'], ['mono', 'trono', 'ono'], ['llave', 'suave', 'ave'],
    ['cama', 'rama', 'ama'], ['cuento', 'viento', 'ento'], ['corazón', 'canción', 'ón']
].map(([a, b, rima]) => ({ a, b, rima }));

/** Sinónimos (grupo = concepto). */
export const SINONIMOS = [
    ['grande', 'enorme', 'tamaño-grande'], ['pequeño', 'diminuto', 'tamaño-pequeño'], ['bonito', 'hermoso', 'belleza'],
    ['rápido', 'veloz', 'rapidez'], ['contento', 'feliz', 'alegría'], ['platicar', 'charlar', 'conversar'],
    ['comenzar', 'empezar', 'inicio'], ['terminar', 'acabar', 'fin'], ['mirar', 'observar', 'vista'],
    ['casa', 'hogar', 'vivienda'], ['cansado', 'agotado', 'cansancio'], ['maestro', 'profesor', 'docente'],
    ['ayudar', 'apoyar', 'ayuda'], ['caminar', 'andar', 'caminata'], ['entender', 'comprender', 'comprension'],
    ['regresar', 'volver', 'regreso'], ['enojado', 'molesto', 'enojo'], ['silencioso', 'callado', 'silencio']
].map(([a, b, grupo]) => ({ a, b, grupo }));

/**
 * Antónimos (grupo = campo de significado). Como "alto" también podría oponerse a "pequeño", las parejas
 * de un mismo campo no se mezclan en un tablero.
 */
export const ANTONIMOS = [
    ['alto', 'bajo', 'tamaño'], ['grande', 'pequeño', 'tamaño'], ['largo', 'corto', 'tamaño'], ['gordo', 'delgado', 'tamaño'],
    ['arriba', 'abajo', 'lugar'], ['dentro', 'fuera', 'lugar'], ['cerca', 'lejos', 'lugar'], ['entrar', 'salir', 'lugar'],
    ['subir', 'bajar', 'lugar'], ['frío', 'caliente', 'temperatura'],
    ['día', 'noche', 'tiempo'], ['antes', 'después', 'tiempo'], ['nuevo', 'viejo', 'tiempo'],
    ['lleno', 'vacío', 'estado'], ['limpio', 'sucio', 'estado'], ['duro', 'blando', 'estado'], ['claro', 'oscuro', 'estado'],
    ['rápido', 'lento', 'velocidad'], ['mucho', 'poco', 'cantidad'], ['ganar', 'perder', 'resultado'],
    ['feliz', 'triste', 'animo'], ['abrir', 'cerrar', 'accion'], ['pesado', 'ligero', 'peso']
].map(([a, b, grupo]) => ({ a, b, grupo }));

// ---------- Utilidades de texto ----------

/** Minúsculas y sin acentos (para comparar terminaciones y sílabas). */
export function normalizar(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------- Candidatos: parejas posibles por habilidad ----------
// Forma: { id, grupo, a: contenido, b: contenido, explicacion }
// Contenido: { tipo: 'imagen'|'palabra'|'silaba'|'numero', texto, imagen? }

const palabra = (texto) => ({ tipo: 'palabra', texto });
const silaba = (texto) => ({ tipo: 'silaba', texto });

export function candidatosImagenPalabra() {
    return PALABRAS_ILUSTRADAS.map((p) => ({
        id: `img-${p.imagen}`,
        grupo: p.imagen,
        a: { tipo: 'imagen', imagen: p.imagen, texto: p.texto },
        b: palabra(p.texto),
        explicacion: `Es ${articulo(p.texto)} ${p.texto}.`
    }));
}

/**
 * Parejas dibujo (1.º) o palabra (2.º) ↔ sílaba con la que empieza. Las palabras de una sola sílaba se excluyen
 * (su "primera sílaba" es la palabra entera y no enseña nada). El grupo es la sílaba: no se repite en un tablero.
 */
export function candidatosSilabaInicial(grado) {
    const conDibujo = grado <= 1;
    const pool = conDibujo ? PALABRAS_ILUSTRADAS : [...PALABRAS_ILUSTRADAS, ...PALABRAS_POR_SILABAS];
    return pool.filter((p) => p.silabas.length >= 2).map((p) => ({
        id: `ini-${normalizar(p.texto)}`,
        grupo: normalizar(p.silabas[0]),
        a: conDibujo ? { tipo: 'imagen', imagen: p.imagen, texto: p.texto } : palabra(p.texto),
        b: silaba(p.silabas[0]),
        explicacion: `${p.texto} se separa así: ${p.silabas.join('-')}. Empieza con «${p.silabas[0]}».`
    }));
}

/** Parejas palabra ↔ número de sílabas. El grupo es el número: un solo ejemplo de cada cantidad por tablero. */
export function candidatosConteoSilabas() {
    return PALABRAS_POR_SILABAS.concat(PALABRAS_ILUSTRADAS.map(({ texto, silabas }) => ({ texto, silabas }))).map((p) => ({
        id: `cnt-${normalizar(p.texto)}`,
        grupo: String(p.silabas.length),
        a: palabra(p.texto),
        b: { tipo: 'numero', texto: String(p.silabas.length) },
        explicacion: `${p.texto} se separa así: ${p.silabas.join('-')}. Tiene ${p.silabas.length} ${p.silabas.length === 1 ? 'sílaba' : 'sílabas'}.`
    }));
}

export function candidatosRimas() {
    return RIMAS.map((r) => ({
        id: `rima-${normalizar(r.a)}-${normalizar(r.b)}`,
        grupo: normalizar(r.rima),
        a: palabra(r.a),
        b: palabra(r.b),
        explicacion: `${r.a} y ${r.b} riman: terminan igual, en «-${r.rima}».`
    }));
}

export function candidatosSinonimos() {
    return SINONIMOS.map((s) => ({
        id: `sin-${normalizar(s.a)}-${normalizar(s.b)}`,
        grupo: s.grupo,
        a: palabra(s.a),
        b: palabra(s.b),
        explicacion: `${s.a} y ${s.b} son sinónimos: significan casi lo mismo.`
    }));
}

export function candidatosAntonimos() {
    return ANTONIMOS.map((s) => ({
        id: `ant-${normalizar(s.a)}-${normalizar(s.b)}`,
        grupo: s.grupo,
        a: palabra(s.a),
        b: palabra(s.b),
        explicacion: `${s.a} y ${s.b} son antónimos: significan lo contrario.`
    }));
}

/** "el"/"la" según la palabra (solo para las ilustradas, escritas a mano). */
const FEMENINAS = new Set(['luna', 'casa', 'flor', 'pelota', 'estrella', 'nube', 'manzana', 'mesa', 'silla', 'taza', 'llave', 'rana']);
function articulo(texto) {
    return FEMENINAS.has(texto) ? 'una' : 'un';
}
