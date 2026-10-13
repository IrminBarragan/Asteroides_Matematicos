/**
 * Atrapa la Ortografía — juego del portal (contrato `Juego`), basado en DOM.
 *
 * Qué ve el niño: una pregunta ("¿Cuál está bien escrita?" o una oración con un espacio) y 2–3 palabras en burbujas
 * que caen hacia el pasto. Hay que tocar la correcta. Si se equivoca: pista y puede reintentar. Al acertar (o si la
 * palabra se escapa) se explica la regla.
 *
 * Las palabras son BOTONES reales: funcionan con toque, ratón y teclado (Tab, ← →, Enter, o los números 1–3) y los
 * lectores de pantalla las anuncian. Su movimiento lo calcula el bucle de paso fijo (se pausa solo).
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego } from '../../core/bucle.js';
import { Planificador } from '../../core/planificador.js';
import { elegir, mezclar } from '../../core/aleatorio.js';
import { tiempoDeLectura } from '../../core/lectura.js';
import { h, vaciar } from '../../ui/dom.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';

const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];
const ALTO_PASTO_PX = 64;       // al llegar al pasto, la palabra "se escapó"
const RECORRIDO = 1.3;          // fracciones de alto que recorre (de arriba, fuera de pantalla, hasta el pasto)
const CARRILES = { 2: [30, 70], 3: [18, 50, 82] };

export class JuegoOrtografia extends Juego {
    static meta = {
        id: 'ortografia',
        nombre: 'Atrapa la Ortografía',
        descripcion: 'Atrapa la palabra bien escrita antes de que caiga al pasto. ¡Cada una trae una pista!',
        area: 'espanol',
        grados: [3, 4, 5, 6]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.fase = 'jugando';   // jugando | transicion
        this.palabras = [];
        this.alto = 360;
        this.tareaSiguiente = null;
    }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.audio = contexto.audio;
        this.partida = new Partida({
            grado: contexto.grado || 3,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio
        });
        this.construirInterfaz(contenedor);

        this.bucle = new BucleJuego({
            actualizar: (paso) => this.actualizar(paso),
            dibujar: () => this.dibujar()
        });
        this.alTeclear = (e) => this.manejarTeclado(e);
        this.alRedimensionar = () => this.medir();
        document.addEventListener('keydown', this.alTeclear);
        window.addEventListener('resize', this.alRedimensionar);

        this.medir();
        this.empezarPregunta();
        this.bucle.iniciar();
    }

    alPausar() { this.bucle.detener(); }

    alReanudar() { this.bucle.iniciar(); }

    alDestruir() {
        if (this.bucle) this.bucle.detener();
        this.planificador.limpiar();
        if (this.alTeclear) document.removeEventListener('keydown', this.alTeclear);
        if (this.alRedimensionar) window.removeEventListener('resize', this.alRedimensionar);
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz ----------

    construirInterfaz(contenedor) {
        this.textoProgreso = h('span', { class: 'ortografia__dato' });
        this.textoPuntos = h('span', { class: 'ortografia__dato' });
        this.textoRacha = h('span', { class: 'ortografia__dato' });
        this.textoEnunciado = h('p', { class: 'ortografia__enunciado', 'aria-live': 'polite', 'data-leer': true });
        this.textoMensaje = h('p', { class: 'ortografia__mensaje', 'aria-live': 'polite' });
        this.botonSiguiente = h('button', { class: 'boton boton--secundario ortografia__siguiente', type: 'button', hidden: true, onClick: () => this.irASiguiente() }, 'Siguiente ➜');
        this.cielo = h('div', { class: 'ortografia__cielo', role: 'group', 'aria-label': 'Palabras que caen' },
            h('div', { class: 'ortografia__pasto', 'aria-hidden': 'true' }));
        this.raiz = h('section', { class: 'ortografia', 'aria-label': 'Atrapa la Ortografía' },
            h('div', { class: 'ortografia__hud' }, this.textoProgreso, this.textoPuntos, this.textoRacha),
            this.textoEnunciado,
            this.cielo,
            h('div', { class: 'ortografia__pie' }, this.textoMensaje, this.botonSiguiente),
            h('p', { class: 'ortografia__ayuda' }, 'Toca la palabra correcta. Con teclado: Tab o ← → para elegir y Enter para atraparla (también sirven los números 1, 2 y 3).'));
        contenedor.append(this.raiz);
    }

    medir() {
        this.alto = this.cielo.clientHeight || 360;
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `ortografia__mensaje ${tipo ? `ortografia__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
    }

    /** Escribe el enunciado; en las oraciones el espacio queda como un hueco que se llena al acertar. */
    escribirEnunciado(pregunta) {
        vaciar(this.textoEnunciado);
        this.hueco = null;
        if (pregunta.tipo !== 'oracion') {
            this.textoEnunciado.append(pregunta.enunciado);
            return;
        }
        const [antes, despues] = pregunta.enunciado.split('___');
        this.hueco = h('span', { class: 'ortografia__hueco', 'aria-label': 'espacio por completar' }, '     ');
        this.textoEnunciado.append(antes, this.hueco, despues);
    }

    // ---------- Reglas en acción ----------

    empezarPregunta() {
        const info = this.partida.iniciarPregunta(this.tiempoJuego);
        if (!info) return this.terminar();

        const { pregunta, cantidad, segundos } = info;
        this.limpiarPalabras();
        this.fase = 'jugando';
        this.botonSiguiente.hidden = true;
        this.escribirEnunciado(pregunta);

        const carriles = mezclar(this.aleatorio, CARRILES[Math.min(pregunta.opciones.length, 3)] || CARRILES[3]);
        const velocidad = RECORRIDO / (segundos * 60); // fracción de alto por paso de 1/60 s
        this.palabras = pregunta.opciones.map((opcion, i) => {
            const boton = h('button', {
                class: `palabra palabra--color${(opcion.id + this.partida.numero) % 4}`, type: 'button',
                style: `left:${carriles[i]}%`, onClick: () => this.elegir(palabra)
            }, opcion.texto);
            const palabra = {
                id: opcion.id, texto: opcion.texto, boton, x: carriles[i],
                y: -(0.12 + this.aleatorio() * 0.14), velocidad, estado: 'activa'
            };
            this.cielo.append(boton);
            return palabra;
        });
        this.dibujar();
        this.mensaje(this.partida.numero === 1 ? 'Toca la palabra correcta antes de que llegue al pasto.' : '');
        this.actualizarHud();
    }

    limpiarPalabras() {
        this.palabras.forEach((p) => p.boton.remove());
        this.palabras = [];
    }

    elegir(palabra) {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || palabra.estado !== 'activa') return;
        const r = this.partida.responder(palabra.id, { ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;

        if (r.tipo === 'correcta') {
            palabra.estado = 'correcta';
            this.marcar(palabra, 'palabra--correcta');
            this.palabras.forEach((otra) => { if (otra !== palabra && otra.estado === 'activa') { otra.estado = 'saliendo'; this.marcar(otra, 'palabra--saliendo'); } });
            if (this.hueco) this.hueco.textContent = palabra.texto;
            const elogio = r.primerIntento ? elegir(this.aleatorio, ELOGIOS) : '¡Lo lograste!';
            let texto = `${elogio} +${r.puntos} puntos. ${r.explicacion}`;
            if (r.cambioNivel === 'subio') texto += ` ¡Subiste de nivel en ${NOMBRES_HABILIDAD[r.habilidad]}!`;
            this.mensaje(texto, 'bien');
            this.audio.reproducirEfecto('acierto');
            this.entrarEnTransicion(texto);
        } else {
            palabra.estado = 'incorrecta';
            this.marcar(palabra, 'palabra--incorrecta');
            palabra.boton.setAttribute('aria-disabled', 'true');
            this.mensaje(`Casi. Pista: ${r.pista}`, 'pista');
            this.audio.reproducirEfecto('fallo');
        }
        this.actualizarHud();
    }

    marcar(palabra, clase) {
        palabra.boton.classList.add(clase);
    }

    alEscaparse() {
        const r = this.partida.escapo({ ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;
        this.palabras.forEach((p) => { if (p.estado === 'activa') { p.estado = 'saliendo'; this.marcar(p, 'palabra--saliendo'); } });
        if (this.hueco) this.hueco.textContent = r.textoRespuesta;
        const texto = `Se escapó. La palabra correcta era «${r.textoRespuesta}». ${r.explicacion}`;
        this.mensaje(texto, 'pista');
        this.entrarEnTransicion(texto);
        this.actualizarHud();
    }

    /** Da tiempo de LEER la explicación (o se salta con el botón); sin presión. */
    entrarEnTransicion(textoParaLeer) {
        this.fase = 'transicion';
        this.botonSiguiente.hidden = false;
        this.tareaSiguiente = this.planificador.programar(tiempoDeLectura(textoParaLeer), () => this.irASiguiente());
    }

    irASiguiente() {
        if (this.estado !== 'jugando' || this.fase !== 'transicion') return;
        if (this.tareaSiguiente !== null) this.planificador.cancelar(this.tareaSiguiente);
        this.tareaSiguiente = null;
        this.empezarPregunta();
    }

    terminar() {
        this.bucle.detener();
        this.finalizar(this.partida.resultado(this.tiempoJuego)); // siempre lo ÚLTIMO que hace el juego
    }

    // ---------- Teclado ----------

    palabrasActivasDeIzquierdaADerecha() {
        return this.palabras.filter((p) => p.estado === 'activa').sort((a, b) => a.x - b.x);
    }

    manejarTeclado(e) {
        if (this.estado !== 'jugando' || e.ctrlKey || e.altKey || e.metaKey) return;
        const activas = this.palabrasActivasDeIzquierdaADerecha();
        if (e.key >= '1' && e.key <= '3') {
            const palabra = activas[Number(e.key) - 1];
            if (palabra && this.fase === 'jugando') { e.preventDefault(); palabra.boton.focus({ preventScroll: true }); this.elegir(palabra); }
        } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && activas.length > 0) {
            e.preventDefault();
            const actual = activas.findIndex((p) => p.boton === document.activeElement);
            const siguiente = actual === -1 ? 0 : (actual + (e.key === 'ArrowRight' ? 1 : activas.length - 1)) % activas.length;
            activas[siguiente].boton.focus({ preventScroll: true });
        }
    }

    // ---------- Movimiento (paso fijo) ----------

    actualizar(paso) {
        this.tiempoJuego += paso;
        this.planificador.avanzar(paso);
        const limite = (this.alto - ALTO_PASTO_PX) / this.alto;

        for (const p of this.palabras) {
            if (p.estado === 'activa' || p.estado === 'incorrecta') {
                p.y += p.velocidad;
                if (p.y < limite) continue;
                // Llegó al pasto. Si era la correcta y nadie la atrapó, se escapó (se explica, no se castiga)
                if (p.estado === 'activa' && p.texto === this.partida.pregunta.textoRespuesta && this.fase === 'jugando') this.alEscaparse();
                if (p.estado !== 'saliendo') { p.estado = 'saliendo'; this.marcar(p, 'palabra--saliendo'); }
            } else if (p.estado === 'saliendo') {
                p.y += p.velocidad * 0.5; // sigue cayendo despacio mientras se desvanece
            }
        }
    }

    dibujar() {
        for (const p of this.palabras) {
            p.boton.style.transform = `translate(-50%, ${Math.round(p.y * this.alto)}px)`;
        }
    }
}
