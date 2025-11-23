/**
 * Clase Asteroide
 * Principio SOLID: Single Responsibility - Solo maneja lógica de asteroides
 */

class Asteroide {
    constructor(numero, esRespuestaCorrecta = false) {
        this.numero = numero;
        this.esRespuestaCorrecta = esRespuestaCorrecta;
        this.x = Utilidades.numeroAleatorio(50, CONFIG.CANVAS.ANCHO - 50);
        this.y = -50;
        this.radio = Utilidades.numeroAleatorio(
            CONFIG.ASTEROIDE.RADIO_MIN,
            CONFIG.ASTEROIDE.RADIO_MAX
        );
        this.velocidad = CONFIG.ASTEROIDE.VELOCIDAD_INICIAL;
        this.rotacion = 0;
        this.velocidadRotacion = Utilidades.numeroAleatorioDecimal(-0.03, 0.03);
        
        // Color aleatorio para todos los asteroides (sin distinción visual)
        this.color = this.generarColorAleatorio();
        
        this.pulsacion = 0;
        
        // Generar forma irregular una sola vez (no cada frame)
        this.vertices = this.generarFormaIrregular();
    }

    /**
     * Genera un color aleatorio para el asteroide
     */
    generarColorAleatorio() {
        const colores = [
            '#FF6B6B', // Rojo
            '#4ECDC4', // Cyan
            '#45B7D1', // Azul
            '#FFA07A', // Salmon
            '#98D8C8', // Turquesa
            '#F7DC6F', // Amarillo
            '#BB8FCE', // Púrpura
            '#F8B88B', // Naranja
            '#82E0AA', // Verde
            '#F1948A'  // Rosa
        ];
        return colores[Math.floor(Math.random() * colores.length)];
    }

    /**
     * Genera los vértices de la forma irregular del asteroide
     */
    generarFormaIrregular() {
        const vertices = [];
        const lados = 8;
        
        for (let i = 0; i < lados; i++) {
            const angulo = (i / lados) * Math.PI * 2;
            const variacion = Utilidades.numeroAleatorioDecimal(0.8, 1.0);
            vertices.push({
                angulo: angulo,
                radio: this.radio * variacion
            });
        }
        
        return vertices;
    }

    /**
     * Actualiza la posición del asteroide
     */
    actualizar() {
        this.y += this.velocidad;
        this.rotacion += this.velocidadRotacion;
        this.pulsacion += 0.05;
    }

    /**
     * Dibuja el asteroide
     */
    dibujar(ctx) {
        ctx.save();
        
        // Efecto de pulsación sutil para respuesta correcta
        const escala = this.esRespuestaCorrecta ? 
            1 + Math.sin(this.pulsacion) * 0.05 : 1;

        // Dibujar el cuerpo del asteroide (CON rotación)
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotacion);
        ctx.scale(escala, escala);

        // Dibujar asteroide (forma irregular)
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.vertices.forEach((vertice, index) => {
            const x = Math.cos(vertice.angulo) * vertice.radio;
            const y = Math.sin(vertice.angulo) * vertice.radio;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Dibujar número (SIN rotación, siempre horizontal)
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Aplicar solo la escala de pulsación, NO la rotación
        if (this.esRespuestaCorrecta) {
            ctx.scale(escala, escala);
        }

        // Dibujar número horizontal
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.font = `bold ${this.radio * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Contorno negro para mejor legibilidad
        ctx.strokeText(this.numero, 0, 0);
        ctx.fillText(this.numero, 0, 0);

        ctx.restore();
    }

    /**
     * Verifica si el asteroide está fuera de la pantalla
     */
    estafueraDePantalla() {
        return this.y - this.radio > CONFIG.CANVAS.ALTO;
    }

    /**
     * Establece la velocidad del asteroide
     */
    establecerVelocidad(velocidad) {
        this.velocidad = Math.min(velocidad, CONFIG.ASTEROIDE.VELOCIDAD_MAX);
    }

    /**
     * Verifica colisión con un punto
     */
    colisionConPunto(x, y) {
        return Utilidades.puntoEnCirculo(x, y, this.x, this.y, this.radio);
    }
}
