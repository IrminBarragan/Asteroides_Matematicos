/**
 * Contenido de "Atrapa la Ortografía" (solo datos y funciones puras de texto).
 *
 * Se separa del código para que una maestra o un maestro pueda revisarlo y ampliarlo. Hay dos tipos de ejercicio:
 *   - PALABRA: ¿cuál está bien escrita? Las opciones incorrectas se GENERAN aplicando el error típico de la regla
 *     (cambiar b↔v, quitar la h, mover la tilde…) a la palabra correcta, y se descartan las que resulten ser otra
 *     palabra real (p. ej. "vaca"→"baca"). Por eso hay una lista de PALABRAS_VALIDAS_QUE_NO_SON_ERROR.
 *   - ORACIÓN: se completa una oración con la palabra correcta (homófonos, tilde diacrítica, porque / por qué).
 *     Son ejercicios escritos a mano, con la explicación de por qué.
 *
 * Ortografía de México (seseo: c, s y z suenan igual, por eso la regla se explica por posición, no por sonido).
 */

export const NIVELES = [1, 2, 3];

// ---------- Palabras por regla: [palabra, nivel, regla opcional] ----------

const REGLA_BIR = 'Los verbos terminados en -bir se escriben con b (excepto hervir, servir y vivir).';
const REGLA_BER = 'Los verbos terminados en -ber se escriben con b (excepto precaver).';
const REGLA_EVO = 'Los adjetivos terminados en -evo, -eve, -ivo se escriben con v.';
const REGLA_GER = 'Los verbos terminados en -ger y -gir se escriben con g (excepto tejer y crujir).';
const REGLA_AJE = 'Las palabras terminadas en -aje se escriben con j.';
const REGLA_GEO = 'Las palabras que empiezan con geo- (tierra) se escriben con g.';
const REGLA_HUE = 'Las palabras que empiezan con hue-, hie- y hui- se escriben con h.';
const REGLA_ILLO = 'Las palabras terminadas en -illo e -illa se escriben con ll.';

export const BV = [
    ['verde', 1], ['nube', 1], ['libro', 1], ['barco', 1], ['lobo', 1], ['burro', 1], ['uva', 1], ['cubo', 1],
    ['bonito', 1], ['bueno', 1], ['volar', 1], ['vivir', 1, 'Vivir es una excepción: los verbos terminados en -bir se escriben con b, pero vivir lleva v.'],
    ['ventana', 2], ['vecino', 2], ['cabeza', 2], ['botella', 2], ['bailar', 2], ['nuevo', 2, REGLA_EVO], ['huevo', 2, REGLA_EVO],
    ['brazo', 2], ['blanco', 2], ['saber', 2, REGLA_BER], ['beber', 2, REGLA_BER],
    ['cuervo', 3], ['abrigo', 3], ['escribir', 3, REGLA_BIR], ['recibir', 3, REGLA_BIR], ['octubre', 3], ['noviembre', 3],
    ['bicicleta', 3], ['verano', 3], ['visita', 3], ['volcán', 3]
];

export const GJ = [
    ['gente', 1], ['jirafa', 1], ['gigante', 1], ['viaje', 1, REGLA_AJE], ['mensaje', 1, REGLA_AJE], ['jefe', 1],
    ['tijeras', 1], ['mujer', 1], ['girar', 1], ['ángel', 1],
    ['página', 2], ['colegio', 2], ['imagen', 2], ['origen', 2], ['ejercicio', 2], ['general', 2], ['cajero', 2],
    ['gelatina', 2], ['gimnasio', 2], ['urgente', 2], ['sargento', 2],
    ['extranjero', 3], ['ingeniero', 3], ['escoger', 3, REGLA_GER], ['recoger', 3, REGLA_GER], ['proteger', 3, REGLA_GER],
    ['elegir', 3, REGLA_GER], ['dirigir', 3, REGLA_GER], ['geografía', 3, REGLA_GEO], ['refrigerador', 3]
];

export const H = [
    ['huevo', 1, REGLA_HUE], ['hueso', 1, REGLA_HUE], ['hormiga', 1], ['hielo', 1, REGLA_HUE], ['hermano', 1], ['humo', 1],
    ['helado', 1], ['hoy', 1], ['hijo', 1], ['hoja', 1], ['abuelo', 1], ['amigo', 1], ['oso', 1], ['isla', 1], ['agua', 1],
    ['historia', 2], ['hospital', 2], ['huerto', 2, REGLA_HUE], ['humano', 2], ['herida', 2], ['hombre', 2], ['hablar', 2],
    ['hilo', 2], ['hueco', 2, REGLA_HUE], ['ahora', 2], ['animal', 2], ['escuela', 2], ['ojo', 2],
    ['habitación', 3], ['hermoso', 3], ['herramienta', 3], ['hipopótamo', 3], ['zanahoria', 3], ['ahorrar', 3],
    ['alcohol', 3], ['prohibir', 3], ['almohada', 3], ['cohete', 3], ['vehículo', 3], ['búho', 3]
];

export const CSZ = [
    ['cebolla', 1], ['cielo', 1], ['cinco', 1], ['cocina', 1], ['zapato', 1], ['azul', 1], ['luz', 1], ['pez', 1],
    ['nariz', 1], ['feliz', 1], ['plaza', 1], ['sopa', 1], ['zorro', 1],
    ['ciudad', 2], ['círculo', 2], ['cerezo', 2], ['ciruela', 2], ['gracias', 2], ['docena', 2], ['oficina', 2],
    ['azúcar', 2], ['lápiz', 2], ['cruz', 2], ['paz', 2], ['abrazo', 2], ['zapatilla', 2], ['empezar', 2], ['comenzar', 2],
    ['princesa', 3], ['policía', 3], ['cintura', 3], ['especial', 3], ['necesario', 3], ['dulce', 3], ['conocer', 3], ['parecer', 3]
];

export const LLY = [
    ['calle', 1], ['lluvia', 1], ['llave', 1], ['silla', 1, REGLA_ILLO], ['ella', 1], ['yema', 1], ['playa', 1], ['llorar', 1],
    ['llamar', 1], ['tortilla', 1, REGLA_ILLO],
    ['gallina', 2], ['cuchillo', 2, REGLA_ILLO], ['castillo', 2, REGLA_ILLO], ['amarillo', 2, REGLA_ILLO], ['caballo', 2],
    ['rodilla', 2, REGLA_ILLO], ['toalla', 2], ['estrella', 2], ['payaso', 2], ['bolsillo', 2, REGLA_ILLO], ['ladrillo', 2, REGLA_ILLO],
    ['millón', 3], ['sello', 3], ['mayor', 3], ['joya', 3], ['ayuda', 3], ['yogur', 3], ['leyenda', 3], ['proyecto', 3],
    ['desayuno', 3], ['mantequilla', 3, REGLA_ILLO], ['cepillo', 3, REGLA_ILLO]
];

/**
 * Palabras reales que NO deben aparecer como "error" (si un cambio de letra produce una de ellas, esa opción
 * se descarta: el niño podría estar frente a otra palabra correcta). Revisar al agregar palabras nuevas.
 */
export const PALABRAS_VALIDAS_QUE_NO_SON_ERROR = new Set([
    'baca', 'vota', 'bota', 'bello', 'vello', 'vaca', 'baso', 'vaso', 'tuvo', 'tubo', 'bate', 'vate', 'vaya', 'baya',
    'vienes', 'bienes', 'hola', 'ola', 'hasta', 'asta', 'hora', 'ora', 'ala', 'hala', 'caza', 'casa', 'taza', 'tasa',
    'rosa', 'roza', 'sena', 'cena', 'cima', 'sima', 'siento', 'ciento', 'sierra', 'cierra', 'zumo', 'sumo', 'poyo',
    'pollo', 'hollo', 'hoyo', 'mayo', 'mallo', 'rayo', 'rallo', 'halla', 'haya', 'calló', 'cayó', 'valla', 'arrollo',
    'arroyo', 'medico', 'numero', 'pagina', 'ultimo', 'acer', 'orno', 'horno', 'acha', 'hacha', 'uno', 'huno', 'echo',
    'hecho', 'cocer', 'coser', 'seda', 'ceda', 'sesion', 'cesion', 'zinc', 'cinc', 'sapo', 'papa', 'mama', 'canto', 'cantó',
    'esta', 'está', 'cuba'
]);

// ---------- Acentuación ----------

/**
 * Cada palabra con sus sílabas (escritas a mano) y el índice de la sílaba tónica (la que suena más fuerte).
 * De ahí se DEDUCE si es aguda, grave o esdrújula y si debe llevar tilde; una prueba comprueba que la palabra
 * escrita sea coherente con la regla (si no, la explicación enseñaría algo falso).
 */
export const ACENTUACION = [
    // [silabas, indice de la sílaba tónica, nivel]
    [['can', 'ción'], 1, 1], [['ca', 'mión'], 1, 1], [['ba', 'lón'], 1, 1], [['ca', 'fé'], 1, 1], [['so', 'fá'], 1, 1],
    [['jar', 'dín'], 1, 1], [['ár', 'bol'], 0, 1], [['lá', 'piz'], 0, 1], [['te', 'lé', 'fo', 'no'], 1, 1],
    [['pá', 'ja', 'ro'], 0, 1], [['mú', 'si', 'ca'], 0, 1], [['sá', 'ba', 'do'], 0, 1], [['me', 'sa'], 0, 1],
    [['re', 'loj'], 1, 1], [['pa', 'pel'], 1, 1], [['jo', 'ven'], 0, 1],
    [['co', 'ra', 'zón'], 2, 2], [['li', 'món'], 1, 2], [['a', 'vión'], 1, 2], [['me', 'lón'], 1, 2], [['ja', 'bón'], 1, 2],
    [['a', 'de', 'más'], 2, 2], [['ja', 'más'], 1, 2], [['cár', 'cel'], 0, 2], [['fá', 'cil'], 0, 2], [['án', 'gel'], 0, 2],
    [['ú', 'til'], 0, 2], [['plá', 'ta', 'no'], 0, 2], [['lám', 'pa', 'ra'], 0, 2], [['ciu', 'dad'], 1, 2],
    [['a', 'ni', 'mal'], 2, 2], [['lu', 'nes'], 0, 2], [['e', 'xa', 'men'], 1, 2],
    [['es', 'ta', 'ción'], 2, 3], [['te', 'le', 'vi', 'sión'], 3, 3], [['lec', 'ción'], 1, 3], [['al', 'go', 'dón'], 2, 3],
    [['tam', 'bién'], 1, 3], [['qui', 'zás'], 1, 3], [['des', 'pués'], 1, 3], [['a', 'zú', 'car'], 1, 3],
    [['ca', 'rác', 'ter'], 1, 3], [['cés', 'ped'], 0, 3], [['di', 'fí', 'cil'], 1, 3], [['mur', 'cié', 'la', 'go'], 1, 3],
    [['es', 'tó', 'ma', 'go'], 1, 3], [['brú', 'ju', 'la'], 0, 3], [['ma', 'te', 'má', 'ti', 'cas'], 2, 3],
    [['pi', 'rá', 'mi', 'de'], 1, 3], [['o', 'cé', 'a', 'no'], 1, 3], [['sí', 'la', 'ba'], 0, 3], [['ár', 'bo', 'les'], 0, 3],
    [['o', 'ri', 'gen'], 1, 3], [['i', 'ma', 'gen'], 1, 3], [['ca', 'pi', 'tán'], 2, 3]
].map(([silabas, tonica, nivel]) => ({ silabas, tonica, nivel, palabra: silabas.join('') }));

const VOCALES = 'aeiouáéíóúü';
const CON_TILDE = 'áéíóú';
const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const CON_TILDE_DE = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };

export const quitarTildes = (texto) => texto.replace(/[áéíóú]/g, (c) => SIN_TILDE[c]);

/** 'aguda' | 'grave' | 'esdrujula' (las sobresdrújulas no se usan en este nivel). */
export function claseDePalabra({ silabas, tonica }) {
    const desdeElFinal = silabas.length - 1 - tonica;
    if (desdeElFinal === 0) return 'aguda';
    if (desdeElFinal === 1) return 'grave';
    return 'esdrujula';
}

/** Regla de la tilde: aguda → si termina en n, s o vocal; grave → si NO termina en n, s o vocal; esdrújula → siempre. */
export function debeLlevarTilde(entrada) {
    const clase = claseDePalabra(entrada);
    if (clase === 'esdrujula') return true;
    const ultima = quitarTildes(entrada.palabra).slice(-1);
    const terminaEnNSVocal = ultima === 'n' || ultima === 's' || 'aeiou'.includes(ultima);
    return clase === 'aguda' ? terminaEnNSVocal : !terminaEnNSVocal;
}

/** Texto de las sílabas con la tónica en mayúsculas: "can-CIÓN". */
export function silabasConTonica({ silabas, tonica }) {
    return silabas.map((s, i) => (i === tonica ? s.toUpperCase() : s)).join('-');
}

// ---------- Ejercicios de oración (escritos a mano) ----------
// [oración con ___, [opciones: la primera es la correcta], nivel, explicación]

export const HOMOFONOS = [
    ['El mar tiene una gran ___.', ['ola', 'hola'], 1, '«ola» es el movimiento del agua del mar; «hola» es un saludo.'],
    ['Dije ___ a mi maestra.', ['hola', 'ola'], 1, '«hola» es un saludo; «ola» es el movimiento del agua.'],
    ['___ muchos niños en el patio.', ['Hay', 'Ahí', 'Ay'], 1, '«hay» (del verbo haber) indica que algo existe o está presente.'],
    ['Deja la mochila ___.', ['ahí', 'hay', 'ay'], 1, '«ahí» indica un lugar (allí, cerca de ti).'],
    ['¡___, me dolió!', ['Ay', 'Hay', 'Ahí'], 1, '«ay» es una interjección: expresa dolor o sorpresa.'],
    ['La ___ nos da leche.', ['vaca', 'baca'], 1, '«vaca» es el animal; «baca» es el soporte para el equipaje del coche.'],
    ['Pusimos las maletas en la ___ del coche.', ['baca', 'vaca'], 1, '«baca» es el soporte para el equipaje del coche; «vaca» es el animal.'],
    ['El agua pasa por el ___.', ['tubo', 'tuvo'], 1, '«tubo» es un conducto; «tuvo» es del verbo tener.'],
    ['Ayer mi hermano ___ un resfriado.', ['tuvo', 'tubo'], 1, '«tuvo» es del verbo tener; «tubo» es un conducto.'],
    ['Ya he ___ la tarea.', ['hecho', 'echo'], 2, '«hecho» viene del verbo hacer (he hecho); «echo» viene de echar.'],
    ['Yo ___ agua en el vaso.', ['echo', 'hecho'], 2, '«echo» viene del verbo echar (yo echo); «hecho» viene de hacer.'],
    ['Corrimos ___ llegar a la meta.', ['hasta', 'asta'], 2, '«hasta» marca un límite; «asta» es el palo de una bandera o el cuerno de un toro.'],
    ['La bandera sube por el ___.', ['asta', 'hasta'], 2, '«asta» es el palo de una bandera; «hasta» marca un límite.'],
    ['El niño se ___ de la bicicleta.', ['cayó', 'calló'], 2, '«cayó» viene de caer; «calló» viene de callar (quedarse en silencio).'],
    ['Cuando entró el director, el grupo se ___.', ['calló', 'cayó'], 2, '«calló» viene de callar (quedarse en silencio); «cayó» viene de caer.'],
    ['Tengo mucho ___ en los brazos.', ['vello', 'bello'], 2, '«vello» es el pelo fino del cuerpo; «bello» significa bonito.'],
    ['¡Qué día tan ___!', ['bello', 'vello'], 2, '«bello» significa bonito; «vello» es el pelo fino del cuerpo.'],
    ['Mañana vamos ___ una película.', ['a ver', 'haber'], 3, '«a ver» es la preposición «a» + el verbo ver; «haber» es otro verbo (hay, había).'],
    ['Debe ___ más sillas en el salón.', ['haber', 'a ver'], 3, '«haber» es verbo (debe haber); «a ver» es «a» + el verbo ver.'],
    ['Él ya ___ llegado.', ['ha', 'a', 'ah'], 3, '«ha» es del verbo haber y acompaña a otro verbo (ha llegado).'],
    ['Voy ___ la escuela.', ['a', 'ha', 'ah'], 3, '«a» es una preposición que indica dirección.'],
    ['Voy a ___ el queso para la pizza.', ['rallar', 'rayar'], 3, '«rallar» es deshacer algo en trozos pequeños; «rayar» es hacer rayas.'],
    ['No quiero ___ la mesa con el lápiz.', ['rayar', 'rallar'], 3, '«rayar» es hacer rayas; «rallar» es deshacer algo en trozos pequeños.']
];

export const DIACRITICOS = [
    ['___ eres mi mejor amigo.', ['Tú', 'Tu'], 1, '«tú» (con tilde) es el pronombre: habla de la persona con quien conversas.'],
    ['Guarda ___ cuaderno en la mochila.', ['tu', 'tú'], 1, '«tu» (sin tilde) indica que algo te pertenece.'],
    ['___ niño corre muy rápido.', ['El', 'Él'], 1, '«el» (sin tilde) es un artículo: va antes de un sustantivo.'],
    ['___ llegó temprano a la escuela.', ['Él', 'El'], 1, '«él» (con tilde) es el pronombre: se refiere a una persona.'],
    ['Esta carta es para ___.', ['mí', 'mi'], 1, '«mí» (con tilde) es el pronombre que va después de una preposición (para mí).'],
    ['___ casa es muy grande.', ['Mi', 'Mí'], 1, '«mi» (sin tilde) indica que algo me pertenece.'],
    ['Mi abuela toma ___ en las tardes.', ['té', 'te'], 2, '«té» (con tilde) es la bebida.'],
    ['Yo ___ quiero mucho.', ['te', 'té'], 2, '«te» (sin tilde) es un pronombre: se refiere a la persona a quien hablo.'],
    ['La casa ___ mi tía es azul.', ['de', 'dé'], 2, '«de» (sin tilde) es una preposición: indica pertenencia.'],
    ['Quiero que me ___ un lápiz.', ['dé', 'de'], 2, '«dé» (con tilde) es una forma del verbo dar.'],
    ['Quiero ___ agua, por favor.', ['más', 'mas'], 2, '«más» (con tilde) indica cantidad: mayor cantidad de algo.'],
    ['Dijo que ___ quería venir.', ['sí', 'si'], 2, '«sí» (con tilde) es una afirmación.'],
    ['___ llueve, no saldremos.', ['Si', 'Sí'], 2, '«si» (sin tilde) introduce una condición.'],
    ['Yo ___ la respuesta.', ['sé', 'se'], 3, '«sé» (con tilde) es una forma del verbo saber.'],
    ['Ella ___ peina sola.', ['se', 'sé'], 3, '«se» (sin tilde) es un pronombre que acompaña al verbo (se peina).'],
    ['Lo intentó, ___ no pudo.', ['mas', 'más'], 3, '«mas» (sin tilde) significa «pero».']
];

export const PORQUES = [
    ['¿___ no viniste a la fiesta?', ['Por qué', 'Porque', 'Porqué'], 1, '«por qué» (separado y con tilde) se usa para hacer preguntas.'],
    ['No fui ___ estaba enfermo.', ['porque', 'por qué', 'porqué'], 1, '«porque» (junto y sin tilde) sirve para dar una respuesta o explicar la causa.'],
    ['¿___ llueve tanto hoy?', ['Por qué', 'Porque'], 1, '«por qué» (separado y con tilde) se usa para preguntar.'],
    ['Estudio ___ quiero aprender.', ['porque', 'por qué'], 1, '«porque» (junto y sin tilde) explica la causa de algo.'],
    ['No sé ___ llegó tarde.', ['por qué', 'porque', 'porqué'], 2, '«por qué» también se usa en preguntas indirectas (no sé por qué…).'],
    ['Quiero saber ___ lloras.', ['por qué', 'porque'], 2, '«por qué» se usa en preguntas indirectas (quiero saber por qué…).'],
    ['Explícame el ___ de tu respuesta.', ['porqué', 'porque', 'por qué'], 3, '«porqué» (junto y con tilde) es un sustantivo: significa «la razón» y casi siempre va después de «el».'],
    ['Dime el ___ de tu enojo.', ['porqué', 'porque'], 3, '«porqué» (junto y con tilde) es un sustantivo: significa «la razón» (el porqué).']
];

// ---------- Utilidades de comparación ----------

/** Todas las palabras correctas de las listas (para detectar colisiones de un "error" con una palabra correcta). */
export function todasLasPalabrasCorrectas() {
    return new Set([
        ...[BV, GJ, H, CSZ, LLY].flatMap((lista) => lista.map(([p]) => p)),
        ...ACENTUACION.map((e) => e.palabra)
    ]);
}

export { VOCALES, CON_TILDE, CON_TILDE_DE };
