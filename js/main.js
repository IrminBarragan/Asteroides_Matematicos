/**
 * Main.js - Punto de entrada principal del juego
 * Inicializa el juego y maneja los eventos del DOM
 */

// Instancia del juego
let game = null;

/**
 * Inicializa el juego cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
    // Obtener elementos del DOM
    const canvas = document.getElementById('gameCanvas');
    const instructionsModal = document.getElementById('instructionsModal');
    const startGameBtn = document.getElementById('startGameBtn');
    const restartBtn = document.getElementById('restartBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const showInstructionsBtn = document.getElementById('showInstructionsBtn');

    // Crear instancia del juego
    game = new Game(canvas);

    // Mostrar modal de instrucciones al cargar
    const modal = new bootstrap.Modal(instructionsModal);
    modal.show();

    /**
     * Evento: Comenzar juego desde el modal
     */
    startGameBtn.addEventListener('click', () => {
        modal.hide();
        game.start();
    });

    /**
     * Evento: Reiniciar juego desde Game Over
     */
    restartBtn.addEventListener('click', () => {
        game.restart();
    });

    /**
     * Evento: Botón de pausa
     */
    pauseBtn.addEventListener('click', () => {
        if (game.state === 'playing') {
            game.pause();
            pauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Reanudar';
        } else if (game.state === 'paused') {
            game.resume();
            pauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pausa';
        }
    });

    /**
     * Evento: Mostrar instrucciones desde Game Over
     */
    showInstructionsBtn.addEventListener('click', () => {
        modal.show();
    });

    /**
     * Evento: Cerrar modal con ESC
     */
    instructionsModal.addEventListener('hidden.bs.modal', () => {
        // Si el juego no ha comenzado, iniciarlo
        if (game.state === 'waiting') {
            game.start();
        }
    });

    /**
     * Prevenir scroll con las flechas
     */
    window.addEventListener('keydown', (e) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }
    });

    /**
     * Manejar visibilidad de la pestaña
     */
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === 'playing') {
            game.pause();
            pauseBtn.innerHTML = '<i class="bi bi-play-fill"></i> Reanudar';
        }
    });

    /**
     * Prevenir el menú contextual en el canvas
     */
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    /**
     * Control táctil para dispositivos móviles (básico)
     */
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (game.state !== 'playing') return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        
        // Simular aceleración
        game.keys['w'] = true;
    });

    canvas.addEventListener('touchmove', (e) => {
        if (game.state !== 'playing') return;
        e.preventDefault();
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const deltaX = touchX - touchStartX;
        
        // Rotación basada en movimiento horizontal
        if (deltaX > 20) {
            game.keys['d'] = true;
            game.keys['a'] = false;
        } else if (deltaX < -20) {
            game.keys['a'] = true;
            game.keys['d'] = false;
        } else {
            game.keys['a'] = false;
            game.keys['d'] = false;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        if (game.state !== 'playing') return;
        
        // Detener aceleración
        game.keys['w'] = false;
        game.keys['a'] = false;
        game.keys['d'] = false;
        
        // Disparar si fue un tap rápido
        const touchEndTime = Date.now();
        const fired = game.laserManager.fire(
            game.player.x,
            game.player.y,
            game.player.angle
        );
        if (fired) {
            game.soundManager.playLaserSound();
        }
    });

    /**
     * Mensaje de bienvenida en consola
     */
    console.log('%c🚀 Juego de Asteroides 🚀', 'font-size: 20px; color: #00d9ff; font-weight: bold;');
    console.log('%cControles:', 'font-size: 14px; color: #00ff88;');
    console.log('W / ↑ - Acelerar');
    console.log('A / ← - Girar izquierda');
    console.log('D / → - Girar derecha');
    console.log('ESPACIO - Disparar');
    console.log('R - Reiniciar');
    console.log('%c¡Buena suerte!', 'font-size: 14px; color: #ff9900;');
});

/**
 * Limpiar recursos al cerrar/recargar la página
 */
window.addEventListener('beforeunload', () => {
    if (game) {
        game.stop();
    }
});
