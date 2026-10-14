/**
 * Esqueleto de los juegos de preguntas CON MATERIAL para manipular (Taller de Cálculo, Bloques de Valor, Cajas y Reparto).
 *
 * Qué comparten: una pregunta con opciones numéricas, un material (fichas, recta, bloques, cajas…) cuya ayuda se retira
 * sola (ver core/apoyo.js), sin cronómetro ni vidas, con pista al equivocarse y «Ver cómo se hace».
 *   completo → hay que usar el material para llegar a la respuesta; las opciones aparecen al terminar
 *              (o se responde con «Listo» si el material mismo da la respuesta, como la recta)
 *   ligero   → el material está cerrado pero a un botón, y las opciones ya se ven
 *   ninguno  → solo la pregunta y las opciones
 *
 * Qué aporta cada juego (todo lo demás está aquí):
 *   static meta, admiteColocacion, TITULO, ETIQUETAS_APOYO, NOMBRES_HABILIDAD, TEXTO_ABRIR
 *   crearPartida(contexto)                     → la `Partida` del juego
 *   crearMaterial(pregunta, avisar)            → null | { componente, consigna, manipula, terminado?, respuesta?, detalleFallo?, abrir? }
 *        `componente` tiene `.elemento` y `.desactivar()`; debe llamar a `avisar()` cada vez que el niño lo cambia.
 *        `manipula` (false = solo se mira, como los bloques que se leen); `terminado()` dice si ya hizo lo pedido;
 *        si trae `respuesta()`, en «completo» se muestra un botón «Listo» que responde con ese número.
 */
import { Juego } from '../core/juego.js';
import { BucleJuego } from '../core/bucle.js';
import { Planificador } from '../core/planificador.js';
import { APOYOS } from '../core/apoyo.js';
import { elegir } from '../core/aleatorio.js';
import { tiempoDeLectura } from '../core/lectura.js';
import { h, vaciar } from './dom.js';
import { crearBotonEnsenar, pedirLeccion, presentarIntro } from './ensenanza.js';
import { PREGUNTAS_POR_PARTIDA } from '../core/partidaPreguntas.js';

const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];
const C = 'juego-material';

export class JuegoConMaterial extends Juego {
    static admiteColocacion = true;
    static TITULO = 'Juego';
    static ETIQUETAS_APOYO = { completo: 'Con material', ligero: 'Material opcional', ninguno: 'Sin ayuda' };
    static NOMBRES_HABILIDAD = {};
    static TEXTO_ABRIR = 'Usar el material';
    static TEXTO_PRIMERA = 'Usa el material para encontrar la respuesta.';
    static TEXTO_TERMINADO = '¡Muy bien! Ahora elige la respuesta.';

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.fase = 'jugando';       // jugando | transicion
        this.material = null;        // lo que devolvió crearMaterial para la pregunta actual
        this.tareaSiguiente = null;
    }

    // ---------- Para los juegos concretos ----------

    crearPartida() { throw new Error('crearPartida no implementado'); }

    crearMaterial() { return null; }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.audio = contexto.audio;
        this.partida = this.crearPartida(contexto);
        this.construirInterfaz(contenedor);
        this.bucle = new BucleJuego({
            actualizar: (paso) => { this.tiempoJuego += paso; this.planificador.avanzar(paso); },
            dibujar: () => {}
        });
        this.empezarPregunta();
        this.bucle.iniciar();
    }

    alPausar() { this.bucle.detener(); }

    alReanudar() { this.bucle.iniciar(); }

    alDestruir() {
        if (this.bucle) this.bucle.detener();
        this.planificador.limpiar();
        if (this.material) this.material.componente.desactivar();
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz ----------

    construirInterfaz(contenedor) {
        this.textoProgreso = h('span', { class: `${C}__dato` });
        this.textoPuntos = h('span', { class: `${C}__dato` });
        this.textoRacha = h('span', { class: `${C}__dato` });
        this.textoApoyo = h('span', { class: `${C}__dato ${C}__dato--apoyo` });
        this.barra = h('div', { class: `${C}__barra`, role: 'presentation', 'aria-hidden': 'true' });
        this.textoEnunciado = h('p', { class: `${C}__enunciado`, 'aria-live': 'polite', 'data-leer': true });
        this.textoConsigna = h('p', { class: `${C}__consigna`, 'aria-live': 'polite' });
        this.zonaMaterial = h('div', { class: `${C}__material` });
        this.zonaAcciones = h('div', { class: `${C}__acciones` });
        this.textoMensaje = h('p', { class: `${C}__mensaje`, 'aria-live': 'polite' });
        this.botonEnsenar = crearBotonEnsenar(() => pedirLeccion(this));
        this.botonSiguiente = h('button', { class: 'boton boton--secundario', type: 'button', hidden: true, onClick: () => this.irASiguiente() }, 'Siguiente ➜');
        this.raiz = h('section', { class: C, 'aria-label': this.constructor.TITULO },
            h('div', { class: `${C}__hud` }, this.textoProgreso, this.textoPuntos, this.textoRacha, this.textoApoyo),
            this.barra, this.textoEnunciado, this.textoConsigna, this.zonaMaterial, this.zonaAcciones,
            h('div', { class: `${C}__pie` }, this.textoMensaje, this.botonEnsenar, this.botonSiguiente));
        contenedor.append(this.raiz);
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `${C}__mensaje ${tipo ? `${C}__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
        const resueltas = p.numero - (p.resuelta ? 0 : 1);
        vaciar(this.barra);
        for (let i = 0; i < p.total; i++) this.barra.append(h('span', { class: `${C}__ficha${i < resueltas ? ` ${C}__ficha--lista` : ''}` }));
    }

    // ---------- Reglas en acción ----------

    empezarPregunta() {
        const info = this.partida.iniciarPregunta(this.tiempoJuego);
        if (!info) return this.terminar();

        const { pregunta } = info;
        this.fase = 'jugando';
        this.botonSiguiente.hidden = true;
        this.botonEnsenar.hidden = true;
        if (this.material) { this.material.componente.desactivar(); this.material = null; }
        this.terminadoElMaterial = false;
        this.botonListo = null;
        vaciar(this.zonaMaterial);
        vaciar(this.zonaAcciones);
        this.textoEnunciado.textContent = pregunta.enunciado;
        this.textoConsigna.textContent = '';
        this.textoConsigna.hidden = false;
        this.textoApoyo.textContent = this.partida.colocacion ? '' : this.constructor.ETIQUETAS_APOYO[pregunta.apoyo];

        this.botonesActuales = this.crearOpciones(pregunta);
        this.material = pregunta.material ? this.crearMaterial(pregunta, () => this.materialCambio(pregunta)) : null;
        const obligatorio = Boolean(this.material && this.material.manipula && pregunta.apoyo === 'completo');
        if (this.material) this.montarMaterial(pregunta, obligatorio);
        if (!obligatorio) this.zonaAcciones.append(...this.botonesActuales);

        presentarIntro(this, pregunta.habilidad);
        this.mensaje(this.partida.numero === 1 ? (obligatorio ? this.constructor.TEXTO_PRIMERA : 'Elige la respuesta correcta.') : '');
        this.actualizarHud();
    }

    crearOpciones(pregunta) {
        return pregunta.opciones.map((opcion) => h('button', {
            class: `${C}__opcion`, type: 'button', 'aria-label': opcion.texto,
            onClick: (e) => this.elegirOpcion(opcion, e.currentTarget)
        }, opcion.texto));
    }

    montarMaterial(pregunta, obligatorio) {
        const { componente, consigna, manipula } = this.material;
        this.textoConsigna.textContent = consigna || '';
        if (obligatorio && this.material.respuesta) {
            // El material mismo da la respuesta (la recta): se responde con «Listo»
            this.botonListo = h('button', { class: 'boton boton--primario', type: 'button', onClick: () => this.comprobarMaterial() }, 'Listo');
            this.zonaAcciones.append(this.botonListo);
        }
        if (pregunta.apoyo === 'ligero' && manipula) {
            // Material a la mano pero cerrado: abrirlo es decisión del niño
            componente.elemento.hidden = true;
            this.textoConsigna.hidden = true;
            const alternar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', 'aria-expanded': 'false' }, this.material.abrir || this.constructor.TEXTO_ABRIR);
            alternar.addEventListener('click', () => {
                const abrir = componente.elemento.hidden;
                componente.elemento.hidden = !abrir;
                this.textoConsigna.hidden = !abrir;
                alternar.setAttribute('aria-expanded', String(abrir));
            });
            this.zonaMaterial.append(alternar);
        }
        this.zonaMaterial.append(componente.elemento);
    }

    /** El niño cambió el material: si ya hizo lo pedido, aparecen las opciones. */
    materialCambio(pregunta) {
        const m = this.material;
        if (!m || pregunta.apoyo !== 'completo' || !m.manipula || !m.terminado || this.terminadoElMaterial) return;
        if (m.terminado()) {
            this.terminadoElMaterial = true;
            this.revelarOpciones(m.mensajeTerminado || this.constructor.TEXTO_TERMINADO);
        }
    }

    comprobarMaterial() {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || !this.material || !this.material.respuesta) return;
        const valor = this.material.respuesta();
        this.resolver(valor, null, this.material.detalleFallo ? this.material.detalleFallo(valor) : '');
    }

    revelarOpciones(texto) {
        if (this.zonaAcciones.contains(this.botonesActuales[0])) return;
        this.zonaAcciones.append(...this.botonesActuales);
        this.mensaje(texto);
    }

    elegirOpcion(opcion, boton) {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || boton.getAttribute('aria-disabled') === 'true') return;
        this.resolver(opcion.id, boton);
    }

    /** Responde con `id` (el número elegido o el que dio el material) y muestra el resultado. */
    resolver(id, boton, detalle = '') {
        const antes = this.partida.pregunta.apoyo;
        const r = this.partida.responder(id, { ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;

        if (r.tipo === 'correcta') {
            if (boton) boton.classList.add(`${C}__opcion--correcta`);
            this.botonesActuales.forEach((b) => b.setAttribute('aria-disabled', 'true'));
            if (this.material) this.material.componente.desactivar();
            if (this.botonListo) this.botonListo.disabled = true;
            this.mostrarOpcionesSinMarcar();
            const elogio = r.primerIntento ? elegir(this.aleatorio, ELOGIOS) : '¡Lo lograste!';
            let texto = `${elogio} +${r.puntos} puntos. ${r.explicacion}`;
            if (r.cambioNivel === 'subio') texto += ` ¡Subiste de nivel en ${this.constructor.NOMBRES_HABILIDAD[r.habilidad]}!`;
            else if (r.primerIntento && !this.partida.colocacion && APOYOS.indexOf(this.partida.apoyoDe(r.habilidad)) > APOYOS.indexOf(antes)) {
                texto += ' ¡Ya necesitas menos ayuda!';
            }
            this.mensaje(texto, 'bien');
            this.audio.reproducirEfecto('acierto');
            this.fase = 'transicion';
            this.botonEnsenar.hidden = true;
            this.botonSiguiente.hidden = false;
            this.tareaSiguiente = this.planificador.programar(tiempoDeLectura(texto), () => this.irASiguiente());
        } else {
            if (boton) {
                boton.classList.add(`${C}__opcion--incorrecta`);
                boton.setAttribute('aria-disabled', 'true');
            }
            this.mensaje(`Casi. ${detalle}Pista: ${r.pista}`, 'pista');
            this.botonEnsenar.hidden = false;
            this.audio.reproducirEfecto('fallo');
        }
        this.actualizarHud();
    }

    /** Al acertar con el material (sin pasar por las opciones) se muestran igual, para que se vea cuál era la respuesta. */
    mostrarOpcionesSinMarcar() {
        if (this.zonaAcciones.contains(this.botonesActuales[0])) return;
        this.zonaAcciones.append(...this.botonesActuales);
        const correcta = this.botonesActuales.find((b) => b.getAttribute('aria-label') === this.partida.pregunta.opciones.find((o) => o.id === this.partida.pregunta.respuesta).texto);
        if (correcta) correcta.classList.add(`${C}__opcion--correcta`);
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
}
