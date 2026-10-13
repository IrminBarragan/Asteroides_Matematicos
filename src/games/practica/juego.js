/**
 * Juego de práctica (DEMOSTRACIÓN del portal).
 *
 * Es un cuestionario de sumas y restas de opción múltiple. Existe para que el portal pueda probarse
 * de principio a fin (perfil → juego → resultados → estrellas) con un juego que usa el contrato,
 * el motor adaptativo y el guardado de habilidades. Es temporal: se reemplaza cuando se migre Asteroides (Fase 3).
 *
 * Reglas pensadas para niños: un error NO penaliza el avance; se muestra una pista y se puede reintentar.
 * Cada pregunta cuenta como acierto solo si se responde bien al primer intento.
 */
import { Juego } from '../../core/juego.js';
import { MotorAdaptativo } from '../../adaptativo/motor.js';
import { h, vaciar } from '../../ui/dom.js';
import { generarPregunta, HABILIDADES, PREGUNTAS_POR_PARTIDA } from './logica.js';

const RETARDO_SIGUIENTE_MS = 1100;

export class JuegoPractica extends Juego {
    static meta = {
        id: 'practica',
        nombre: 'Práctica de Sumas y Restas',
        descripcion: 'Responde 10 preguntas. Si te equivocas, ¡hay una pista y otra oportunidad!',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    constructor(dependencias) {
        super(dependencias);
        this.motor = new MotorAdaptativo(HABILIDADES);
        this.numero = 0;           // pregunta actual (1..N)
        this.aciertos = 0;
        this.fallos = 0;
        this.pregunta = null;
        this.huboError = false;    // ¿ya se equivocó en esta pregunta?
        this.inicioPregunta = 0;
        this.tiempoAcumulado = 0;
        this.inicioTramo = 0;
        this.temporizador = null;
        this.accionPendiente = null;
    }

    alMontar(contenedor, contexto) {
        if (contexto.habilidades) this.motor.importar(contexto.habilidades);
        this.grado = contexto.grado || 1;
        this.audio = contexto.audio;
        this.raiz = h('section', { class: 'practica', 'aria-label': 'Juego de práctica' });
        contenedor.append(this.raiz);
        this.inicioTramo = Date.now();
        this.siguientePregunta();
    }

    alPausar() {
        this.tiempoAcumulado += Date.now() - this.inicioTramo;
    }

    alReanudar() {
        this.inicioTramo = Date.now();
        if (this.accionPendiente) { // algo se iba a ejecutar mientras estaba en pausa
            const accion = this.accionPendiente;
            this.accionPendiente = null;
            accion();
        }
    }

    alDestruir() {
        clearTimeout(this.temporizador);
        this.accionPendiente = null;
        if (this.raiz) this.raiz.remove();
    }

    /** Ejecuta `accion` tras `ms`; si el juego está en pausa en ese momento, espera a reanudar. */
    programar(ms, accion) {
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => {
            if (this.estado === 'jugando') accion();
            else if (this.estado === 'pausado') this.accionPendiente = accion;
        }, ms);
    }

    siguientePregunta() {
        if (this.numero >= PREGUNTAS_POR_PARTIDA) return this.terminar();
        this.numero++;
        this.huboError = false;
        const habilidad = this.motor.elegirHabilidad();
        this.pregunta = generarPregunta({ grado: this.grado, habilidad, nivel: this.motor.nivel(habilidad) });
        this.inicioPregunta = Date.now();
        this.dibujarPregunta();
    }

    dibujarPregunta() {
        const { enunciado, opciones } = this.pregunta;
        this.mensaje = h('p', { class: 'practica__mensaje', 'aria-live': 'polite' }, 'Elige la respuesta correcta');
        this.botones = opciones.map((valor) => h('button', {
            class: 'practica__opcion', type: 'button', 'data-valor': valor,
            onClick: (e) => this.responder(valor, e.currentTarget)
        }, String(valor)));

        vaciar(this.raiz);
        this.raiz.append(
            h('p', { class: 'practica__progreso' }, `Pregunta ${this.numero} de ${PREGUNTAS_POR_PARTIDA}`),
            h('div', {
                class: 'barra', role: 'progressbar', 'aria-valuemin': 0,
                'aria-valuemax': PREGUNTAS_POR_PARTIDA, 'aria-valuenow': this.numero - 1, 'aria-label': 'Progreso'
            }, h('div', { class: 'barra__relleno', style: `width:${((this.numero - 1) / PREGUNTAS_POR_PARTIDA) * 100}%` })),
            h('p', { class: 'practica__enunciado' }, `${enunciado} = ?`),
            h('div', { class: 'practica__opciones' }, this.botones),
            this.mensaje
        );
    }

    responder(valor, boton) {
        if (this.estado !== 'jugando' || boton.disabled) return;
        const correcta = valor === this.pregunta.respuesta;
        const tiempo = Date.now() - this.inicioPregunta;

        if (correcta) {
            if (!this.huboError) {
                this.aciertos++;
                this.motor.registrar(this.pregunta.habilidad, true, tiempo);
            }
            boton.classList.add('practica__opcion--correcta');
            this.botones.forEach((b) => { b.disabled = true; });
            this.mensaje.textContent = this.huboError ? '¡Muy bien, lo lograste!' : '¡Correcto!';
            if (this.audio) this.audio.reproducirEfecto('acierto');
            this.programar(RETARDO_SIGUIENTE_MS, () => this.siguientePregunta());
        } else {
            if (!this.huboError) { // solo el primer error de la pregunta cuenta
                this.huboError = true;
                this.fallos++;
                this.motor.registrar(this.pregunta.habilidad, false, tiempo);
            }
            boton.disabled = true;
            boton.classList.add('practica__opcion--incorrecta');
            this.mensaje.textContent = `Casi. Pista: ${this.pregunta.pista}`;
            if (this.audio) this.audio.reproducirEfecto('fallo');
        }
    }

    terminar() {
        const tiempoMs = this.tiempoAcumulado + (Date.now() - this.inicioTramo);
        this.finalizar({
            aciertos: this.aciertos,
            fallos: this.fallos,
            tiempoMs,
            habilidades: this.motor.exportar()
        });
    }
}
