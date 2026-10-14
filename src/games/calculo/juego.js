/**
 * Taller de Cálculo — juego del portal (contrato `Juego`), basado en DOM.
 *
 * Sumas, restas y problemas con MATERIAL para manipular: marcos de diez (1.º–2.º) y recta de saltos (3.º–6.º).
 * La ayuda se retira sola (ver logica/apoyo.js):
 *   completo → hay que usar el material para llegar a la respuesta (las opciones aparecen al terminar)
 *   ligero   → el material se puede abrir si se quiere; las opciones ya están a la vista
 *   ninguno  → solo la operación y las opciones
 * Sin cronómetro ni vidas: equivocarse da una pista y se puede reintentar.
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego } from '../../core/bucle.js';
import { Planificador } from '../../core/planificador.js';
import { EstadoMarcos, EstadoRecta } from '../../core/material.js';
import { elegir } from '../../core/aleatorio.js';
import { tiempoDeLectura } from '../../core/lectura.js';
import { h, vaciar } from '../../ui/dom.js';
import { crearBotonEnsenar, pedirLeccion, presentarIntro } from '../../ui/ensenanza.js';
import { MarcosDiez } from '../../ui/marcosDiez.js';
import { RectaInteractiva } from '../../ui/rectaInteractiva.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';
import { APOYOS } from './logica/apoyo.js';

const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];
const ETIQUETA_APOYO = { completo: 'Con material', ligero: 'Material opcional', ninguno: 'Sin ayuda' };

export class JuegoCalculo extends Juego {
    /** El portal le hace al niño la misión de inicio antes de la primera partida (ver adaptativo/colocacion.js). */
    static admiteColocacion = true;

    static meta = {
        id: 'taller-calculo',
        nombre: 'Taller de Cálculo',
        descripcion: 'Suma y resta con fichas y saltos en la recta. Al principio te ayudamos; cuando ya puedes, lo haces tú.',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.fase = 'jugando';       // jugando | transicion
        this.material = null;        // MarcosDiez | RectaInteractiva de la pregunta actual
        this.tareaSiguiente = null;
    }

    // ---------- Ciclo de vida ----------

    alMontar(contenedor, contexto) {
        this.audio = contexto.audio;
        this.partida = new Partida({
            grado: contexto.grado || 1,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio,
            colocacion: contexto.colocacion
        });
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
        if (this.material) this.material.desactivar();
        if (this.raiz) this.raiz.remove();
    }

    // ---------- Interfaz ----------

    construirInterfaz(contenedor) {
        this.textoProgreso = h('span', { class: 'calculo-juego__dato' });
        this.textoPuntos = h('span', { class: 'calculo-juego__dato' });
        this.textoRacha = h('span', { class: 'calculo-juego__dato' });
        this.textoApoyo = h('span', { class: 'calculo-juego__dato calculo-juego__dato--apoyo' });
        this.barra = h('div', { class: 'calculo-juego__barra', role: 'presentation', 'aria-hidden': 'true' });
        this.textoEnunciado = h('p', { class: 'calculo-juego__enunciado', 'aria-live': 'polite', 'data-leer': true });
        this.textoConsigna = h('p', { class: 'calculo-juego__consigna', 'aria-live': 'polite' });
        this.zonaMaterial = h('div', { class: 'calculo-juego__material' });
        this.zonaAcciones = h('div', { class: 'calculo-juego__acciones' });
        this.textoMensaje = h('p', { class: 'calculo-juego__mensaje', 'aria-live': 'polite' });
        this.botonEnsenar = crearBotonEnsenar(() => pedirLeccion(this));
        this.botonSiguiente = h('button', { class: 'boton boton--secundario', type: 'button', hidden: true, onClick: () => this.irASiguiente() }, 'Siguiente ➜');
        this.raiz = h('section', { class: 'calculo-juego', 'aria-label': 'Taller de Cálculo' },
            h('div', { class: 'calculo-juego__hud' }, this.textoProgreso, this.textoPuntos, this.textoRacha, this.textoApoyo),
            this.barra, this.textoEnunciado, this.textoConsigna, this.zonaMaterial, this.zonaAcciones,
            h('div', { class: 'calculo-juego__pie' }, this.textoMensaje, this.botonEnsenar, this.botonSiguiente));
        contenedor.append(this.raiz);
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `calculo-juego__mensaje ${tipo ? `calculo-juego__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
        const resueltas = p.numero - (p.resuelta ? 0 : 1);
        vaciar(this.barra);
        for (let i = 0; i < p.total; i++) {
            this.barra.append(h('span', { class: `calculo-juego__ficha${i < resueltas ? ' calculo-juego__ficha--lista' : ''}` }));
        }
    }

    // ---------- Reglas en acción ----------

    empezarPregunta() {
        const info = this.partida.iniciarPregunta(this.tiempoJuego);
        if (!info) return this.terminar();

        const { pregunta } = info;
        this.fase = 'jugando';
        this.botonSiguiente.hidden = true;
        this.botonEnsenar.hidden = true;
        if (this.material) { this.material.desactivar(); this.material = null; }
        this.botonesActuales = null;
        this.botonListo = null;
        vaciar(this.zonaMaterial);
        vaciar(this.zonaAcciones);
        this.textoEnunciado.textContent = pregunta.enunciado;
        this.textoConsigna.textContent = '';
        this.textoApoyo.textContent = this.partida.colocacion ? '' : ETIQUETA_APOYO[pregunta.apoyo];

        this.botonesActuales = this.crearOpciones(pregunta);
        const obligatorio = pregunta.material && pregunta.apoyo === 'completo';
        if (pregunta.material) this.montarMaterial(pregunta);
        if (!obligatorio) this.zonaAcciones.append(...this.botonesActuales);

        presentarIntro(this, pregunta.habilidad);
        this.mensaje(this.partida.numero === 1 ? (obligatorio ? 'Usa el material para encontrar la respuesta.' : 'Elige la respuesta correcta.') : '');
        this.actualizarHud();
    }

    crearOpciones(pregunta) {
        return pregunta.opciones.map((opcion) => h('button', {
            class: 'calculo-juego__opcion', type: 'button', 'aria-label': opcion.texto,
            onClick: (e) => this.elegirOpcion(opcion, e.currentTarget)
        }, opcion.texto));
    }

    montarMaterial(pregunta) {
        const { material } = pregunta;
        const esSuma = material.operacion === 'suma';
        if (material.tipo === 'marcos') {
            const estado = new EstadoMarcos({ capacidad: material.capacidad, llenas: esSuma ? 0 : material.a });
            this.material = new MarcosDiez({
                estado, modo: esSuma ? 'colocar' : 'quitar',
                alCambiar: (c) => { if (pregunta.apoyo === 'completo' && this.marcosTerminados(material, c)) this.revelarOpciones('¡Muy bien! Ahora cuenta y elige cuántas fichas hay.'); }
            });
            this.textoConsigna.textContent = esSuma
                ? `Pon ${material.a} fichas azules y ${material.b} fichas naranjas.`
                : `Hay ${material.a} fichas. Tacha ${material.b}: son las que quitas.`;
        } else {
            const estado = new EstadoRecta({ desde: material.desde, saltos: material.saltos, maximo: material.maximo });
            this.material = new RectaInteractiva({ estado });
            this.textoConsigna.textContent = esSuma
                ? `Empiezas en ${material.a}. Avanza ${material.b} con saltos.`
                : `Empiezas en ${material.a}. Retrocede ${material.b} con saltos.`;
            if (pregunta.apoyo === 'completo') {
                this.botonListo = h('button', { class: 'boton boton--primario', type: 'button', onClick: () => this.comprobarRecta() }, 'Listo');
                this.zonaAcciones.append(this.botonListo);
            }
        }
        if (pregunta.apoyo === 'ligero') {
            // Material a la mano pero cerrado: abrirlo es decisión del niño
            this.material.elemento.hidden = true;
            this.textoConsigna.hidden = true;
            const alternar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', 'aria-expanded': 'false' },
                material.tipo === 'marcos' ? 'Usar fichas' : 'Usar la recta');
            alternar.addEventListener('click', () => {
                const abrir = this.material.elemento.hidden;
                this.material.elemento.hidden = !abrir;
                this.textoConsigna.hidden = !abrir;
                alternar.setAttribute('aria-expanded', String(abrir));
            });
            this.zonaMaterial.append(alternar);
        }
        this.zonaMaterial.append(this.material.elemento);
    }

    marcosTerminados(material, conteo) {
        return material.operacion === 'suma'
            ? conteo.a === material.a && conteo.b === material.b
            : conteo.tachadas === material.b;
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

    comprobarRecta() {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || !this.material || !this.botonListo) return;
        this.resolver(this.material.estado.posicion, null, this.material.estado.posicion);
    }

    /** Responde con `id` (el número elegido o al que llegó la recta) y muestra el resultado. */
    resolver(id, boton, llegaste = null) {
        const antes = this.partida.pregunta.apoyo;
        const r = this.partida.responder(id, { ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;

        if (r.tipo === 'correcta') {
            if (boton) boton.classList.add('calculo-juego__opcion--correcta');
            this.botonesActuales.forEach((b) => b.setAttribute('aria-disabled', 'true'));
            if (this.material) this.material.desactivar();
            if (this.botonListo) this.botonListo.disabled = true;
            this.revelarSinMarcar();
            const elogio = r.primerIntento ? elegir(this.aleatorio, ELOGIOS) : '¡Lo lograste!';
            let texto = `${elogio} +${r.puntos} puntos. ${r.explicacion}`;
            if (r.cambioNivel === 'subio') texto += ` ¡Subiste de nivel en ${NOMBRES_HABILIDAD[r.habilidad]}!`;
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
                boton.classList.add('calculo-juego__opcion--incorrecta');
                boton.setAttribute('aria-disabled', 'true');
            }
            const donde = llegaste === null ? '' : `Llegaste a ${llegaste}. `;
            this.mensaje(`Casi. ${donde}Pista: ${r.pista}`, 'pista');
            this.botonEnsenar.hidden = false;
            this.audio.reproducirEfecto('fallo');
        }
        this.actualizarHud();
    }

    /** Al acertar con la recta (sin pasar por las opciones) se muestran igual, para que se vea cuál era la respuesta. */
    revelarSinMarcar() {
        if (!this.zonaAcciones.contains(this.botonesActuales[0])) {
            this.zonaAcciones.append(...this.botonesActuales);
            const correcta = this.botonesActuales.find((b) => Number(b.getAttribute('aria-label')) === this.partida.pregunta.respuesta);
            if (correcta) correcta.classList.add('calculo-juego__opcion--correcta');
        }
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
