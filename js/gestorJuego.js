/**
 * Gestor Principal del Juego con IA Adaptativa
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
        this.sistemaIA = new SistemaIA(); // 🤖 Nuevo sistema de IA

        // Estado del juego
        this.asteroides = [];
        this.itemsEspeciales = [];
        this.operacionActual = null;
        this.estado = 'detenido'; // detenido, jugando, pausado, gameover
        this.estrellas = this.generarEstrellas(100);
        this.frameId = null;

        // Métricas de tiempo para IA
        this.tiempoInicioRespuesta = null;
        this.ultimaActualizacionIA = 0;

        // Configurar eventos
        this.configurarEventos();

        console.log('GestorJuego con IA inicializado correctamente');
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
     * Maneja el movimiento del mouse
     */
    manejarMovimientoMouse(evento) {
        if (this.estado !== 'jugando') return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const x = (evento.clientX - rect.left) * scaleX;

        this.nave.moverA(x);
    }

    /**
     * Procesa el click en un asteroide
     */
    procesarClickAsteroide(asteroide, indice) {
        // 🤖 Calcular tiempo de respuesta para IA
        const tiempoRespuesta = this.tiempoInicioRespuesta ?
            Date.now() - this.tiempoInicioRespuesta : 0;

        if (asteroide.esRespuestaCorrecta) {
            // Respuesta correcta
            this.gestorAudio.reproducirEfecto('acierto');
            this.nave.dispararHacia(asteroide.x, asteroide.y);

            // 🤖 Registrar respuesta correcta en IA
            this.sistemaIA.registrarRespuesta(
                true,
                this.operacionActual.operador,
                tiempoRespuesta
            );

        } else {
            // Respuesta incorrecta
            this.gestorAudio.reproducirEfecto('fallo');
            this.gestorNivel.registrarFallo();
            this.nave.dispararHacia(asteroide.x, asteroide.y);

            // 🤖 Registrar respuesta incorrecta en IA
            this.sistemaIA.registrarRespuesta(
                false,
                this.operacionActual.operador,
                tiempoRespuesta
            );

            const fallosRestantes = 2 - this.gestorNivel.fallosConsecutivos;
            if (fallosRestantes > 0) {
                this.mostrarMensajeTemporal(`¡Incorrecto! ${fallosRestantes} fallo${fallosRestantes > 1 ? 's' : ''} más = -1 vida`, 3000, 'error');
            }

            if (this.gestorNivel.juegoTerminado()) {
                this.finalizarJuego();
            }
        }

        this.actualizarInterfaz();
        this.actualizarInterfazIA(); // 🤖 Actualizar panel IA
    }

    /**
     * Verifica colisiones entre láseres y asteroides
     */
    verificarColisionesLaseres() {
        for (let laserIndex = this.nave.laseres.length - 1; laserIndex >= 0; laserIndex--) {
            const laser = this.nave.laseres[laserIndex];
            let laserEliminado = false;

            for (let i = this.asteroides.length - 1; i >= 0; i--) {
                const asteroide = this.asteroides[i];

                if (Utilidades.puntoEnCirculo(laser.x, laser.y, asteroide.x, asteroide.y, asteroide.radio)) {
                    if (asteroide.esRespuestaCorrecta) {
                        this.gestorAudio.reproducirEfecto('explosion');

                        this.sistemaParticulas.crearExplosion(
                            asteroide.x,
                            asteroide.y,
                            30,
                            CONFIG.COLORES.CORRECTO
                        );

                        this.asteroides.splice(i, 1);
                        this.nave.laseres.splice(laserIndex, 1);
                        laserEliminado = true;

                        this.gestorNivel.registrarAcierto();
                        const subioNivel = this.gestorNivel.sumarPuntos(CONFIG.PUNTUACION.ACIERTO);

                        // Mostrar mensaje de acierto
                        const mensajesAcierto = [
                            '¡Correcto!',
                            '¡Excelente!',
                            '¡Muy bien!',
                            '¡Perfecto!',
                            '¡Genial!'
                        ];
                        const mensajeAleatorio = mensajesAcierto[Math.floor(Math.random() * mensajesAcierto.length)];
                        this.mostrarMensajeTemporal(mensajeAleatorio + ' +10 puntos', 2000, 'acierto');

                        if (subioNivel) {
                            this.gestorAudio.reproducirEfecto('nivel');
                            this.mostrarMensajeTemporal('¡Nivel ' + this.gestorNivel.nivel + ' alcanzado!', 3000, 'info');

                            // 🤖 Aplicar ajustes de IA al subir de nivel
                            this.aplicarAjustesIA();
                        }

                        this.generarNuevaOperacion();

                        if (Math.random() < 0.2) {
                            this.generarItemEspecial();
                        }

                        this.actualizarInterfaz();
                        break;

                    } else {
                        this.sistemaParticulas.crearExplosion(
                            asteroide.x,
                            asteroide.y,
                            10,
                            CONFIG.COLORES.INCORRECTO
                        );

                        this.nave.laseres.splice(laserIndex, 1);
                        laserEliminado = true;
                        break;
                    }
                }
            }

            if (laserEliminado) {
                continue;
            }
        }
    }

    /**
     * 🤖 Aplica ajustes de dificultad basados en IA
     */
    aplicarAjustesIA() {
        const ajustes = this.sistemaIA.obtenerAjustesDificultad();

        if (ajustes.aplicarCambio) {
            // Ajustar velocidad
            this.gestorNivel.velocidadAsteroides *= ajustes.velocidad;
            this.gestorNivel.velocidadAsteroides = Math.min(
                this.gestorNivel.velocidadAsteroides,
                CONFIG.ASTEROIDE.VELOCIDAD_MAX
            );

            // Ajustar cantidad de asteroides
            this.gestorNivel.cantidadAsteroides += ajustes.cantidadAsteroides;
            this.gestorNivel.cantidadAsteroides = Math.max(
                CONFIG.ASTEROIDE.CANTIDAD_INICIAL,
                Math.min(this.gestorNivel.cantidadAsteroides, CONFIG.ASTEROIDE.CANTIDAD_MAXIMA)
            );

            console.log('🤖 IA ajustó dificultad:', {
                velocidad: this.gestorNivel.velocidadAsteroides,
                cantidad: this.gestorNivel.cantidadAsteroides
            });

            // Mostrar mensaje de ajuste
            const recomendacion = this.sistemaIA.obtenerRecomendacionActual();
            if (recomendacion && recomendacion.tipo === 'dificultad') {
                this.mostrarMensajeTemporal('IA: ' + recomendacion.mensaje, 3500, 'info');
            }
        }
    }

    /**
     * 🤖 Actualiza la interfaz del panel IA
     */
    actualizarInterfazIA() {
        const stats = this.sistemaIA.obtenerEstadisticasIA();

        // Actualizar nivel de habilidad
        const nivelHabilidadEl = document.getElementById('nivelHabilidad');
        if (nivelHabilidadEl) {
            nivelHabilidadEl.textContent = stats.nivelHabilidad.charAt(0).toUpperCase() +
                stats.nivelHabilidad.slice(1);
            nivelHabilidadEl.className = 'nivel-habilidad nivel-' + stats.nivelHabilidad;
        }

        // Actualizar estilo de juego
        const estiloJuegoEl = document.getElementById('estiloJuego');
        if (estiloJuegoEl) {
            estiloJuegoEl.textContent = stats.estiloJuego.charAt(0).toUpperCase() +
                stats.estiloJuego.slice(1);
        }

        // Actualizar precisión
        const precisionEl = document.getElementById('precisionIA');
        if (precisionEl) {
            precisionEl.textContent = stats.precision + '%';
        }

        // Actualizar tiempo promedio
        const tiempoEl = document.getElementById('tiempoPromedioIA');
        if (tiempoEl) {
            tiempoEl.textContent = stats.tiempoPromedio + 's';
        }

        // Actualizar racha máxima
        const rachaMaxEl = document.getElementById('rachaMaximaIA');
        if (rachaMaxEl) {
            rachaMaxEl.textContent = stats.rachaMaxima;
        }

        // Actualizar análisis IA
        const analisisEl = document.getElementById('analisisIA');
        if (analisisEl && stats.totalRespuestas >= CONFIG.IA.INTERVALO_EVALUACION) {
            let analisisHTML = `<p class="mb-2"><strong>Perfil identificado:</strong> Jugador ${stats.nivelHabilidad}</p>`;
            analisisHTML += `<p class="mb-2"><strong>Estilo:</strong> ${stats.estiloJuego}</p>`;

            if (stats.mejorando) {
                analisisHTML += `<p class="mb-0 text-success">¡Estás mejorando! Sigue así.</p>`;
            } else {
                analisisHTML += `<p class="mb-0 text-warning">Mantén la concentración.</p>`;
            }

            analisisEl.innerHTML = analisisHTML;
        }

        // Mostrar recomendación si existe
        const recomendacion = this.sistemaIA.obtenerRecomendacionActual();
        const recomendacionContainer = document.getElementById('recomendacionContainer');
        const recomendacionEl = document.getElementById('recomendacionIA');

        if (recomendacion && recomendacionContainer && recomendacionEl) {
            recomendacionContainer.style.display = 'block';
            recomendacionEl.textContent = recomendacion.mensaje;
        }

        // Mostrar operación difícil si existe
        const operacionDificilContainer = document.getElementById('operacionDificilContainer');
        const operacionDificilEl = document.getElementById('operacionDificil');

        if (stats.operacionDificil && operacionDificilContainer && operacionDificilEl) {
            operacionDificilContainer.style.display = 'block';
            operacionDificilEl.textContent =
                `Dificultad detectada en ${this.sistemaIA.obtenerNombreOperacion(stats.operacionDificil)}. Considera practicar más.`;
        } else if (operacionDificilContainer) {
            operacionDificilContainer.style.display = 'none';
        }

        // Actualizar racha en estadísticas principales
        const rachaEl = document.getElementById('racha');
        if (rachaEl) {
            rachaEl.textContent = stats.rachaActual;
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
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }

        this.gestorNivel.reiniciar();
        this.sistemaIA.reiniciar(); // 🤖 Reiniciar IA
        this.asteroides = [];
        this.itemsEspeciales = [];
        this.nave.limpiarLaseres();
        this.sistemaParticulas.limpiar();
        this.estado = 'detenido';
        this.tiempoInicioRespuesta = null;

        this.mostrarMensaje('Asteroides Matemáticos', 'Presiona "Iniciar Juego" para comenzar');
        this.actualizarInterfaz();
        this.actualizarInterfazIA(); // 🤖 Actualizar panel IA

        console.log('Juego reiniciado');
    }

    /**
     * Genera una nueva operación matemática
     * ✅ CORREGIDO: Actualiza la operación INMEDIATAMENTE antes de generar asteroides
     */
    generarNuevaOperacion() {
        // Generar nueva operación
        this.operacionActual = new OperacionMatematica(this.gestorNivel.nivel);

        // 🤖 Iniciar contador de tiempo para IA
        this.tiempoInicioRespuesta = Date.now();

        // ✅ ACTUALIZAR INTERFAZ INMEDIATAMENTE (antes de generar asteroides)
        const operacionTexto = document.getElementById('operacionTexto');
        if (operacionTexto) {
            operacionTexto.textContent = this.operacionActual.obtenerTexto();
        }

        // Ahora generar asteroides
        this.generarAsteroides();
    }

    /**
     * Genera asteroides con las respuestas
     * ✅ CORREGIDO: Evita superposición de asteroides
     */
    generarAsteroides() {
        this.asteroides = [];

        const respuestaCorrecta = this.operacionActual.resultado;
        const respuestasIncorrectas = this.operacionActual.generarRespuestasIncorrectas(
            this.gestorNivel.cantidadAsteroides - 1
        );

        // Agregar respuesta correcta
        const asteroideCorrecto = this.crearAsteroideConPosicion(respuestaCorrecta, true, []);
        this.asteroides.push(asteroideCorrecto);

        // Agregar respuestas incorrectas sin superposición
        respuestasIncorrectas.forEach(respuesta => {
            const asteroide = this.crearAsteroideConPosicion(respuesta, false, this.asteroides);
            this.asteroides.push(asteroide);
        });

        // Establecer velocidad a todos
        this.asteroides.forEach(asteroide => {
            asteroide.establecerVelocidad(this.gestorNivel.velocidadAsteroides);
        });
    }

    /**
     * ✅ NUEVO: Crea un asteroide asegurando que no se superponga con otros
     */
    crearAsteroideConPosicion(numero, esRespuestaCorrecta, asteroidesExistentes) {
        const maxIntentos = 50;
        let intento = 0;
        let asteroide = null;
        let posicionValida = false;

        while (!posicionValida && intento < maxIntentos) {
            // Crear asteroide temporal
            asteroide = new Asteroide(numero, esRespuestaCorrecta);

            // Verificar si se superpone con asteroides existentes
            posicionValida = true;
            for (const otroAsteroide of asteroidesExistentes) {
                const distancia = Math.sqrt(
                    Math.pow(asteroide.x - otroAsteroide.x, 2) +
                    Math.pow(asteroide.y - otroAsteroide.y, 2)
                );

                // Distancia mínima = suma de radios + margen de seguridad
                const distanciaMinima = asteroide.radio + otroAsteroide.radio + 20;

                if (distancia < distanciaMinima) {
                    posicionValida = false;
                    break;
                }
            }

            intento++;
        }

        // Si después de 50 intentos no encuentra posición, usar la última generada
        return asteroide;
    }

    /**
     * Genera un ítem especial aleatorio
     */
    generarItemEspecial() {
        const tipos = Object.values(CONFIG.ITEMS);
        const tipoAleatorio = tipos[Math.floor(Math.random() * tipos.length)];
        const x = Utilidades.numeroAleatorio(50, CONFIG.CANVAS.ANCHO - 50);
        const y = -50;

        this.itemsEspeciales.push(new ItemEspecial(tipoAleatorio, x, y));
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
                radio: Utilidades.numeroAleatorioDecimal(0.5, 1.5),
                brillo: Math.random() * Math.PI * 2
            });
        }
        return estrellas;
    }

    /**
     * Bucle principal del juego
     */
    bucleJuego() {
        if (this.estado !== 'jugando') return;

        this.actualizar();
        this.dibujar();

        this.frameId = requestAnimationFrame(() => this.bucleJuego());
    }

    /**
     * Actualiza la lógica del juego
     */
    actualizar() {
        this.nave.actualizar();
        this.asteroides.forEach(asteroide => asteroide.actualizar());

        this.verificarColisionesLaseres();

        let asteroidesEscapados = false;
        this.asteroides = this.asteroides.filter(asteroide => {
            if (asteroide.estafueraDePantalla()) {
                if (asteroide.esRespuestaCorrecta) {
                    const vidasRestantes = this.gestorNivel.perderVida();
                    this.gestorNivel.aumentarVelocidad();
                    this.gestorAudio.reproducirEfecto('fallo');
                    this.mostrarMensajeTemporal(`¡Se escapó la respuesta! Vidas restantes: ${vidasRestantes}`, 3000, 'warning');
                    asteroidesEscapados = true;

                    // 🤖 Registrar timeout en IA
                    const tiempoRespuesta = Date.now() - this.tiempoInicioRespuesta;
                    this.sistemaIA.registrarRespuesta(
                        false,
                        this.operacionActual.operador,
                        tiempoRespuesta
                    );

                    if (this.gestorNivel.juegoTerminado()) {
                        this.finalizarJuego();
                    }
                }
                return false;
            }
            return true;
        });

        if (asteroidesEscapados && !this.gestorNivel.juegoTerminado()) {
            this.generarNuevaOperacion();
        }

        this.itemsEspeciales.forEach(item => item.actualizar());
        this.itemsEspeciales = this.itemsEspeciales.filter(
            item => !item.estaFueraDePantalla()
        );

        this.sistemaParticulas.actualizar();
        this.gestorNivel.actualizarMultiplicador();

        if (Math.random() < 0.1) {
            this.actualizarInterfaz();
        }

        // 🤖 Actualizar IA periódicamente
        this.ultimaActualizacionIA++;
        if (this.ultimaActualizacionIA >= 300) { // Cada 5 segundos aproximadamente
            this.actualizarInterfazIA();
            this.ultimaActualizacionIA = 0;
        }
    }

    /**
     * Dibuja todos los elementos del juego
     */
    dibujar() {
        this.ctx.fillStyle = CONFIG.COLORES.CANVAS_BG_DARK;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.ANCHO, CONFIG.CANVAS.ALTO);

        this.dibujarEstrellas();
        this.nave.dibujar(this.ctx);
        this.asteroides.forEach(asteroide => asteroide.dibujar(this.ctx));
        this.itemsEspeciales.forEach(item => item.dibujar(this.ctx));
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
        const statsIA = this.sistemaIA.obtenerEstadisticasIA();

        this.mostrarMensaje(
            'Game Over',
            `Puntos: ${stats.puntos} | Nivel: ${stats.nivel} | Precisión: ${statsIA.precision}% | Racha máxima: ${statsIA.rachaMaxima}`
        );
        console.log('Juego terminado');
    }

    /**
     * Procesa el click en un ítem especial
     */
    procesarClickItem(item, indice) {
        this.gestorAudio.reproducirEfecto('powerup');
        this.nave.dispararHacia(item.x, item.y);

        switch(item.tipo) {
            case CONFIG.ITEMS.ESCUDO:
                this.nave.activarEscudo();
                this.mostrarMensajeTemporal('🛡️ Escudo activado - Protección temporal', 2500, 'info');
                break;
            case CONFIG.ITEMS.RALENTIZAR:
                this.gestorNivel.ralentizarAsteroides();
                this.mostrarMensajeTemporal('⏱️ Tiempo ralentizado - Aprovecha el momento', 2500, 'info');
                break;
            case CONFIG.ITEMS.DOBLE_PUNTOS:
                this.gestorNivel.activarMultiplicador(2);
                this.mostrarMensajeTemporal('⭐ Puntos x2 activados - ¡Máximo puntaje!', 2500, 'info');
                break;
            case CONFIG.ITEMS.VIDA_EXTRA:
                this.gestorNivel.ganarVida();
                this.gestorNivel.sumarPuntos(CONFIG.PUNTUACION.ITEM_ESPECIAL);
                this.mostrarMensajeTemporal('❤️ ¡+1 Vida ganada!', 2500, 'acierto');
                break;
        }

        this.itemsEspeciales.splice(indice, 1);

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
            const corazones = '❤️'.repeat(stats.vidas) + '🖤'.repeat(CONFIG.VIDAS.MAXIMA - stats.vidas);
            vidas.textContent = corazones;
        }

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
     * ✅ ACTUALIZADO: Ahora usa el contenedor de mensajes separado
     */
    mostrarMensajeTemporal(texto, duracion, tipo = 'info') {
        const mensajesContainer = document.getElementById('mensajesLog');
        if (!mensajesContainer) return;

        // Remover mensaje inicial si existe
        const mensajeInicial = mensajesContainer.querySelector('.mensaje-inicial');
        if (mensajeInicial) {
            mensajeInicial.remove();
        }

        // Crear nuevo mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `mensaje-item mensaje-${tipo}`;
        mensajeDiv.innerHTML = `<strong>${texto}</strong>`;

        // Agregar al inicio
        mensajesContainer.insertBefore(mensajeDiv, mensajesContainer.firstChild);

        // Limitar a 3 mensajes visibles
        while (mensajesContainer.children.length > 3) {
            mensajesContainer.removeChild(mensajesContainer.lastChild);
        }

        // Auto-scroll al top
        mensajesContainer.scrollTop = 0;

        // Remover después de la duración (opcional, puedes quitarlo si quieres que permanezcan)
        if (duracion > 0) {
            setTimeout(() => {
                if (mensajeDiv.parentNode) {
                    mensajeDiv.style.opacity = '0';
                    mensajeDiv.style.transform = 'translateX(-10px)';
                    setTimeout(() => {
                        if (mensajeDiv.parentNode) {
                            mensajeDiv.remove();
                        }
                    }, 300);
                }
            }, duracion);
        }
    }

    /**
     * Alterna el estado del audio
     */
    alternarAudio() {
        const activo = this.gestorAudio.alternar();
        return activo;
    }
}