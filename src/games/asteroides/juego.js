/**
 * Asteroides Matemáticos — juego del portal (contrato `Juego`).
 *
 * Qué ve el niño: arriba una operación ("7 × 3 = ?"); abajo caen asteroides con números y hay que
 * tocar (o disparar con el teclado) el que tiene la respuesta correcta.
 *
 * Qué hace cada pieza:
 *   logica/partida.js      reglas, puntos, rachas y motor adaptativo (sin DOM)
 *   logica/generadores.js  preguntas por grado/nivel/habilidad
 *   logica/campo.js        cuántos asteroides, velocidad, carriles, poderes
 *   dibujo.js              pintar en el canvas
 *   este archivo           une todo: entrada, bucle, estado visual y HUD
 *
 * Todo el tiempo avanza con el BUCLE (contadores de pasos), nunca con setTimeout: así la pausa funciona sola.
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego, PASO_60_FPS } from '../../core/bucle.js';
import { EntradaPuntero, EntradaTeclado } from '../../core/entrada.js';
import { SistemaParticulas } from '../../core/particula.js';
import { Utilidades } from '../../core/utilidades.js';
import { entre, elegir } from '../../core/aleatorio.js';
import { h, vaciar } from '../../ui/dom.js';
import { crearBotonEnsenar, pedirLeccion, presentarIntro } from '../../ui/ensenanza.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from './logica/partida.js';
import { colocarAsteroides, repartirOpciones, poderParaPregunta, PODERES, ANCHO, ALTO } from './logica/campo.js';
import {
    crearEstrellas, crearAsteroide, dibujarFondo, dibujarAsteroide, dibujarAnillo,
    dibujarPoder, dibujarLaser, dibujarNave
} from './dibujo.js';

const PASOS_TRANSICION_ACIERTO = 85;  // ≈ 1.4 s para ver la explosión y leer la felicitación
const PASOS_TRANSICION_ESCAPE = 170;  // ≈ 2.8 s: hay que leer la respuesta y la pista
const VELOCIDAD_LASER = 20;
const VELOCIDAD_PODER = 1.1;
const TOLERANCIA_TOQUE = 12;          // px lógicos extra alrededor del asteroide: los dedos no son tan precisos como el mouse
const TOLERANCIA_PANTALLA = 18;       // ...y en pantallas pequeñas (canvas reducido) se agranda hasta ~18 px reales
const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];
const NOMBRES_HABILIDAD = {
    suma: 'sumas', resta: 'restas', multiplicacion: 'multiplicaciones', division: 'divisiones',
    combinadas: 'operaciones combinadas', multiplos: 'múltiplos', decimales: 'decimales'
};

export class JuegoAsteroides extends Juego {
    /** El portal le hace al niño la misión de inicio antes de la primera partida (ver adaptativo/colocacion.js). */
    static admiteColocacion = true;

    static meta = {
        id: 'asteroides',
        nombre: 'Asteroides Matemáticos',
        descripcion: 'Toca el asteroide con la respuesta correcta. ¡Son 10 preguntas y si te equivocas hay una pista!',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.tiempoJuego = 0;     // ms de juego (solo avanza si el bucle corre)
        this.fase = 'jugando';    // jugando | transicion
        this.contadorFase = 0;
        this.efectos = { lento: 0, doble: 0 };
        this.asteroides = [];
        this.poderes = [];
        this.lasers = [];
        this.usaTeclado = false;
        this.objetivoTeclado = null;
        this.imagenLista = false;
    }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.partida = new Partida({
            grado: contexto.grado || 1,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio,
            colocacion: contexto.colocacion
        });
        this.audio = contexto.audio;
        this.estrellas = crearEstrellas(this.aleatorio);
        this.particulas = new SistemaParticulas();
        this.nave = { x: ANCHO / 2, objetivoX: ANCHO / 2, y: 535, ancho: 72, alto: 96 };

        this.imagenNave = new Image();
        this.imagenNave.onload = () => { this.imagenLista = true; };
        this.imagenNave.src = 'assets/nave.png';

        this.construirInterfaz(contenedor);
        this.configurarEntrada();

        this.bucle = new BucleJuego({
            actualizar: (paso) => this.actualizar(paso),
            dibujar: () => this.dibujar()
        });
        this.escuchaRedimension = () => this.ajustarTamano();
        window.addEventListener('resize', this.escuchaRedimension);

        this.empezarPregunta();   // primero el texto del HUD: así se mide el espacio REAL que queda para el canvas
        this.ajustarTamano();
        this.bucle.iniciar();
    }

    alPausar() { this.bucle.detener(); }

    alReanudar() { this.bucle.iniciar(); }

    alDestruir() {
        if (this.bucle) this.bucle.detener();
        if (this.entradaPuntero) this.entradaPuntero.desactivar();
        if (this.entradaTeclado) this.entradaTeclado.desactivar();
        if (this.alTeclearAccion) document.removeEventListener('keydown', this.alTeclearAccion);
        if (this.escuchaRedimension) window.removeEventListener('resize', this.escuchaRedimension);
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz (HUD en DOM: accesible y nítido) ----------

    construirInterfaz(contenedor) {
        this.textoProgreso = h('span', { class: 'asteroides__dato' });
        this.textoPuntos = h('span', { class: 'asteroides__dato' });
        this.textoRacha = h('span', { class: 'asteroides__dato' });
        this.zonaPoderes = h('span', { class: 'asteroides__poderes' });
        this.textoPregunta = h('p', { class: 'asteroides__pregunta', 'aria-live': 'polite', 'data-leer': true });
        this.textoMensaje = h('p', { class: 'asteroides__mensaje', 'aria-live': 'polite' });
        this.botonEnsenar = crearBotonEnsenar(() => pedirLeccion(this));
        this.canvas = h('canvas', {
            class: 'asteroides__canvas', width: ANCHO, height: ALTO, tabindex: '0',
            'aria-label': 'Campo de juego con asteroides. Toca el que tiene la respuesta correcta, o muévete con las flechas y dispara con la flecha arriba.'
        });
        this.ctx = this.canvas.getContext('2d');
        this.zonaCanvas = h('div', { class: 'asteroides__lienzo' }, this.canvas);

        this.raiz = h('section', { class: 'asteroides', 'aria-label': 'Asteroides Matemáticos' },
            h('div', { class: 'asteroides__hud' }, this.textoProgreso, this.textoPuntos, this.textoRacha, this.zonaPoderes),
            this.textoPregunta,
            this.textoMensaje,
            this.botonEnsenar,
            this.zonaCanvas,
            h('p', { class: 'asteroides__ayuda' }, 'Toca el asteroide con la respuesta. Con teclado: ← → para moverte y ↑ (o espacio) para disparar.'));
        contenedor.append(this.raiz);
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
        vaciar(this.zonaPoderes);
        if (this.efectos.lento > 0) this.zonaPoderes.append(h('span', { class: 'insignia-poder insignia-poder--lento' }, `${PODERES.lento.nombre} ${Math.ceil(this.efectos.lento / 60)}s`));
        if (this.efectos.doble > 0) this.zonaPoderes.append(h('span', { class: 'insignia-poder insignia-poder--doble' }, `${PODERES.doble.nombre} ${Math.ceil(this.efectos.doble / 60)}s`));
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `asteroides__mensaje ${tipo ? `asteroides__mensaje--${tipo}` : ''}`;
    }

    /** Ajusta el canvas al espacio disponible (sin salirse de la pantalla) y a la densidad de píxeles. */
    ajustarTamano() {
        const arriba = this.canvas.getBoundingClientRect().top;
        const altoDisponible = Math.max(220, window.innerHeight - arriba - 72);
        const ancho = Math.max(240, Math.min(this.zonaCanvasAncho(), altoDisponible * (ANCHO / ALTO), 1000));
        const alto = ancho * (ALTO / ANCHO);
        this.canvas.style.width = `${Math.round(ancho)}px`;
        this.canvas.style.height = `${Math.round(alto)}px`;
        this.escala = Math.min(2, (window.devicePixelRatio || 1) * (ancho / ANCHO));
        this.canvas.width = Math.round(ANCHO * this.escala);
        this.canvas.height = Math.round(ALTO * this.escala);
    }

    zonaCanvasAncho() {
        return this.zonaCanvas.clientWidth || ANCHO;
    }

    // ---------- Entrada ----------

    configurarEntrada() {
        this.entradaPuntero = new EntradaPuntero(this.canvas, {
            anchoLogico: ANCHO,
            altoLogico: ALTO,
            alPresionar: (p) => this.alPresionar(p),
            alMover: (p) => {
                if (p.tipo === 'mouse' || p.presionado) {
                    this.usaTeclado = false;
                    this.nave.objetivoX = p.x;
                }
            }
        });
        this.entradaPuntero.activar();

        this.entradaTeclado = new EntradaTeclado({
            izquierda: ['ArrowLeft', 'a', 'A'],
            derecha: ['ArrowRight', 'd', 'D']
        });
        this.entradaTeclado.activar();

        // Disparar es una acción puntual (no un estado): se escucha el keydown directamente
        this.alTeclearAccion = (e) => {
            if (this.estado !== 'jugando') return;
            const tecla = e.key;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'a', 'A', 'd', 'D'].includes(tecla)) {
                this.usaTeclado = true;
                if (tecla.startsWith('Arrow')) e.preventDefault(); // que las flechas no muevan la página
            }
            const esDisparo = tecla === 'ArrowUp' || tecla === 'w' || tecla === 'W' || tecla === ' ';
            if (!esDisparo || e.repeat) return;
            // Con un botón enfocado, la barra espaciadora es "pulsar el botón": no se la robamos
            const enfocado = document.activeElement;
            if (tecla === ' ' && enfocado && ['BUTTON', 'INPUT', 'A'].includes(enfocado.tagName)) return;
            e.preventDefault();
            this.usaTeclado = true;
            this.dispararConTeclado();
        };
        document.addEventListener('keydown', this.alTeclearAccion);
    }

    alPresionar({ x, y }) {
        if (this.estado !== 'jugando') return;
        this.usaTeclado = false;
        this.nave.objetivoX = x;
        for (let i = this.poderes.length - 1; i >= 0; i--) {
            const p = this.poderes[i];
            if (Utilidades.puntoEnCirculo(x, y, p.x, p.y, p.radio + TOLERANCIA_TOQUE)) return this.recogerPoder(p);
        }
        if (this.fase !== 'jugando') return;
        const elegido = this.asteroideEnPunto(x, y);
        if (elegido) this.elegirAsteroide(elegido);
    }

    /** El asteroide "tocado" es el de centro más cercano al toque, dentro de su área ampliada (no el último dibujado). */
    asteroideEnPunto(x, y) {
        const escalaPantalla = (this.canvas.clientWidth || ANCHO) / ANCHO;
        const tolerancia = Math.max(TOLERANCIA_TOQUE, TOLERANCIA_PANTALLA / escalaPantalla);
        let mejor = null;
        let mejorDistancia = Infinity;
        for (const a of this.asteroides) {
            if (a.estado !== 'activo' || a.y < -a.radio / 2) continue;
            const distancia = Math.hypot(x - a.x, y - a.y);
            if (distancia <= a.radio + tolerancia && distancia < mejorDistancia) {
                mejor = a;
                mejorDistancia = distancia;
            }
        }
        return mejor;
    }

    /** El teclado dispara al asteroide visible más cercano (en horizontal) a la nave. */
    asteroideMasCercano() {
        let mejor = null;
        for (const a of this.asteroides) {
            if (a.estado !== 'activo' || a.y < 0) continue;
            if (!mejor || Math.abs(a.x - this.nave.x) < Math.abs(mejor.x - this.nave.x)) mejor = a;
        }
        return mejor;
    }

    dispararConTeclado() {
        if (this.fase !== 'jugando') return;
        const objetivo = this.asteroideMasCercano();
        if (objetivo) this.elegirAsteroide(objetivo);
    }

    // ---------- Reglas en acción ----------

    empezarPregunta() {
        const info = this.partida.iniciarPregunta(this.tiempoJuego);
        if (!info) return this.terminar();

        const { pregunta, cantidad, velocidad } = info;
        const posiciones = colocarAsteroides(cantidad, this.aleatorio);
        const opciones = repartirOpciones(pregunta.opciones, this.aleatorio);
        this.asteroides = opciones.map((o, i) =>
            crearAsteroide(posiciones[i], o, o.id === pregunta.respuesta, velocidad, this.aleatorio));
        this.lasers = [];

        const tipoPoder = poderParaPregunta(this.partida.numero, this.aleatorio);
        this.poderes = tipoPoder
            ? [{ tipo: tipoPoder, x: entre(this.aleatorio, 80, ANCHO - 80), y: -30, radio: 26, eliminar: false }]
            : [];

        this.fase = 'jugando';
        this.textoPregunta.textContent = pregunta.enunciado;
        this.botonEnsenar.hidden = true;
        presentarIntro(this, pregunta.habilidad);
        this.mensaje(this.partida.numero === 1 ? 'Toca el asteroide con la respuesta correcta.' : '');
        this.actualizarHud();
    }

    elegirAsteroide(a) {
        const multiplicador = this.efectos.doble > 0 ? 2 : 1;
        const r = this.partida.responder(a.id, { ahoraMs: this.tiempoJuego, multiplicador });
        if (r.tipo === 'ignorada') return;

        this.disparar(a);
        if (r.tipo === 'correcta') {
            a.estado = 'impactado';
            this.fase = 'transicion';
            this.contadorFase = PASOS_TRANSICION_ACIERTO;
            this.asteroides.forEach((otro) => { if (otro !== a && otro.estado === 'activo') otro.estado = 'saliendo'; });
            const elogio = r.primerIntento ? elegir(this.aleatorio, ELOGIOS) : '¡Lo lograste!';
            this.mensaje(`${elogio} +${r.puntos} puntos`, 'bien');
            if (r.cambioNivel === 'subio') {
                this.mensaje(`${elogio} +${r.puntos} puntos · ¡Subiste de nivel en ${NOMBRES_HABILIDAD[r.habilidad] || r.habilidad}!`, 'bien');
            }
            this.botonEnsenar.hidden = true;
            this.audio.reproducirEfecto('acierto');
        } else {
            a.estado = 'incorrecto';
            a.temblor = 26;
            this.mensaje(`Casi. Pista: ${r.pista}`, 'pista');
            this.botonEnsenar.hidden = false;
            this.audio.reproducirEfecto('fallo');
        }
        this.actualizarHud();
    }

    disparar(objetivo) {
        this.audio.reproducirEfecto('laser');
        this.nave.objetivoX = Utilidades.limitar(objetivo.x, 0, ANCHO);
        this.lasers.push({ x: this.nave.x, y: this.nave.y - this.nave.alto / 2, dx: 0, dy: -1, objetivo });
    }

    recogerPoder(p) {
        p.eliminar = true;
        this.audio.reproducirEfecto('powerup');
        this.particulas.crearExplosion(p.x, p.y, 18, '#fde68a');
        if (p.tipo === 'lento') {
            this.efectos.lento = PODERES.lento.duracion;
            this.mensaje('¡Tiempo lento! Los asteroides van más despacio.', 'poder');
        } else if (p.tipo === 'doble') {
            this.efectos.doble = PODERES.doble.duracion;
            this.mensaje('¡Puntos dobles por unos segundos!', 'poder');
        } else {
            // Mitad: retira hasta 2 respuestas incorrectas (sin contarlas como error del niño)
            const incorrectas = this.asteroides.filter((a) => a.estado === 'activo' && !a.esCorrecta).slice(0, 2);
            incorrectas.forEach((a) => {
                a.estado = 'saliendo';
                this.particulas.crearExplosion(a.x, a.y, 14, '#9ca3af');
            });
            this.mensaje('¡Mitad! Se fueron dos respuestas incorrectas.', 'poder');
        }
        this.actualizarHud();
    }

    alEscaparse() {
        const r = this.partida.escapo({ ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;
        this.fase = 'transicion';
        this.contadorFase = PASOS_TRANSICION_ESCAPE;
        this.asteroides.forEach((a) => { if (a.estado === 'activo') a.estado = 'saliendo'; });
        this.mensaje(`Se escapó. La respuesta era ${r.textoRespuesta}. ${r.pista}`, 'pista');
        this.botonEnsenar.hidden = false;
        this.actualizarHud();
    }

    terminar() {
        this.bucle.detener();
        this.finalizar(this.partida.resultado(this.tiempoJuego)); // siempre lo ÚLTIMO que hace el juego
    }

    // ---------- Actualización por paso fijo ----------

    actualizar(paso) {
        this.tiempoJuego += paso;
        this.moverNave();

        const hudCambia = this.avanzarEfectos();
        const factor = this.efectos.lento > 0 ? 0.5 : 1;

        for (const a of this.asteroides) this.actualizarAsteroide(a, factor);
        this.asteroides = this.asteroides.filter((a) => !a.eliminar);

        for (const p of this.poderes) {
            p.y += VELOCIDAD_PODER * factor;
            if (p.y - p.radio > ALTO) p.eliminar = true;
        }
        this.poderes = this.poderes.filter((p) => !p.eliminar);

        this.actualizarLasers();
        this.particulas.actualizar();
        this.objetivoTeclado = this.usaTeclado && this.fase === 'jugando' ? this.asteroideMasCercano() : null;

        if (hudCambia) this.actualizarHud();
        if (this.fase === 'transicion' && --this.contadorFase <= 0) this.empezarPregunta();
    }

    moverNave() {
        const n = this.nave;
        if (this.entradaTeclado.estaActiva('izquierda')) n.objetivoX -= 11;
        if (this.entradaTeclado.estaActiva('derecha')) n.objetivoX += 11;
        n.objetivoX = Utilidades.limitar(n.objetivoX, n.ancho / 2, ANCHO - n.ancho / 2);
        n.x += Utilidades.limitar(n.objetivoX - n.x, -16, 16);
    }

    /** @returns {boolean} true si hay que refrescar el HUD (cambió un contador de segundos) */
    avanzarEfectos() {
        let cambia = false;
        for (const clave of ['lento', 'doble']) {
            if (this.efectos[clave] > 0) {
                this.efectos[clave]--;
                if (this.efectos[clave] % 60 === 0) cambia = true;
            }
        }
        return cambia;
    }

    actualizarAsteroide(a, factor) {
        a.rotacion += a.velRotacion;
        if (a.estado === 'incorrecto') {
            a.temblor = Math.max(0, a.temblor - 1);
            a.alfa -= 0.025;
            if (a.alfa <= 0) a.eliminar = true;
            return;
        }
        if (a.estado === 'saliendo') {
            a.y += a.velocidad * factor;
            a.alfa -= 0.04;
            if (a.alfa <= 0) a.eliminar = true;
            return;
        }
        a.y += a.velocidad * factor;
        if (a.y - a.radio > ALTO) {
            if (a.estado === 'activo' && a.esCorrecta && this.fase === 'jugando') this.alEscaparse();
            a.eliminar = true;
        }
    }

    actualizarLasers() {
        for (const l of this.lasers) {
            const o = l.objetivo;
            const dx = o.x - l.x;
            const dy = o.y - l.y;
            const distancia = Math.hypot(dx, dy);
            if (distancia <= VELOCIDAD_LASER || o.eliminar) {
                l.llego = true;
                if (!o.eliminar) this.alImpacto(o);
                continue;
            }
            l.dx = dx / distancia;
            l.dy = dy / distancia;
            l.x += l.dx * VELOCIDAD_LASER;
            l.y += l.dy * VELOCIDAD_LASER;
        }
        this.lasers = this.lasers.filter((l) => !l.llego);
    }

    alImpacto(a) {
        if (a.estado === 'impactado') {
            this.audio.reproducirEfecto('explosion');
            this.particulas.crearExplosion(a.x, a.y, 34, '#4ade80');
            this.particulas.crearExplosion(a.x, a.y, 16, '#fde68a');
            a.eliminar = true;
        } else {
            this.particulas.crearExplosion(a.x, a.y, 10, '#fca5a5');
        }
    }

    // ---------- Dibujo ----------

    dibujar() {
        const ctx = this.ctx;
        ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
        dibujarFondo(ctx, this.estrellas, this.tiempoJuego);
        for (const p of this.poderes) dibujarPoder(ctx, p, this.tiempoJuego);
        for (const a of this.asteroides) dibujarAsteroide(ctx, a);
        if (this.objetivoTeclado) dibujarAnillo(ctx, this.objetivoTeclado, this.tiempoJuego);
        for (const l of this.lasers) dibujarLaser(ctx, l);
        dibujarNave(ctx, this.nave, this.imagenNave, this.imagenLista);
        this.particulas.dibujar(ctx);
    }
}
