/**
 * Gestor Principal del Juego
 * Principio SOLID: Coordina todos los componentes (Dependency Injection)
 */

class GestorJuego {
    constructor(canvas) {
        if (!canvas) {
            throw new Error('Canvas no proporcionado al GestorJuego');
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Componentes del juego (Inyección de dependencias)
        this.gestorAudio = new GestorAudio();
        this.gestorNivel = new GestorNivel();
        this.sistemaParticulas = new SistemaParticulas();
        this.nave = new Nave();
        
        // Estado del juego
        this.asteroides = [];
        this.itemsEspeciales = [];
        this.operacionActual = null;
        this.estado = 'detenido'; // detenido, jugando, pausado, gameover
        this.estrellas = this.generarEstrellas(100);
        this.frameId = null;
        
        // Configurar eventos
        this.configurarEventos();
        
        console.log('GestorJuego inicializado correctamente');
    }

    /**
     * Configura los eventos del juego
     */
    configurarEventos() {
        this.canvas.addEventListener('click', (e) => this.manejarClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.manejarMovimientoMouse(e));
        
        // Eventos de teclado para movimiento
        document.addEventListener('keydown', (e) => {
            if (this.estado === 'jugando') {
                // Prevenir scroll con flechas
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                }
                this.nave.teclaPresionada(e.key);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.estado === 'jugando') {
                this.nave.teclaSoltada(e.key);
            }
        });
    }

    /**
     * Maneja el click en el canvas
     */
    manejarClick(evento) {
        if (this.estado !== 'jugando') return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (evento.clientX - rect.left) * scaleX;
        const y = (evento.clientY - rect.top) * scaleY;

        // Verificar click en asteroides
        for (let i = this.asteroides.length - 1; i >= 0; i--) {
            const asteroide = this.asteroides[i];
            
            if (asteroide.colisionConPunto(x, y)) {
                this.procesarClickAsteroide(asteroide, i);
                break;
            }
        }

        // Verificar click en ítems especiales
        for (let i = this.itemsEspeciales.length - 1; i >= 0; i--) {
            const item = this.itemsEspeciales[i];
            
            if (item.colisionConPunto(x, y)) {
                this.procesarClickItem(item, i);
                break;
            }
        }
    }

    /**
     * Procesa el click en un asteroide
     */
    procesarClickAsteroide(asteroide, indice) {
        if (asteroide.esRespuestaCorrecta) {
            // Respuesta correcta - solo disparar, no destruir todavía
            this.gestorAudio.reproducirEfecto('acierto');
            
            // Disparo de la nave hacia el asteroide
            this.nave.dispararHacia(asteroide.x, asteroide.y);
            
            // NO eliminar el asteroide aquí, esperar a que el láser colisione
            
        } else {
            // Respuesta incorrecta - disparar pero no afecta al asteroide
            this.gestorAudio.reproducirEfecto('fallo');
            this.gestorNivel.registrarFallo();
            
            // Disparo de la nave hacia el asteroide incorrecto
            this.nave.dispararHacia(asteroide.x, asteroide.y);
            
            // Mostrar mensaje según fallos consecutivos
            const fallosRestantes = 2 - this.gestorNivel.fallosConsecutivos;
            if (fallosRestantes > 0) {
                this.mostrarMensajeTemporal(`¡Incorrecto! (${fallosRestantes} fallo más = -1 vida)`, 1500);
            }
            
            // Verificar si perdió una vida
            if (this.gestorNivel.juegoTerminado()) {
                this.finalizarJuego();
            }
        }
        
        this.actualizarInterfaz();
    }

    /**
     * Verifica colisiones entre láseres y asteroides
     */
    verificarColisionesLaseres() {
        // Iterar sobre los láseres de forma segura
        for (let laserIndex = this.nave.laseres.length - 1; laserIndex >= 0; laserIndex--) {
            const laser = this.nave.laseres[laserIndex];
            let laserEliminado = false;
            
            // Verificar colisión con asteroides
            for (let i = this.asteroides.length - 1; i >= 0; i--) {
                const asteroide = this.asteroides[i];
                
                // Verificar colisión entre láser y asteroide
                if (Utilidades.puntoEnCirculo(laser.x, laser.y, asteroide.x, asteroide.y, asteroide.radio)) {
                    // Colisión detectada
                    if (asteroide.esRespuestaCorrecta) {
                        // Respuesta correcta - AHORA sí destruir
                        this.gestorAudio.reproducirEfecto('explosion');
                        
                        // Crear explosión
                        this.sistemaParticulas.crearExplosion(
                            asteroide.x,
                            asteroide.y,
                            30,
                            CONFIG.COLORES.CORRECTO
                        );
                        
                        // Eliminar asteroide
                        this.asteroides.splice(i, 1);
                        
                        // Eliminar láser
                        this.nave.laseres.splice(laserIndex, 1);
                        laserEliminado = true;
                        
                        // Actualizar puntuación AQUÍ cuando realmente colisiona
                        this.gestorNivel.registrarAcierto();
                        const subioNivel = this.gestorNivel.sumarPuntos(CONFIG.PUNTUACION.ACIERTO);
                        
                        if (subioNivel) {
                            this.gestorAudio.reproducirEfecto('nivel');
                            this.mostrarMensajeTemporal('¡Nivel ' + this.gestorNivel.nivel + '!', 2000);
                        }
                        
                        // Generar nueva operación y asteroides
                        this.generarNuevaOperacion();
                        
                        // Posibilidad de generar ítem especial
                        if (Math.random() < 0.2) {
                            this.generarItemEspecial();
                        }
                        
                        this.actualizarInterfaz();
                        
                        break; // Salir del bucle de asteroides
                    } else {
                        // Respuesta incorrecta - solo efecto visual, el asteroide permanece
                        this.sistemaParticulas.crearExplosion(
                            asteroide.x,
                            asteroide.y,
                            10,
                            CONFIG.COLORES.INCORRECTO
                        );
                        
                        // Eliminar solo el láser
                        this.nave.laseres.splice(laserIndex, 1);
                        laserEliminado = true;
                        break; // Salir del bucle de asteroides
                    }
                }
            }
            
            // Si el láser ya fue eliminado, continuar con el siguiente
            if (laserEliminado) {
                continue;
            }
        }
    }

    /**
     * Inicia el juego
     */
    iniciar() {
        this.gestorAudio.inicializar();
        this.estado = 'jugando';
        this.generarNuevaOperacion();
        const mensajeJuego = document.getElementById('mensajeJuego');
        if (mensajeJuego) {
            mensajeJuego.classList.add('oculto');
        }
        this.bucleJuego();
        console.log('Juego iniciado');
    }

    /**
     * Pausa el juego
     */
    pausar() {
        if (this.estado === 'jugando') {
            this.estado = 'pausado';
            this.mostrarMensaje('⏸️ Pausado', 'Haz clic en Continuar para seguir jugando');
        } else if (this.estado === 'pausado') {
            this.estado = 'jugando';
            const mensajeJuego = document.getElementById('mensajeJuego');
            if (mensajeJuego) {
                mensajeJuego.classList.add('oculto');
            }
            this.bucleJuego();
        }
    }

    /**
     * Reinicia el juego
     */
    reiniciar() {
        this.estado = 'detenido';
        this.gestorNivel.reiniciar();
        this.asteroides = [];
        this.itemsEspeciales = [];
        this.sistemaParticulas.limpiar();
        this.nave.limpiarLaseres();
        this.actualizarInterfaz();
        this.mostrarMensaje('🚀 Asteroides Matemáticos', 'Presiona "Iniciar Juego" para comenzar');
        console.log('Juego reiniciado');
    }

    /**
     * Genera una nueva operación matemática
     */
    generarNuevaOperacion() {
        this.operacionActual = new OperacionMatematica(this.gestorNivel.nivel);
        
        // Limpiar asteroides anteriores
        this.asteroides = [];
        
        // Obtener la respuesta correcta
        const respuestaCorrecta = this.operacionActual.resultado;
        
        // Generar respuestas incorrectas
        const respuestasIncorrectas = this.operacionActual.generarRespuestasIncorrectas(
            this.gestorNivel.cantidadAsteroides - 1
        );
        
        // Combinar todas las respuestas
        const todasLasRespuestas = [respuestaCorrecta, ...respuestasIncorrectas];
        
        // Verificar que no haya duplicados
        const respuestasUnicas = [...new Set(todasLasRespuestas)];
        
        // Si hay duplicados, regenerar
        if (respuestasUnicas.length !== todasLasRespuestas.length) {
            console.warn('Respuestas duplicadas detectadas, regenerando...');
            this.generarNuevaOperacion();
            return;
        }
        
        // Mezclar respuestas
        respuestasUnicas.sort(() => Math.random() - 0.5);
        
        console.log('Generando asteroides - Respuestas:', respuestasUnicas, 'Correcta:', respuestaCorrecta);
        
        // Crear asteroides
        respuestasUnicas.forEach((numero, index) => {
            const esCorrecta = numero === respuestaCorrecta;
            const asteroide = new Asteroide(numero, esCorrecta);
            asteroide.x = (CONFIG.CANVAS.ANCHO / respuestasUnicas.length) * (index + 0.5);
            asteroide.y = -Utilidades.numeroAleatorio(50, 200);
            asteroide.establecerVelocidad(this.gestorNivel.velocidadAsteroides);
            this.asteroides.push(asteroide);
            
            if (esCorrecta) {
                console.log(`Asteroide correcto en posición ${index}: ${numero}`);
            }
        });
        
        // Actualizar UI
        const operacionTexto = document.getElementById('operacionTexto');
        if (operacionTexto) {
            operacionTexto.textContent = this.operacionActual.obtenerTexto();
        }
        
        // Verificar que hay exactamente un asteroide correcto
        const asteroidesCorrectos = this.asteroides.filter(a => a.esRespuestaCorrecta);
        if (asteroidesCorrectos.length !== 1) {
            console.error('ERROR: No hay exactamente 1 asteroide correcto!', asteroidesCorrectos.length);
            this.generarNuevaOperacion();
        }
    }

    /**
     * Genera un ítem especial aleatorio
     */
    generarItemEspecial() {
        const tipos = Object.values(CONFIG.ITEMS);
        const tipoAleatorio = tipos[Utilidades.numeroAleatorio(0, tipos.length - 1)];
        const x = Utilidades.numeroAleatorio(50, CONFIG.CANVAS.ANCHO - 50);
        
        this.itemsEspeciales.push(new ItemEspecial(tipoAleatorio, x, -30));
    }

    /**
     * Genera estrellas de fondo
     */
    generarEstrellas(cantidad) {
        const estrellas = [];
        for (let i = 0; i < cantidad; i++) {
            estrellas.push({
                x: Utilidades.numeroAleatorio(0, CONFIG.CANVAS.ANCHO),
                y: Utilidades.numeroAleatorio(0, CONFIG.CANVAS.ALTO),
                radio: Utilidades.numeroAleatorioDecimal(0.5, 2),
                brillo: Math.random()
            });
        }
        return estrellas;
    }

    /**
     * Bucle principal del juego
     */
    bucleJuego() {
        if (this.estado !== 'jugando') {
            if (this.frameId) {
                cancelAnimationFrame(this.frameId);
            }
            return;
        }

        this.actualizar();
        this.dibujar();

        this.frameId = requestAnimationFrame(() => this.bucleJuego());
    }

    /**
     * Actualiza todos los elementos del juego
     */
    actualizar() {
        // Actualizar nave
        this.nave.actualizar();

        // Actualizar asteroides
        this.asteroides.forEach(asteroide => {
            asteroide.actualizar();
        });

        // Verificar colisiones entre láseres y asteroides
        this.verificarColisionesLaseres();

        // Eliminar asteroides fuera de pantalla
        let asteroidesEscapados = false;
        this.asteroides = this.asteroides.filter(asteroide => {
            if (asteroide.estafueraDePantalla()) {
                if (asteroide.esRespuestaCorrecta) {
                    // Si se escapó la respuesta correcta, perder vida
                    const vidasRestantes = this.gestorNivel.perderVida();
                    this.gestorNivel.aumentarVelocidad();
                    this.gestorAudio.reproducirEfecto('fallo');
                    this.mostrarMensajeTemporal(`¡Se escapó! Vidas: ${vidasRestantes}`, 1500);
                    asteroidesEscapados = true;
                    
                    // Verificar si el juego terminó
                    if (this.gestorNivel.juegoTerminado()) {
                        this.finalizarJuego();
                    }
                }
                return false;
            }
            return true;
        });

        // Si se escaparon asteroides y el juego no terminó, generar nueva operación
        if (asteroidesEscapados && !this.gestorNivel.juegoTerminado()) {
            this.generarNuevaOperacion();
        }

        // Actualizar ítems especiales
        this.itemsEspeciales.forEach(item => item.actualizar());
        this.itemsEspeciales = this.itemsEspeciales.filter(
            item => !item.estaFueraDePantalla()
        );

        // Actualizar sistema de partículas
        this.sistemaParticulas.actualizar();

        // Actualizar multiplicador
        this.gestorNivel.actualizarMultiplicador();

        // Actualizar interfaz periódicamente
        if (Math.random() < 0.1) {
            this.actualizarInterfaz();
        }
    }

    /**
     * Dibuja todos los elementos del juego
     */
    dibujar() {
        // Limpiar canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.ANCHO, CONFIG.CANVAS.ALTO);

        // Dibujar estrellas
        this.dibujarEstrellas();

        // Dibujar nave
        this.nave.dibujar(this.ctx);

        // Dibujar asteroides
        this.asteroides.forEach(asteroide => asteroide.dibujar(this.ctx));

        // Dibujar ítems especiales
        this.itemsEspeciales.forEach(item => item.dibujar(this.ctx));

        // Dibujar partículas
        this.sistemaParticulas.dibujar(this.ctx);
    }

    /**
     * Dibuja las estrellas de fondo
     */
    dibujarEstrellas() {
        this.estrellas.forEach(estrella => {
            estrella.brillo += 0.02;
            const alpha = 0.3 + Math.sin(estrella.brillo) * 0.3;
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(estrella.x, estrella.y, estrella.radio, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    /**
     * Finaliza el juego
     */
    finalizarJuego() {
        this.estado = 'gameover';
        const stats = this.gestorNivel.obtenerEstadisticas();
        this.mostrarMensaje(
            '💀 Game Over',
            `Puntos finales: ${stats.puntos} | Nivel: ${stats.nivel} | Precisión: ${stats.precision}%`
        );
        console.log('Juego terminado');
    }

    /**
     * Procesa el click en un ítem especial
     */
    procesarClickItem(item, indice) {
        this.gestorAudio.reproducirEfecto('powerup');
        
        // Disparo de la nave hacia el ítem
        this.nave.dispararHacia(item.x, item.y);
        
        // Aplicar efecto del ítem
        switch(item.tipo) {
            case CONFIG.ITEMS.ESCUDO:
                this.nave.activarEscudo();
                break;
            case CONFIG.ITEMS.RALENTIZAR:
                this.gestorNivel.ralentizarAsteroides();
                break;
            case CONFIG.ITEMS.DOBLE_PUNTOS:
                this.gestorNivel.activarMultiplicador(2);
                break;
            case CONFIG.ITEMS.VIDA_EXTRA:
                this.gestorNivel.ganarVida();
                this.gestorNivel.sumarPuntos(CONFIG.PUNTUACION.ITEM_ESPECIAL);
                this.mostrarMensajeTemporal('¡+1 Vida!', 1500);
                break;
        }
        
        // Eliminar ítem
        this.itemsEspeciales.splice(indice, 1);
        
        // Feedback visual
        this.sistemaParticulas.crearExplosion(
            item.x,
            item.y,
            20,
            item.color
        );
        
        this.actualizarInterfaz();
    }

    /**
     * Actualiza la interfaz de usuario
     */
    actualizarInterfaz() {
        const stats = this.gestorNivel.obtenerEstadisticas();
        
        const nivel = document.getElementById('nivel');
        const puntos = document.getElementById('puntos');
        const aciertos = document.getElementById('aciertos');
        const fallos = document.getElementById('fallos');
        const velocidad = document.getElementById('velocidad');
        const vidas = document.getElementById('vidas');
        
        if (nivel) nivel.textContent = stats.nivel;
        if (puntos) puntos.textContent = Utilidades.formatearNumero(stats.puntos);
        if (aciertos) aciertos.textContent = stats.aciertos;
        if (fallos) fallos.textContent = stats.fallos;
        if (velocidad) velocidad.textContent = stats.velocidad;
        if (vidas) {
            // Mostrar corazones según las vidas
            const corazones = '❤️'.repeat(stats.vidas) + '🖤'.repeat(CONFIG.VIDAS.MAXIMA - stats.vidas);
            vidas.textContent = corazones;
        }

        // Actualizar poderes activos
        this.actualizarPoderesActivos();
    }

    /**
     * Actualiza la visualización de poderes activos
     */
    actualizarPoderesActivos() {
        const contenedor = document.getElementById('poderesActivos');
        if (!contenedor) return;
        
        const poderes = [];

        if (this.nave.tieneEscudo) {
            poderes.push('<span class="badge bg-info">🛡️ Escudo</span>');
        }

        if (this.gestorNivel.multiplicadorPuntos > 1) {
            poderes.push('<span class="badge bg-warning">⭐ x2 Puntos</span>');
        }

        if (poderes.length === 0) {
            contenedor.innerHTML = '<span class="badge bg-secondary">Ninguno</span>';
        } else {
            contenedor.innerHTML = poderes.join(' ');
        }
    }

    /**
     * Muestra un mensaje en el overlay
     */
    mostrarMensaje(titulo, subtitulo = '') {
        const overlay = document.getElementById('mensajeJuego');
        if (!overlay) return;
        
        const h1 = overlay.querySelector('h1');
        const p = overlay.querySelector('p');
        
        if (h1) h1.textContent = titulo;
        if (p) p.textContent = subtitulo;
        overlay.classList.remove('oculto');
    }

    /**
     * Muestra un mensaje temporal
     */
    mostrarMensajeTemporal(texto, duracion) {
        const operacionDiv = document.getElementById('operacionActual');
        if (!operacionDiv) return;
        
        const textoOriginal = operacionDiv.innerHTML;
        
        operacionDiv.innerHTML = `<h3 class="m-0">${texto}</h3>`;
        
        setTimeout(() => {
            operacionDiv.innerHTML = textoOriginal;
        }, duracion);
    }

    /**
     * Alterna el estado del audio
     */
    alternarAudio() {
        const activo = this.gestorAudio.alternar();
        return activo;
    }
}
