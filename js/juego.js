/**
 * Archivo de inicialización del juego
 * Punto de entrada principal
 */

// Variable global del gestor de juego
let gestorJuego;

/**
 * Inicializa el juego cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando juego...');
    
    try {
        // Verificar dependencias
        if (typeof CONFIG === 'undefined') {
            throw new Error('CONFIG no está definido. Verifica que configuracion.js se haya cargado.');
        }
        if (typeof Utilidades === 'undefined') {
            throw new Error('Utilidades no está definido. Verifica que utilidades.js se haya cargado.');
        }
        if (typeof GestorJuego === 'undefined') {
            throw new Error('GestorJuego no está definido. Verifica que gestorJuego.js se haya cargado.');
        }
        
        // Obtener canvas
        const canvas = document.getElementById('canvas');
        if (!canvas) {
            throw new Error('Canvas no encontrado en el DOM');
        }
        
        // Crear gestor de juego
        gestorJuego = new GestorJuego(canvas);
        
        // Configurar botones
        configurarBotones();
        
        // Ajustar tamaño del canvas
        ajustarCanvas();
        
        // Evento de redimensionamiento
        window.addEventListener('resize', ajustarCanvas);
        
        console.log('🚀 Asteroides Matemáticos cargado correctamente');
        
    } catch (error) {
        console.error('Error al inicializar el juego:', error);
        alert('Error al inicializar el juego: ' + error.message);
    }
});

/**
 * Configura los eventos de los botones
 */
function configurarBotones() {
    // Botón Iniciar
    const btnIniciar = document.getElementById('btnIniciar');
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            try {
                gestorJuego.iniciar();
                btnIniciar.disabled = true;
                const btnPausar = document.getElementById('btnPausar');
                if (btnPausar) btnPausar.disabled = false;
            } catch (error) {
                console.error('Error al iniciar:', error);
                alert('Error al iniciar el juego: ' + error.message);
            }
        });
    }

    // Botón Pausar
    const btnPausar = document.getElementById('btnPausar');
    if (btnPausar) {
        btnPausar.addEventListener('click', () => {
            try {
                gestorJuego.pausar();
                
                if (gestorJuego.estado === 'pausado') {
                    btnPausar.innerHTML = '<i class="bi bi-play-fill"></i> Continuar';
                    btnPausar.classList.remove('btn-warning');
                    btnPausar.classList.add('btn-success');
                } else {
                    btnPausar.innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
                    btnPausar.classList.remove('btn-success');
                    btnPausar.classList.add('btn-warning');
                }
            } catch (error) {
                console.error('Error al pausar:', error);
            }
        });
    }

    // Botón Reiniciar
    const btnReiniciar = document.getElementById('btnReiniciar');
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres reiniciar el juego?')) {
                try {
                    gestorJuego.reiniciar();
                    
                    const btnIniciar = document.getElementById('btnIniciar');
                    const btnPausar = document.getElementById('btnPausar');
                    
                    if (btnIniciar) btnIniciar.disabled = false;
                    if (btnPausar) {
                        btnPausar.disabled = true;
                        btnPausar.innerHTML = '<i class="bi bi-pause-fill"></i> Pausar';
                        btnPausar.classList.remove('btn-success');
                        btnPausar.classList.add('btn-warning');
                    }
                } catch (error) {
                    console.error('Error al reiniciar:', error);
                }
            }
        });
    }

    // Botón Audio
    const btnAudio = document.getElementById('btnAudio');
    if (btnAudio) {
        btnAudio.addEventListener('click', () => {
            try {
                const activo = gestorJuego.alternarAudio();
                
                if (activo) {
                    btnAudio.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
                    btnAudio.classList.remove('btn-outline-light');
                    btnAudio.classList.add('btn-success');
                } else {
                    btnAudio.innerHTML = '<i class="bi bi-volume-mute-fill"></i>';
                    btnAudio.classList.remove('btn-success');
                    btnAudio.classList.add('btn-outline-light');
                }
            } catch (error) {
                console.error('Error al cambiar audio:', error);
            }
        });
        btnAudio.click(); // Inicializar estado del audio
    }
}

/**
 * Ajusta el tamaño del canvas manteniendo las proporciones
 */
function ajustarCanvas() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    
    const contenedor = canvas.parentElement;
    if (!contenedor) return;
    
    // Obtener ancho del contenedor
    const anchoContenedor = contenedor.clientWidth;
    
    // Calcular escala manteniendo proporción
    const escala = anchoContenedor / CONFIG.CANVAS.ANCHO;
    
    // Aplicar transformación CSS
    canvas.style.width = anchoContenedor + 'px';
    canvas.style.height = (CONFIG.CANVAS.ALTO * escala) + 'px';
}

/**
 * Manejo de atajos de teclado
 */
document.addEventListener('keydown', (e) => {
    if (!gestorJuego) return;
    
    switch(e.key) {
        case ' ':
        case 'p':
        case 'P':
            e.preventDefault();
            if (gestorJuego.estado === 'jugando' || gestorJuego.estado === 'pausado') {
                const btnPausar = document.getElementById('btnPausar');
                if (btnPausar && !btnPausar.disabled) {
                    btnPausar.click();
                }
            }
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            if (confirm('¿Reiniciar el juego?')) {
                const btnReiniciar = document.getElementById('btnReiniciar');
                if (btnReiniciar) {
                    btnReiniciar.click();
                }
            }
            break;
        case 'm':
        case 'M':
            e.preventDefault();
            const btnAudio = document.getElementById('btnAudio');
            if (btnAudio) {
                btnAudio.click();
            }
            break;
    }
});

/**
 * Prevenir comportamiento por defecto de algunos eventos
 */
window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
});
