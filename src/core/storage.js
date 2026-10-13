/**
 * Almacenamiento del progreso (perfiles de niños, estrellas, ajustes).
 *
 * Decisiones:
 *  - MÚLTIPLES PERFILES: en una PC de primaria juegan varios niños en la misma máquina.
 *  - SOLO apodo + avatar + grado. Sin datos personales (son menores de edad).
 *  - Esquema VERSIONADO: si el formato cambia en el futuro, se migra en vez de perder el progreso.
 *  - NUNCA lanza al usuario: localStorage puede estar bloqueado, lleno o corrupto. En ese caso
 *    se sigue funcionando en memoria y se conserva una copia del dato dañado.
 */

export const VERSION_ESQUEMA = 2;
export const CLAVE_ALMACEN = 'portal-juegos-educativos';
export const MAX_PERFILES = 40;
export const MAX_LARGO_APODO = 16;
export const AVATARES = ['gato', 'perro', 'conejo', 'zorro', 'panda', 'leon', 'rana', 'pulpo'];

/** Reemplazo en memoria cuando localStorage no está disponible. */
export class AlmacenMemoria {
    constructor() { this.datos = new Map(); }
    getItem(clave) { return this.datos.has(clave) ? this.datos.get(clave) : null; }
    setItem(clave, valor) { this.datos.set(clave, String(valor)); }
    removeItem(clave) { this.datos.delete(clave); }
}

/**
 * Devuelve localStorage si funciona de verdad (puede existir pero lanzar al escribir,
 * p. ej. en modo privado o con datos de sitio bloqueados); si no, memoria.
 */
export function crearAlmacenamientoSeguro() {
    try {
        const prueba = '__prueba__';
        window.localStorage.setItem(prueba, '1');
        window.localStorage.removeItem(prueba);
        return window.localStorage;
    } catch (error) {
        return new AlmacenMemoria();
    }
}

export function crearDatosIniciales() {
    return {
        version: VERSION_ESQUEMA,
        ajustes: { sonido: true, lecturaAsistida: false },
        perfilActivo: null,
        siguienteId: 1,
        perfiles: {}
    };
}

/**
 * Migraciones: MIGRACIONES[n] convierte datos de la versión n a la n+1.
 *  - 1 → 2 (v0.2): cada perfil gana `contenido` ({ juegoId: grado de contenido }): el grado de contenido en el que
 *    el sistema decidió que debe jugar cada juego (ver adaptativo/colocacion.js). Vacío = aún no hizo la misión de inicio.
 */
export const MIGRACIONES = {
    1: (datos) => ({
        ...datos,
        perfiles: Object.fromEntries(Object.entries(datos.perfiles || {}).map(([id, p]) => [id, { ...p, contenido: {} }]))
    })
};

export function migrar(datos, migraciones = MIGRACIONES, versionObjetivo = VERSION_ESQUEMA) {
    let actual = datos;
    while (actual.version < versionObjetivo) {
        const paso = migraciones[actual.version];
        if (!paso) throw new Error(`No hay migración desde la versión ${actual.version}`);
        actual = { ...paso(actual), version: actual.version + 1 };
    }
    return actual;
}

const esObjeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

function perfilValido(p) {
    return esObjeto(p)
        && Number.isInteger(p.id)
        && typeof p.apodo === 'string'
        && typeof p.avatar === 'string'
        && Number.isInteger(p.grado) && p.grado >= 1 && p.grado <= 6
        && esObjeto(p.juegos)
        && esObjeto(p.habilidades)
        && esObjeto(p.contenido)
        && Object.values(p.contenido).every((g) => Number.isInteger(g) && g >= 1 && g <= 6);
}

/** Comprueba la estructura mínima; protege contra datos manipulados o dañados. */
export function esquemaValido(d) {
    if (!esObjeto(d) || d.version !== VERSION_ESQUEMA) return false;
    if (!esObjeto(d.ajustes) || !esObjeto(d.perfiles) || !Number.isInteger(d.siguienteId)) return false;
    const perfiles = Object.values(d.perfiles);
    if (!perfiles.every(perfilValido)) return false;
    if (d.perfilActivo !== null && !(String(d.perfilActivo) in d.perfiles)) return false;
    return true;
}

/** Limpia un apodo: sin caracteres de control ni < >, espacios colapsados, largo acotado. */
export function limpiarApodo(texto) {
    return String(texto ?? '')
        .replace(/[\u0000-\u001f\u007f<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_LARGO_APODO);
}

const copiar = (x) => JSON.parse(JSON.stringify(x));

export class Progreso {
    /**
     * @param {Storage|AlmacenMemoria} [almacenamiento]
     * @param {Object} [opciones]
     * @param {string} [opciones.clave]
     * @param {Function} [opciones.ahora]  () => número (inyectable para pruebas)
     */
    constructor(almacenamiento = crearAlmacenamientoSeguro(), { clave = CLAVE_ALMACEN, ahora = () => Date.now() } = {}) {
        this.almacenamiento = almacenamiento;
        this.clave = clave;
        this.ahora = ahora;
        this.guardadoFallido = false;
        this.recuperadoDeError = false; // true si se tuvo que descartar un dato dañado
        this.datos = this.cargar();
    }

    // ---------- Carga y guardado ----------

    cargar() {
        let crudo = null;
        try {
            crudo = this.almacenamiento.getItem(this.clave);
        } catch (error) {
            return crearDatosIniciales();
        }
        if (crudo === null) return crearDatosIniciales();

        try {
            let datos = JSON.parse(crudo);
            if (esObjeto(datos) && Number.isInteger(datos.version) && datos.version < VERSION_ESQUEMA) {
                datos = migrar(datos);
            }
            if (esquemaValido(datos)) return datos;
        } catch (error) { /* se trata abajo como dato dañado */ }

        this.respaldarDatoDanado(crudo);
        return crearDatosIniciales();
    }

    respaldarDatoDanado(crudo) {
        this.recuperadoDeError = true;
        try {
            this.almacenamiento.setItem(`${this.clave}-danado`, crudo);
        } catch (error) { /* sin espacio: no se puede respaldar, se sigue */ }
    }

    guardar() {
        try {
            this.almacenamiento.setItem(this.clave, JSON.stringify(this.datos));
            this.guardadoFallido = false;
        } catch (error) {
            this.guardadoFallido = true; // se sigue en memoria; la interfaz puede avisar
        }
    }

    // ---------- Perfiles ----------

    listarPerfiles() {
        return Object.values(this.datos.perfiles).map(copiar);
    }

    perfilActivo() {
        const id = this.datos.perfilActivo;
        return id === null ? null : copiar(this.datos.perfiles[id]);
    }

    /**
     * @returns {Object} el perfil creado (queda activo)
     * @throws {Error} si los datos son inválidos o se alcanzó el máximo
     */
    crearPerfil({ apodo, avatar, grado }) {
        const apodoLimpio = limpiarApodo(apodo);
        if (apodoLimpio.length === 0) throw new Error('El apodo no puede estar vacío');
        if (!AVATARES.includes(avatar)) throw new Error('Avatar no válido');
        if (!Number.isInteger(grado) || grado < 1 || grado > 6) throw new Error('El grado debe ser de 1 a 6');
        if (Object.keys(this.datos.perfiles).length >= MAX_PERFILES) {
            throw new Error(`Máximo ${MAX_PERFILES} perfiles en este equipo`);
        }
        const yaExiste = Object.values(this.datos.perfiles)
            .some((p) => p.apodo.toLowerCase() === apodoLimpio.toLowerCase());
        if (yaExiste) throw new Error('Ya existe un perfil con ese apodo');

        const id = this.datos.siguienteId++;
        const perfil = { id, apodo: apodoLimpio, avatar, grado, juegos: {}, habilidades: {}, contenido: {}, creado: this.ahora() };
        this.datos.perfiles[id] = perfil;
        this.datos.perfilActivo = id;
        this.guardar();
        return copiar(perfil);
    }

    seleccionarPerfil(id) {
        if (!(String(id) in this.datos.perfiles)) throw new Error('El perfil no existe');
        this.datos.perfilActivo = Number(id);
        this.guardar();
    }

    cerrarSesion() {
        this.datos.perfilActivo = null;
        this.guardar();
    }

    eliminarPerfil(id) {
        if (!(String(id) in this.datos.perfiles)) return false;
        delete this.datos.perfiles[id];
        if (this.datos.perfilActivo === Number(id)) this.datos.perfilActivo = null;
        this.guardar();
        return true;
    }

    cambiarGrado(grado) {
        const perfil = this.perfilInterno();
        if (!Number.isInteger(grado) || grado < 1 || grado > 6) throw new Error('El grado debe ser de 1 a 6');
        perfil.grado = grado;
        this.guardar();
    }

    perfilInterno() {
        const id = this.datos.perfilActivo;
        if (id === null) throw new Error('No hay un perfil activo');
        return this.datos.perfiles[id];
    }

    // ---------- Resultados y estrellas ----------

    /**
     * Guarda el resultado de una partida del perfil activo.
     * @param {string} juegoId
     * @param {Object} resultado  ya normalizado (ver resultado.js)
     * @returns {{esRecord: boolean, estrellasGanadas: number}} estrellasGanadas = mejora sobre su mejor marca previa
     */
    registrarResultado(juegoId, resultado) {
        const perfil = this.perfilInterno();
        const previo = perfil.juegos[juegoId] || { partidas: 0, mejorPuntaje: 0, mejorEstrellas: 0 };
        const esRecord = resultado.puntaje > previo.mejorPuntaje;
        const mejorEstrellas = Math.max(previo.mejorEstrellas, resultado.estrellas);

        perfil.juegos[juegoId] = {
            partidas: previo.partidas + 1,
            mejorPuntaje: Math.max(previo.mejorPuntaje, resultado.puntaje),
            mejorEstrellas,
            ultimaPartida: this.ahora()
        };
        this.guardar();
        return { esRecord, estrellasGanadas: mejorEstrellas - previo.mejorEstrellas };
    }

    estadoJuego(juegoId) {
        const perfil = this.perfilInterno();
        return copiar(perfil.juegos[juegoId] || { partidas: 0, mejorPuntaje: 0, mejorEstrellas: 0 });
    }

    /** Suma de la mejor marca de estrellas de cada juego (no se puede "farmear" repitiendo un juego). */
    estrellasTotales() {
        const perfil = this.perfilInterno();
        return Object.values(perfil.juegos).reduce((suma, j) => suma + j.mejorEstrellas, 0);
    }

    // ---------- Habilidades (motor adaptativo) ----------

    guardarHabilidades(juegoId, instantanea) {
        this.perfilInterno().habilidades[juegoId] = copiar(instantanea);
        this.guardar();
    }

    obtenerHabilidades(juegoId) {
        const perfil = this.perfilInterno();
        return perfil.habilidades[juegoId] ? copiar(perfil.habilidades[juegoId]) : null;
    }

    // ---------- Grado de contenido (nivel de partida decidido por el sistema) ----------

    /** Grado de contenido (1..6) en el que juega este juego el perfil activo, o null si aún no hizo la misión de inicio. */
    obtenerGradoContenido(juegoId) {
        const g = this.perfilInterno().contenido[juegoId];
        return Number.isInteger(g) ? g : null;
    }

    guardarGradoContenido(juegoId, grado) {
        if (!Number.isInteger(grado) || grado < 1 || grado > 6) throw new Error('El grado de contenido debe ser de 1 a 6');
        this.perfilInterno().contenido[juegoId] = grado;
        this.guardar();
    }

    /** Al cambiar de grado de contenido, los niveles por habilidad del grado anterior ya no aplican. */
    reiniciarHabilidades(juegoId) {
        delete this.perfilInterno().habilidades[juegoId];
        this.guardar();
    }

    /** Para volver a lanzar la misión de inicio de un niño (modo maestro). */
    reiniciarColocacion(id) {
        const perfil = this.datos.perfiles[id];
        if (!perfil) return false;
        perfil.contenido = {};
        perfil.habilidades = {};
        this.guardar();
        return true;
    }

    // ---------- Ajustes ----------

    ajustes() {
        return { ...this.datos.ajustes };
    }

    establecerAjuste(nombre, valor) {
        if (!(nombre in this.datos.ajustes)) throw new Error(`Ajuste desconocido: ${nombre}`);
        if (typeof valor !== 'boolean') throw new Error('Los ajustes son valores sí/no');
        this.datos.ajustes[nombre] = valor;
        this.guardar();
    }

    /** Borra TODO el progreso de este equipo (modo maestro). */
    reiniciarTodo() {
        this.datos = crearDatosIniciales();
        this.guardar();
    }
}
