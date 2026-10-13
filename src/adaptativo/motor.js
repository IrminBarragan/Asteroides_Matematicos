/**
 * Motor adaptativo por HABILIDAD.
 *
 * Generaliza al antiguo SistemaIA (que solo conocía 4 operaciones). Una "habilidad" es
 * cualquier cosa que se pueda practicar y medir: 'suma-con-llevada', 'ortografia-bv', 'hora-cuartos'...
 *
 * Qué hace:
 *  1. Mide el dominio de cada habilidad con una ventana de los últimos intentos.
 *  2. Ajusta el NIVEL de dificultad de cada habilidad (sube si domina, baja si le cuesta).
 *  3. Dice cuál habilidad conviene REFORZAR.
 *
 * Criterio pedagógico: nunca castiga. Si al niño le cuesta, el motor baja la dificultad y sugiere
 * una pista; no acelera el juego ni quita premios. Es una heurística simple y explicable
 * (umbrales sobre una ventana), no un modelo opaco: se puede justificar en una defensa.
 */
export const OPCIONES_POR_DEFECTO = {
    ventana: 8,        // cuántos intentos recientes cuentan
    minIntentos: 5,    // mínimo de intentos en la ventana antes de decidir un cambio de nivel
    umbralSubir: 0.85, // dominio >= 85% → sube de nivel
    umbralBajar: 0.5,  // dominio < 50%  → baja de nivel
    umbralReforzar: 0.7, // por debajo de esto una habilidad se considera "a reforzar"
    fallosParaPista: 2   // fallos seguidos a partir de los cuales se ofrece una pista
};

export class MotorAdaptativo {
    /**
     * @param {Object<string, {nivelMax: number, nivelInicial?: number}>} habilidades
     * @param {Object} [opciones]  ver OPCIONES_POR_DEFECTO
     */
    constructor(habilidades, opciones = {}) {
        if (!habilidades || Object.keys(habilidades).length === 0) {
            throw new Error('El motor necesita al menos una habilidad');
        }
        this.opciones = { ...OPCIONES_POR_DEFECTO, ...opciones };
        this.habilidades = {};
        for (const [nombre, config] of Object.entries(habilidades)) {
            if (!Number.isInteger(config.nivelMax) || config.nivelMax < 1) {
                throw new Error(`${nombre}: nivelMax debe ser un entero >= 1`);
            }
            const inicial = config.nivelInicial ?? 1;
            this.habilidades[nombre] = {
                nivelMax: config.nivelMax,
                nivel: Math.min(Math.max(inicial, 1), config.nivelMax),
                intentos: [],          // ventana: [{ ok, tiempoMs }]
                fallosSeguidos: 0,
                total: 0,
                totalOk: 0
            };
        }
    }

    estado(habilidad) {
        const h = this.habilidades[habilidad];
        if (!h) throw new Error(`Habilidad desconocida: ${habilidad}`);
        return h;
    }

    /**
     * Registra un intento.
     * @returns {{cambio: 'subio'|'bajo'|null, nivel: number}}
     */
    registrar(habilidad, correcta, tiempoMs = 0) {
        const h = this.estado(habilidad);
        h.intentos.push({ ok: Boolean(correcta), tiempoMs });
        if (h.intentos.length > this.opciones.ventana) h.intentos.shift();

        h.total++;
        if (correcta) {
            h.totalOk++;
            h.fallosSeguidos = 0;
        } else {
            h.fallosSeguidos++;
        }

        let cambio = null;
        if (h.intentos.length >= this.opciones.minIntentos) {
            const dominio = this.dominio(habilidad);
            if (dominio >= this.opciones.umbralSubir && h.nivel < h.nivelMax) {
                h.nivel++;
                cambio = 'subio';
            } else if (dominio < this.opciones.umbralBajar && h.nivel > 1) {
                h.nivel--;
                cambio = 'bajo';
            }
            // Tras un cambio se empieza una ventana limpia: el nuevo nivel se evalúa por sí mismo
            if (cambio) h.intentos = [];
        }
        return { cambio, nivel: h.nivel };
    }

    nivel(habilidad) {
        return this.estado(habilidad).nivel;
    }

    /** Proporción de aciertos en la ventana (0..1), o null si aún no hay intentos. */
    dominio(habilidad) {
        const { intentos } = this.estado(habilidad);
        if (intentos.length === 0) return null;
        return intentos.filter((i) => i.ok).length / intentos.length;
    }

    /** ¿Conviene mostrar una pista? Tras varios fallos seguidos. */
    necesitaPista(habilidad) {
        return this.estado(habilidad).fallosSeguidos >= this.opciones.fallosParaPista;
    }

    /**
     * Habilidad que más necesita refuerzo: la de menor dominio entre las que están por debajo
     * del umbral y tienen datos suficientes. null si no hay ninguna.
     */
    habilidadAReforzar() {
        let peor = null;
        let menorDominio = this.opciones.umbralReforzar;
        for (const nombre of Object.keys(this.habilidades)) {
            const dominio = this.dominio(nombre);
            if (dominio === null || this.habilidades[nombre].intentos.length < 3) continue;
            if (dominio < menorDominio) {
                menorDominio = dominio;
                peor = nombre;
            }
        }
        return peor;
    }

    /**
     * Elige qué habilidad practicar a continuación. Todas pueden salir, pero las que cuestan
     * más tienen más probabilidad (refuerzo) sin eliminar la variedad.
     * @param {Function} [aleatorio]  () => [0,1); inyectable para pruebas
     */
    elegirHabilidad(aleatorio = Math.random) {
        const nombres = Object.keys(this.habilidades);
        const pesos = nombres.map((n) => {
            const dominio = this.dominio(n);
            return dominio === null ? 1 : 1 + (1 - dominio) * 3; // peso 1 (domina) a 4 (todo mal)
        });
        const total = pesos.reduce((a, b) => a + b, 0);
        let punto = aleatorio() * total;
        for (let i = 0; i < nombres.length; i++) {
            punto -= pesos[i];
            if (punto < 0) return nombres[i];
        }
        return nombres[nombres.length - 1];
    }

    /** Resumen para el "modo maestro". */
    resumen() {
        return Object.entries(this.habilidades).map(([nombre, h]) => ({
            habilidad: nombre,
            nivel: h.nivel,
            nivelMax: h.nivelMax,
            dominio: this.dominio(nombre),
            intentosTotales: h.total,
            precisionGlobal: h.total === 0 ? null : h.totalOk / h.total,
            tiempoPromedioMs: h.intentos.length === 0 ? null
                : h.intentos.reduce((s, i) => s + i.tiempoMs, 0) / h.intentos.length
        }));
    }

    // ---------- Persistencia ----------

    exportar() {
        const salida = {};
        for (const [nombre, h] of Object.entries(this.habilidades)) {
            salida[nombre] = {
                nivel: h.nivel,
                intentos: h.intentos.map((i) => ({ ...i })),
                fallosSeguidos: h.fallosSeguidos,
                total: h.total,
                totalOk: h.totalOk
            };
        }
        return salida;
    }

    /**
     * Restaura una instantánea. Ignora lo que no reconoce y acota valores
     * (los datos vienen de localStorage: pueden estar viejos o manipulados).
     */
    importar(instantanea) {
        if (!instantanea || typeof instantanea !== 'object') return;
        for (const [nombre, guardado] of Object.entries(instantanea)) {
            const h = this.habilidades[nombre];
            if (!h || !guardado || typeof guardado !== 'object') continue;
            if (Number.isInteger(guardado.nivel)) h.nivel = Math.min(Math.max(guardado.nivel, 1), h.nivelMax);
            if (Array.isArray(guardado.intentos)) {
                h.intentos = guardado.intentos
                    .filter((i) => i && typeof i.ok === 'boolean')
                    .slice(-this.opciones.ventana)
                    .map((i) => ({ ok: i.ok, tiempoMs: Number.isFinite(i.tiempoMs) ? i.tiempoMs : 0 }));
            }
            const entero = (n) => (Number.isInteger(n) && n >= 0 ? n : 0);
            h.fallosSeguidos = entero(guardado.fallosSeguidos);
            h.total = entero(guardado.total);
            h.totalOk = Math.min(entero(guardado.totalOk), h.total);
        }
    }
}
