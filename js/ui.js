/**
 * Clase UIManager - Gestiona la interfaz de usuario del juego
 */
class UIManager {
    constructor() {
        this.scoreElement = document.getElementById('scoreValue');
        this.livesElement = document.getElementById('livesValue');
        this.finalScoreElement = document.getElementById('finalScore');
        this.gameOverScreen = document.getElementById('gameOverScreen');
    }

    /**
     * Actualiza la puntuación mostrada
     */
    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.textContent = score;
            this.animateScoreChange();
        }
    }

    /**
     * Actualiza las vidas mostradas
     */
    updateLives(lives) {
        if (this.livesElement) {
            this.livesElement.textContent = lives;
            this.animateLivesChange();
        }
    }

    /**
     * Anima el cambio de puntuación
     */
    animateScoreChange() {
        if (this.scoreElement) {
            this.scoreElement.parentElement.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.scoreElement.parentElement.style.transform = 'scale(1)';
            }, 200);
        }
    }

    /**
     * Anima el cambio de vidas
     */
    animateLivesChange() {
        if (this.livesElement) {
            this.livesElement.parentElement.style.transform = 'scale(1.2)';
            this.livesElement.parentElement.style.borderColor = '#ff3366';
            setTimeout(() => {
                this.livesElement.parentElement.style.transform = 'scale(1)';
                this.livesElement.parentElement.style.borderColor = '#00d9ff';
            }, 300);
        }
    }

    /**
     * Muestra la pantalla de Game Over
     */
    showGameOver(finalScore) {
        if (this.gameOverScreen && this.finalScoreElement) {
            this.finalScoreElement.textContent = finalScore;
            this.gameOverScreen.classList.add('active');
        }
    }

    /**
     * Oculta la pantalla de Game Over
     */
    hideGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.remove('active');
        }
    }

    /**
     * Muestra un mensaje temporal en el canvas
     */
    static drawMessage(ctx, message, x, y, fontSize = 30, color = '#ffffff') {
        ctx.save();
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Sombra para mejor legibilidad
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000000';
        ctx.fillText(message, x, y);
        
        ctx.restore();
    }

    /**
     * Dibuja el nivel actual
     */
    static drawLevel(ctx, level, canvas) {
        const message = `NIVEL ${level}`;
        UIManager.drawMessage(ctx, message, canvas.width / 2, 100, 40, '#00d9ff');
    }

    /**
     * Dibuja mensaje de pausa
     */
    static drawPause(ctx, canvas) {
        // Fondo semi-transparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Texto de pausa
        UIManager.drawMessage(ctx, 'PAUSA', canvas.width / 2, canvas.height / 2, 60, '#00d9ff');
        UIManager.drawMessage(
            ctx,
            'Presiona ESPACIO para continuar',
            canvas.width / 2,
            canvas.height / 2 + 60,
            20,
            '#ffffff'
        );
    }

    /**
     * Dibuja mensaje de inicio de nivel
     */
    static drawLevelStart(ctx, level, canvas) {
        const message = `NIVEL ${level}`;
        const subMessage = '¡Prepárate!';
        
        UIManager.drawMessage(ctx, message, canvas.width / 2, canvas.height / 2 - 30, 50, '#00ff88');
        UIManager.drawMessage(ctx, subMessage, canvas.width / 2, canvas.height / 2 + 30, 25, '#ffffff');
    }

    /**
     * Dibuja barra de progreso (útil para carga o cooldowns)
     */
    static drawProgressBar(ctx, x, y, width, height, progress, color = '#00d9ff') {
        // Borde
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Relleno
        const fillWidth = width * Math.max(0, Math.min(1, progress));
        const gradient = ctx.createLinearGradient(x, y, x + fillWidth, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#ffffff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, fillWidth, height);
    }

    /**
     * Dibuja mini-mapa (radar) - opcional
     */
    static drawMiniMap(ctx, canvas, player, asteroids, size = 150) {
        const mapX = canvas.width - size - 20;
        const mapY = 20;
        const scale = size / Math.max(canvas.width, canvas.height);

        ctx.save();
        
        // Fondo del mini-mapa
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(mapX, mapY, size, size);
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, size, size);

        // Jugador
        const playerX = mapX + (player.x * scale);
        const playerY = mapY + (player.y * scale);
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Asteroides
        asteroids.forEach(asteroid => {
            const astX = mapX + (asteroid.x * scale);
            const astY = mapY + (asteroid.y * scale);
            
            ctx.fillStyle = asteroid.size === 'large' ? '#ff3366' : 
                           asteroid.size === 'medium' ? '#ff9900' : '#ffcc00';
            ctx.beginPath();
            ctx.arc(astX, astY, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    /**
     * Efecto de pantalla de daño (flash rojo)
     */
    static drawDamageFlash(ctx, canvas, opacity = 0.3) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    /**
     * Dibuja FPS (para debugging)
     */
    static drawFPS(ctx, fps) {
        ctx.save();
        ctx.font = '14px monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'left';
        ctx.fillText(`FPS: ${fps}`, 10, 20);
        ctx.restore();
    }
}
