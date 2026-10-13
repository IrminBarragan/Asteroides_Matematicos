/**
 * Memorama de Palabras — juego del portal (contrato `Juego`), basado en DOM (no en canvas).
 *
 * Qué ve el niño: cartas boca abajo; voltea dos por turno y debe juntar las parejas (dibujo y palabra, sílabas,
 * rimas, sinónimos, antónimos según su grado). Al encontrar una pareja se le explica POR QUÉ van juntas.
 *
 * Capas: logica/ (contenido, tableros, reglas) ⟵ este archivo (DOM, entrada y tiempos).
 * Los tiempos (cuánto se ve un fallo, la pausa entre tableros) usan el Planificador sobre el BucleJuego:
 * si el juego se pausa, esas esperas también se pausan.
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego } from '../../core/bucle.js';
import { Planificador } from '../../core/planificador.js';
import { h, vaciar } from '../../ui/dom.js';
import { ilustracion } from '../../ui/ilustraciones.js';
import { Partida } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';

const MS_VER_FALLO = 1400;      // tiempo para ver las dos cartas del fallo antes de ocultarlas
const MS_ENTRE_TABLEROS = 2200; // tiempo para leer la felicitación antes del siguiente tablero

/** Texto accesible de una carta ya descubierta. */
export function describirContenido(contenido) {
    switch (contenido.tipo) {
        case 'imagen': return `dibujo de ${contenido.texto}`;
        case 'silaba': return `sílaba ${contenido.texto}`;
        case 'numero': return `${contenido.texto} ${contenido.texto === '1' ? 'sílaba' : 'sílabas'}`;
        default: return contenido.texto;
    }
}

function clasePorLargo(texto) {
    if (texto.length >= 10) return 'carta__texto carta__texto--muy-largo';
    if (texto.length >= 8) return 'carta__texto carta__texto--largo';
    return 'carta__texto';
}

function dibujarContenido(contenido) {
    switch (contenido.tipo) {
        case 'imagen': return ilustracion(contenido.imagen, 'carta__imagen');
        case 'numero': return [
            h('span', { class: 'carta__numero' }, contenido.texto),
            h('span', { class: 'carta__etiqueta' }, contenido.texto === '1' ? 'sílaba' : 'sílabas')
        ];
        case 'silaba': return h('span', { class: 'carta__texto carta__texto--silaba' }, contenido.texto);
        default: return h('span', { class: clasePorLargo(contenido.texto) }, contenido.texto);
    }
}

export class JuegoMemorama extends Juego {
    static meta = {
        id: 'memorama',
        nombre: 'Memorama de Palabras',
        descripcion: 'Encuentra las parejas: dibujos y palabras, sílabas, rimas, sinónimos y antónimos.',
        area: 'espanol',
        grados: [1, 2, 3]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.ocupado = false;   // true entre un tablero y el siguiente
        this.nodos = new Map(); // id de carta → { boton, carta, indice }
    }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.audio = contexto.audio;
        this.partida = new Partida({
            grado: contexto.grado || 1,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio
        });
        this.construirInterfaz(contenedor);

        // El bucle solo sirve de reloj: pausarlo congela el planificador (y con él todas las esperas)
        this.bucle = new BucleJuego({
            actualizar: (paso) => { this.tiempoJuego += paso; this.planificador.avanzar(paso); },
            dibujar: () => {}
        });
        this.siguienteTablero();
        this.bucle.iniciar();
    }

    alPausar() { this.bucle.detener(); }

    alReanudar() { this.bucle.iniciar(); }

    alDestruir() {
        if (this.bucle) this.bucle.detener();
        this.planificador.limpiar();
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz ----------

    construirInterfaz(contenedor) {
        this.textoTablero = h('span', { class: 'memorama__dato' });
        this.textoParejas = h('span', { class: 'memorama__dato' });
        this.textoPuntos = h('span', { class: 'memorama__dato' });
        this.textoInstruccion = h('p', { class: 'memorama__instruccion', 'aria-live': 'polite' });
        this.zonaTablero = h('div', { class: 'memorama__tablero', role: 'group', 'aria-label': 'Cartas del memorama' });
        this.textoMensaje = h('p', { class: 'memorama__mensaje', 'aria-live': 'polite' });
        this.raiz = h('section', { class: 'memorama', 'aria-label': 'Memorama de Palabras' },
            h('div', { class: 'memorama__hud' }, this.textoTablero, this.textoParejas, this.textoPuntos),
            this.textoInstruccion, this.zonaTablero, this.textoMensaje);
        contenedor.append(this.raiz);
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `memorama__mensaje ${tipo ? `memorama__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoTablero.textContent = `Tablero ${p.numero} de ${p.total}`;
        this.textoParejas.textContent = `Parejas: ${p.tablero.parejasEncontradas} de ${p.tablero.totalParejas}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
    }

    construirCartas(datos) {
        vaciar(this.zonaTablero);
        this.nodos.clear();
        this.zonaTablero.style.setProperty('--columnas', datos.columnas);
        datos.cartas.forEach((carta, indice) => {
            const boton = h('button', {
                class: 'carta', type: 'button', 'data-estado': 'oculta', 'data-tipo': carta.contenido.tipo,
                onClick: () => this.voltearCarta(carta.id)
            },
            h('span', { class: 'carta__interior' },
                h('span', { class: 'carta__cara carta__cara--trasera', 'aria-hidden': 'true' }, '?'),
                h('span', { class: 'carta__cara carta__cara--frontal', 'aria-hidden': 'true' }, dibujarContenido(carta.contenido))));
            this.nodos.set(carta.id, { boton, carta, indice });
            this.zonaTablero.append(boton);
            this.pintarCarta(carta.id);
        });
    }

    /** Sincroniza el botón de una carta con su estado en el modelo (sin recrear el nodo: conserva el foco). */
    pintarCarta(id) {
        const { boton, carta, indice } = this.nodos.get(id);
        const estado = this.partida.tablero.porId.get(id).estado;
        boton.dataset.estado = estado;
        boton.setAttribute('aria-disabled', estado === 'encontrada' ? 'true' : 'false');
        const numero = `Carta ${indice + 1}`;
        if (estado === 'oculta') boton.setAttribute('aria-label', `${numero}, boca abajo`);
        else if (estado === 'visible') boton.setAttribute('aria-label', `${numero}: ${describirContenido(carta.contenido)}`);
        else boton.setAttribute('aria-label', `${numero}, pareja encontrada: ${describirContenido(carta.contenido)}`);
    }

    // ---------- Reglas en acción ----------

    siguienteTablero() {
        const datos = this.partida.iniciarTablero(this.tiempoJuego);
        if (!datos) return this.terminar();
        this.ocupado = false;
        this.textoInstruccion.textContent = datos.instruccion;
        this.construirCartas(datos);
        this.actualizarHud();
        this.mensaje(this.partida.numero === 1 ? 'Voltea dos cartas para empezar.' : '');
        const primera = this.zonaTablero.querySelector('button');
        if (primera) primera.focus({ preventScroll: true });
    }

    voltearCarta(id) {
        if (this.estado !== 'jugando' || this.ocupado) return;
        const evento = this.partida.tablero.voltear(id);
        if (evento.tipo === 'ignorada') return;

        this.pintarCarta(id);
        if (evento.tipo === 'primera') {
            this.audio.reproducirEfecto('voltear');
            this.mensaje('');
            return;
        }

        const resultado = this.partida.procesar(evento, this.tiempoJuego);
        evento.cartas.forEach((c) => this.pintarCarta(c.id));
        if (evento.tipo === 'pareja') this.alEncontrarPareja(resultado);
        else this.alFallar(evento);
        this.actualizarHud();
    }

    alEncontrarPareja(resultado) {
        this.audio.reproducirEfecto('acierto');
        let texto = `¡Pareja! ${resultado.pareja.explicacion}`;
        if (resultado.cambioNivel === 'subio') {
            texto += ` ¡Subiste de nivel en ${NOMBRES_HABILIDAD[this.partida.datos.habilidad]}!`;
        }
        if (resultado.tableroCompleto) {
            this.ocupado = true;
            if (resultado.bonus > 0) texto += ` ¡Tablero sin errores! +${resultado.bonus} puntos.`;
            else texto += ' ¡Tablero completo!';
            this.planificador.programar(MS_ENTRE_TABLEROS, () => this.siguienteTablero());
        }
        this.mensaje(texto, 'bien');
    }

    alFallar(evento) {
        this.ocupado = true; // mientras se ve el fallo no se aceptan más cartas
        if (evento.evitable) {
            this.audio.reproducirEfecto('fallo');
            this.mensaje('Casi. ¡Ya habías visto la pareja de la primera carta! Recuerda dónde estaba.', 'pista');
        } else {
            this.audio.reproducirEfecto('voltear');
            this.mensaje('No son pareja. ¡Fíjate bien dónde están para encontrarlas después!', 'info');
        }
        this.planificador.programar(MS_VER_FALLO, () => {
            const cartas = this.partida.tablero.ocultarFallo();
            cartas.forEach((c) => this.pintarCarta(c.id));
            this.ocupado = false;
        });
    }

    terminar() {
        this.bucle.detener();
        this.finalizar(this.partida.resultado(this.tiempoJuego)); // siempre lo ÚLTIMO que hace el juego
    }
}
