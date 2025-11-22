/**
 * Clase Game - Controlador principal del juego
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Configurar tamaño del canvas
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Estado del juego
        this.state = 'waiting'; // waiting, playing, paused, gameOver
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.keys = {};

        // Entidades del juego
        this.player = null;
        this.asteroids = [];
        this.laserManager = new LaserManager();
        this.particleManager = new ParticleManager();
        
        // Managers
        this.soundManager = new SoundManager();
        this.uiManager = new UIManager();

        // Campo de estrellas de fondo
        this.stars = ParticleManager.createStarField(this.canvas, 150);
        this.starTime = 0;

        // Control de frames
        this.lastTime = 0;
        this.fps = 60;
        this.fpsCounter = 0;
        this.fpsTime = 0;

        // Efectos visuales
        this.damageFlashOpacity = 0;
        this.levelStartTime = 0;
        this.showLevelMessage = false;

        // Configurar controles
        this.setupControls();

        // Loop del juego
        this.animationId = null;
    }

    /**
     * Ajusta el tamaño del canvas al tamaño de la ventana
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Recrear estrellas con nuevo tamaño
        this.stars = ParticleManager.createStarField(this.canvas, 150);
    }

    /**
     * Configura los controles del teclado
     */
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            // Disparar
            if (e.code === 'Space' && this.state === 'playing') {
                e.preventDefault();
                const fired = this.laserManager.fire(
                    this.player.x,
                    this.player.y,
                    this.player.angle
                );
                if (fired) {
                    this.soundManager.playLaserSound();
                }
            }

            // Pausa
            if (e.code === 'Space' && this.state === 'paused') {
                e.preventDefault();
                this.resume();
            }

            // Reiniciar
            if ((e.key === 'r' || e.key === 'R') && this.state === 'playing') {
                this.restart();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    /**
     * Inicia el juego
     */
    start() {
        this.state = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.damageFlashOpacity = 0;

        // Crear jugador
        this.player = new Player(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.canvas
        );

        // Limpiar entidades
        this.asteroids = [];
        this.laserManager.clear();
        this.particleManager.clear();

        // Crear asteroides iniciales
        this.startLevel();

        // Actualizar UI
        this.uiManager.updateScore(this.score);
        this.uiManager.updateLives(this.lives);
        this.uiManager.hideGameOver();

        // Reanudar audio
        this.soundManager.resume();

        // Iniciar loop si no está corriendo
        if (!this.animationId) {
            this.gameLoop();
        }
    }

    /**
     * Inicia un nuevo nivel
     */
    startLevel() {
        const asteroidCount = 3 + this.level;
        this.asteroids = Asteroid.createRandom(
            this.canvas,
            asteroidCount,
            this.player.x,
            this.player.y
        );

        // Mostrar mensaje de nivel
        this.showLevelMessage = true;
        this.levelStartTime = Date.now();
    }

    /**
     * Pausa el juego
     */
    pause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.soundManager.stopThrustSound();
        }
    }

    /**
     * Reanuda el juego
     */
    resume() {
        if (this.state === 'paused') {
            this.state = 'playing';
        }
    }

    /**
     * Reinicia el juego
     */
    restart() {
        this.start();
    }

    /**
     * Termina el juego
     */
    gameOver() {
        this.state = 'gameOver';
        this.soundManager.stopThrustSound();
        this.soundManager.playGameOverSound();
        this.uiManager.showGameOver(this.score);
    }

    /**
     * Actualiza la lógica del juego
     */
    update(deltaTime) {
        if (this.state !== 'playing') return;

        // Actualizar jugador
        this.player.update(this.keys);

        // Sonido del motor
        if (this.player.isThrusting) {
            this.soundManager.playThrustSound();
        } else {
            this.soundManager.stopThrustSound();
        }

        // Actualizar asteroides
        this.asteroids.forEach(asteroid => asteroid.update());

        // Actualizar láseres
        this.laserManager.update(this.canvas);

        // Actualizar partículas
        this.particleManager.update();

        // Detectar colisiones láser-asteroide
        this.checkLaserCollisions();

        // Detectar colisiones jugador-asteroide
        this.checkPlayerCollisions();

        // Verificar si se completó el nivel
        if (this.asteroids.length === 0) {
            this.level++;
            this.startLevel();
        }

        // Actualizar efectos visuales
        if (this.damageFlashOpacity > 0) {
            this.damageFlashOpacity -= 0.05;
        }

        // Tiempo para estrellas
        this.starTime += deltaTime;
    }

    /**
     * Detecta colisiones entre láseres y asteroides
     */
    checkLaserCollisions() {
        const lasers = this.laserManager.getAll();
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            for (let j = lasers.length - 1; j >= 0; j--) {
                const laser = lasers[j];
                
                if (asteroid.checkCollision(laser)) {
                    // Crear explosión
                    this.particleManager.createExplosion(
                        asteroid.x,
                        asteroid.y,
                        asteroid.size
                    );
                    
                    // Reproducir sonido
                    this.soundManager.playExplosionSound(asteroid.size);
                    
                    // Añadir puntos
                    this.score += asteroid.points;
                    this.uiManager.updateScore(this.score);
                    
                    // Dividir asteroide
                    const newAsteroids = asteroid.split();
                    this.asteroids.push(...newAsteroids);
                    
                    // Eliminar asteroide y láser
                    this.asteroids.splice(i, 1);
                    this.laserManager.remove(laser);
                    
                    break;
                }
            }
        }
    }

    /**
     * Detecta colisiones entre el jugador y asteroides
     */
    checkPlayerCollisions() {
        if (this.player.invulnerable) return;

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            if (asteroid.checkCollision(this.player)) {
                // Crear explosión grande
                this.particleManager.createExplosion(
                    this.player.x,
                    this.player.y,
                    'large'
                );
                
                // Reproducir sonido
                this.soundManager.playCollisionSound();
                
                // Perder vida
                this.lives--;
                this.uiManager.updateLives(this.lives);
                
                // Efecto visual de daño
                this.damageFlashOpacity = 0.5;
                
                // Dividir asteroide que golpeó
                const newAsteroids = asteroid.split();
                this.asteroids.push(...newAsteroids);
                this.asteroids.splice(i, 1);
                
                if (this.lives <= 0) {
                    this.gameOver();
                } else {
                    // Resetear jugador en el centro
                    this.player.reset(
                        this.canvas.width / 2,
                        this.canvas.height / 2
                    );
                }
                
                break;
            }
        }
    }

    /**
     * Renderiza el juego
     */
    render() {
        // Limpiar canvas
        this.ctx.fillStyle = '#0a0e27';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar estrellas de fondo
        ParticleManager.drawStarField(this.ctx, this.stars, this.starTime);

        // Dibujar partículas (explosiones)
        this.particleManager.draw(this.ctx);

        // Dibujar asteroides
        this.asteroids.forEach(asteroid => asteroid.draw(this.ctx));

        // Dibujar láseres
        this.laserManager.draw(this.ctx);

        // Dibujar jugador
        if (this.player && this.state !== 'gameOver') {
            this.player.draw(this.ctx);
        }

        // Efectos visuales
        if (this.damageFlashOpacity > 0) {
            UIManager.drawDamageFlash(this.ctx, this.canvas, this.damageFlashOpacity);
        }

        // Mensaje de inicio de nivel
        if (this.showLevelMessage && Date.now() - this.levelStartTime < 2000) {
            UIManager.drawLevelStart(this.ctx, this.level, this.canvas);
        } else {
            this.showLevelMessage = false;
        }

        // Mensaje de pausa
        if (this.state === 'paused') {
            UIManager.drawPause(this.ctx, this.canvas);
        }

        // Debug: mostrar FPS (opcional)
        // UIManager.drawFPS(this.ctx, Math.round(this.fps));
    }

    /**
     * Loop principal del juego
     */
    gameLoop(currentTime = 0) {
        // Calcular delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Calcular FPS
        this.fpsTime += deltaTime;
        this.fpsCounter++;
        if (this.fpsTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = 0;
        }

        // Actualizar y renderizar
        this.update(deltaTime);
        this.render();

        // Continuar el loop
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Detiene el loop del juego
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.soundManager.stopThrustSound();
    }
}
