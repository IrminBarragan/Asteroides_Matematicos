/**
 * Bloques de Valor — juego del portal (contrato `Juego`), basado en DOM.
 *
 * Valor posicional y llevadas con BLOQUES: se leen y se arman números por columnas, y las sumas y restas se hacen
 * cambiando «10 por 1» (llevada) y «1 por 10» (préstamo). La ayuda se retira sola (ver core/apoyo.js):
 *   completo → hay que usar los bloques para llegar a la respuesta (las opciones aparecen al terminar)
 *   ligero   → los bloques se pueden abrir si se quiere; las opciones ya están a la vista
 *   ninguno  → solo la operación y las opciones
 * Al LEER un número los bloques son la pregunta misma, así que siempre se ven.
 * Sin cronómetro ni vidas: equivocarse da una pista y se puede reintentar.
 */
import { Juego } from '../../core/juego.js';
import { BucleJuego } from '../../core/bucle.js';
import { Planificador } from '../../core/planificador.js';
import { EstadoBloques } from '../../core/material.js';
import { APOYOS } from '../../core/apoyo.js';
import { elegir } from '../../core/aleatorio.js';
import { tiempoDeLectura } from '../../core/lectura.js';
import { h, vaciar } from '../../ui/dom.js';
import { crearBotonEnsenar, pedirLeccion, presentarIntro } from '../../ui/ensenanza.js';
import { BloquesValor } from '../../ui/bloquesValor.js';
import { Partida, PREGUNTAS_POR_PARTIDA } from './logica/partida.js';
import { NOMBRES_HABILIDAD, descomposicionEnPalabras } from './logica/generadores.js';

const ELOGIOS = ['¡Correcto!', '¡Muy bien!', '¡Excelente!', '¡Genial!', '¡Perfecto!'];
const ETIQUETA_APOYO = { completo: 'Con bloques', ligero: 'Bloques opcionales', ninguno: 'Sin ayuda' };

export class JuegoBloques extends Juego {
    /** El portal le hace al niño la misión de inicio antes de la primera partida (ver adaptativo/colocacion.js). */
    static admiteColocacion = true;

    static meta = {
        id: 'bloques-valor',
        nombre: 'Bloques de Valor',
        descripcion: 'Lee y arma números con bloques y descubre por qué se «lleva» al sumar y se «pide prestado» al restar.',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    constructor(dependencias) {
        super(dependencias);
        this.aleatorio = Math.random;
        this.planificador = new Planificador();
        this.tiempoJuego = 0;
        this.fase = 'jugando';       // jugando | transicion
        this.material = null;        // BloquesValor de la pregunta actual
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
        this.textoProgreso = h('span', { class: 'bloques-juego__dato' });
        this.textoPuntos = h('span', { class: 'bloques-juego__dato' });
        this.textoRacha = h('span', { class: 'bloques-juego__dato' });
        this.textoApoyo = h('span', { class: 'bloques-juego__dato bloques-juego__dato--apoyo' });
        this.barra = h('div', { class: 'bloques-juego__barra', role: 'presentation', 'aria-hidden': 'true' });
        this.textoEnunciado = h('p', { class: 'bloques-juego__enunciado', 'aria-live': 'polite', 'data-leer': true });
        this.textoConsigna = h('p', { class: 'bloques-juego__consigna', 'aria-live': 'polite' });
        this.zonaMaterial = h('div', { class: 'bloques-juego__material' });
        this.zonaAcciones = h('div', { class: 'bloques-juego__acciones' });
        this.textoMensaje = h('p', { class: 'bloques-juego__mensaje', 'aria-live': 'polite' });
        this.botonEnsenar = crearBotonEnsenar(() => pedirLeccion(this));
        this.botonSiguiente = h('button', { class: 'boton boton--secundario', type: 'button', hidden: true, onClick: () => this.irASiguiente() }, 'Siguiente ➜');
        this.raiz = h('section', { class: 'bloques-juego', 'aria-label': 'Bloques de Valor' },
            h('div', { class: 'bloques-juego__hud' }, this.textoProgreso, this.textoPuntos, this.textoRacha, this.textoApoyo),
            this.barra, this.textoEnunciado, this.textoConsigna, this.zonaMaterial, this.zonaAcciones,
            h('div', { class: 'bloques-juego__pie' }, this.textoMensaje, this.botonEnsenar, this.botonSiguiente));
        contenedor.append(this.raiz);
    }

    mensaje(texto, tipo = '') {
        this.textoMensaje.textContent = texto;
        this.textoMensaje.className = `bloques-juego__mensaje ${tipo ? `bloques-juego__mensaje--${tipo}` : ''}`;
    }

    actualizarHud() {
        const p = this.partida;
        this.textoProgreso.textContent = `Pregunta ${Math.min(p.numero, PREGUNTAS_POR_PARTIDA)} de ${p.total}`;
        this.textoPuntos.textContent = `Puntos: ${p.puntaje}`;
        this.textoRacha.textContent = p.racha >= 2 ? `Racha: ${p.racha}` : '';
        const resueltas = p.numero - (p.resuelta ? 0 : 1);
        vaciar(this.barra);
        for (let i = 0; i < p.total; i++) {
            this.barra.append(h('span', { class: `bloques-juego__ficha${i < resueltas ? ' bloques-juego__ficha--lista' : ''}` }));
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
        this.terminadoElMaterial = false;
        vaciar(this.zonaMaterial);
        vaciar(this.zonaAcciones);
        this.textoEnunciado.textContent = pregunta.enunciado;
        this.textoConsigna.textContent = '';
        this.textoConsigna.hidden = false;
        this.textoApoyo.textContent = this.partida.colocacion ? '' : ETIQUETA_APOYO[pregunta.apoyo];

        this.botonesActuales = this.crearOpciones(pregunta);
        const manipula = pregunta.material && pregunta.material.modo !== 'ver';
        const obligatorio = manipula && pregunta.apoyo === 'completo';
        if (pregunta.material) this.montarMaterial(pregunta, manipula);
        if (!obligatorio) this.zonaAcciones.append(...this.botonesActuales);

        presentarIntro(this, pregunta.habilidad);
        this.mensaje(this.partida.numero === 1 ? (obligatorio ? 'Usa los bloques para encontrar la respuesta.' : 'Elige la respuesta correcta.') : '');
        this.actualizarHud();
    }

    crearOpciones(pregunta) {
        return pregunta.opciones.map((opcion) => h('button', {
            class: 'bloques-juego__opcion', type: 'button', 'aria-label': opcion.texto,
            onClick: (e) => this.elegirOpcion(opcion, e.currentTarget)
        }, opcion.texto));
    }

    /** ¿Ya hizo el niño lo que pedía el material? (construir lo pedido, juntar todo, quitar lo indicado) */
    materialTerminado(material, estado) {
        if (material.modo === 'construir') return estado.coincideCon(material.objetivo);
        if (material.modo === 'juntar') return estado.normalizado;
        if (material.modo === 'quitar') return estado.quitoExactamente(material.quitar);
        return false;
    }

    consigna(material) {
        if (material.modo === 'construir') return `Construye con bloques: ${descomposicionEnPalabras(Number(material.objetivo.slice().reverse().join('')))}.`;
        if (material.modo === 'juntar') return `Junta los bloques de ${material.a} y de ${material.b}. Si una columna llega a 10 o más, cámbialos con «10 → 1».`;
        if (material.modo === 'quitar') return `Están los bloques de ${material.a}. Quita ${material.b}; si no alcanzan, cambia 1 por 10 con «1 → 10».`;
        return '';
    }

    montarMaterial(pregunta, manipula) {
        const { material } = pregunta;
        const estado = new EstadoBloques({ columnas: material.columnas, inicial: material.cuenta });
        this.material = new BloquesValor({
            estado, modo: material.modo,
            alCambiar: (e) => {
                if (pregunta.apoyo === 'completo' && manipula && !this.terminadoElMaterial && this.materialTerminado(material, e)) {
                    this.terminadoElMaterial = true;
                    this.revelarOpciones(material.modo === 'construir' ? '¡Muy bien! Ahora di qué número armaste.' : '¡Muy bien! Ahora elige la respuesta.');
                }
            }
        });
        this.textoConsigna.textContent = this.consigna(material);
        if (pregunta.apoyo === 'ligero' && manipula) {
            // Bloques a la mano pero cerrados: abrirlos es decisión del niño
            this.material.elemento.hidden = true;
            this.textoConsigna.hidden = true;
            const alternar = h('button', { class: 'boton boton--secundario boton--chico', type: 'button', 'aria-expanded': 'false' }, 'Usar bloques');
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

    revelarOpciones(texto) {
        if (this.zonaAcciones.contains(this.botonesActuales[0])) return;
        this.zonaAcciones.append(...this.botonesActuales);
        this.mensaje(texto);
    }

    elegirOpcion(opcion, boton) {
        if (this.estado !== 'jugando' || this.fase !== 'jugando' || boton.getAttribute('aria-disabled') === 'true') return;
        this.resolver(opcion.id, boton);
    }

    /** Responde con `id` (el número elegido) y muestra el resultado. */
    resolver(id, boton) {
        const antes = this.partida.pregunta.apoyo;
        const r = this.partida.responder(id, { ahoraMs: this.tiempoJuego });
        if (r.tipo === 'ignorada') return;

        if (r.tipo === 'correcta') {
            if (boton) boton.classList.add('bloques-juego__opcion--correcta');
            this.botonesActuales.forEach((b) => b.setAttribute('aria-disabled', 'true'));
            if (this.material) this.material.desactivar();
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
                boton.classList.add('bloques-juego__opcion--incorrecta');
                boton.setAttribute('aria-disabled', 'true');
            }
            this.mensaje(`Casi. Pista: ${r.pista}`, 'pista');
            this.botonEnsenar.hidden = false;
            this.audio.reproducirEfecto('fallo');
        }
        this.actualizarHud();
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
