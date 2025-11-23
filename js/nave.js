/**
 * Clase Nave
 * Principio SOLID: Single Responsibility - Solo maneja la nave y láseres
 */

class Laser {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.ancho = 4;
        this.alto = 20;
        this.color = CONFIG.COLORES.LASER;
        
        // Calcular dirección hacia el objetivo
        const dx = targetX - x;
        const dy = targetY - y;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        // Velocidad más rápida para mejor feedback visual
        const velocidad = CONFIG.NAVE.VELOCIDAD_LASER * 1.5;
        
        this.velocidadX = (dx / distancia) * velocidad;
        this.velocidadY = (dy / distancia) * velocidad;
    }

    actualizar() {
        this.x += this.velocidadX;
        this.y += this.velocidadY;
    }

    dibujar(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        // Dibujar láser con efecto de brillo más visible
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Efecto de estela
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    estaFueraDePantalla() {
        return this.y + this.alto < 0 || 
               this.y > CONFIG.CANVAS.ALTO || 
               this.x < 0 || 
               this.x > CONFIG.CANVAS.ANCHO;
    }
}

class Nave {
    constructor() {
        this.x = CONFIG.CANVAS.ANCHO / 2;
        this.y = CONFIG.NAVE.POSICION_Y;
        this.ancho = CONFIG.NAVE.ANCHO;
        this.alto = CONFIG.NAVE.ALTO;
        this.color = CONFIG.COLORES.NAVE;
        this.laseres = [];
        this.tieneEscudo = false;
        this.tiempoEscudo = 0;
        this.velocidadMovimiento = 8;
        
        // Control de teclas (solo izquierda y derecha)
        this.teclas = {
            izquierda: false,
            derecha: false
        };
        
        // Imagen de la nave
        this.imagen = new Image();
        this.imagenCargada = false;
        this.imagen.onload = () => {
            this.imagenCargada = true;
            console.log('Imagen de la nave cargada correctamente');
        };
        this.imagen.onerror = () => {
            console.warn('No se pudo cargar la imagen de la nave, usando diseño por defecto');
            this.imagenCargada = false;
        };
        // Intentar cargar la imagen
        this.imagen.src = CONFIG.NAVE.IMAGEN_URL;
    }

    /**
     * Mueve la nave hacia una posición X
     */
    moverA(x) {
        this.x = Utilidades.limitar(
            x,
            this.ancho / 2,
            CONFIG.CANVAS.ANCHO - this.ancho / 2
        );
    }

    /**
     * Mueve la nave con las teclas (solo izquierda/derecha)
     */
    moverConTeclas() {
        if (this.teclas.izquierda) {
            this.x -= this.velocidadMovimiento;
        }
        if (this.teclas.derecha) {
            this.x += this.velocidadMovimiento;
        }
        
        // Limitar movimiento dentro del canvas (solo horizontal)
        this.x = Utilidades.limitar(this.x, this.ancho / 2, CONFIG.CANVAS.ANCHO - this.ancho / 2);
    }

    /**
     * Maneja el evento de tecla presionada
     */
    teclaPresionada(tecla) {
        switch(tecla) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.teclas.izquierda = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.teclas.derecha = true;
                break;
        }
    }

    /**
     * Maneja el evento de tecla soltada
     */
    teclaSoltada(tecla) {
        switch(tecla) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.teclas.izquierda = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.teclas.derecha = false;
                break;
        }
    }

    /**
     * Dispara un láser hacia una posición específica
     */
    dispararHacia(targetX, targetY) {
        this.laseres.push(new Laser(this.x, this.y - this.alto / 2, targetX, targetY));
    }

    /**
     * Dispara un láser recto hacia arriba (por compatibilidad)
     */
    disparar() {
        this.dispararHacia(this.x, 0);
    }

    /**
     * Actualiza la nave y sus láseres
     */
    actualizar() {
        // Mover nave con teclas
        this.moverConTeclas();
        
        // Actualizar láseres
        this.laseres = this.laseres.filter(laser => {
            laser.actualizar();
            return !laser.estaFueraDePantalla();
        });

        // Actualizar escudo
        if (this.tieneEscudo) {
            this.tiempoEscudo--;
            if (this.tiempoEscudo <= 0) {
                this.tieneEscudo = false;
            }
        }
    }

    /**
     * Dibuja la nave
     */
    dibujar(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Dibujar escudo si está activo
        if (this.tieneEscudo) {
            ctx.strokeStyle = CONFIG.COLORES.ITEMS.escudo;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
            ctx.beginPath();
            ctx.arc(0, 0, this.ancho * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Dibujar la nave
        if (this.imagenCargada) {
            // Dibujar con imagen (más grande)
            const anchoImagen = this.ancho;
            const altoImagen = this.alto;
            
            ctx.drawImage(
                this.imagen,
                -anchoImagen / 2,
                -altoImagen / 2,
                anchoImagen,
                altoImagen
            );
        } else {
            // Dibujar diseño por defecto (triángulo más grande)
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(0, -this.alto / 2);
            ctx.lineTo(-this.ancho / 2, this.alto / 2);
            ctx.lineTo(this.ancho / 2, this.alto / 2);
            ctx.closePath();
            ctx.fill();

            // Detalles
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Cabina más grande
            ctx.fillStyle = '#00BFFF';
            ctx.beginPath();
            ctx.arc(0, 0, this.ancho / 3.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Detalle adicional (ventanas)
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();

        // Dibujar láseres
        this.laseres.forEach(laser => laser.dibujar(ctx));
    }

    /**
     * Activa el escudo
     */
    activarEscudo(duracion = 300) {
        this.tieneEscudo = true;
        this.tiempoEscudo = duracion;
    }

    /**
     * Limpia todos los láseres
     */
    limpiarLaseres() {
        this.laseres = [];
    }
}
