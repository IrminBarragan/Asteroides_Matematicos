/**
 * Clase Player - Representa la nave espacial del jugador
 */
class Player {
    constructor(x, y, canvas) {
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.radius = 15;
        this.angle = -Math.PI / 2; // Apuntando hacia arriba
        this.rotation = 0;
        this.velocity = { x: 0, y: 0 };
        this.thrust = 0;
        this.maxSpeed = 8;
        this.acceleration = 0.15;
        this.friction = 0.98;
        this.rotationSpeed = 0.08;
        this.isThrusting = false;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.invulnerableDuration = 2000; // 2 segundos de invulnerabilidad
    }

    /**
     * Actualiza la posición y estado del jugador
     */
    update(keys) {
        // Rotación
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            this.angle -= this.rotationSpeed;
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            this.angle += this.rotationSpeed;
        }

        // Aceleración
        this.isThrusting = keys['ArrowUp'] || keys['w'] || keys['W'];
        
        if (this.isThrusting) {
            this.velocity.x += Math.cos(this.angle) * this.acceleration;
            this.velocity.y += Math.sin(this.angle) * this.acceleration;
        }

        // Aplicar fricción
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Limitar velocidad máxima
        const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (speed > this.maxSpeed) {
            this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
            this.velocity.y = (this.velocity.y / speed) * this.maxSpeed;
        }

        // Actualizar posición
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Wrap around (aparecer del otro lado de la pantalla)
        if (this.x < -this.radius) this.x = this.canvas.width + this.radius;
        if (this.x > this.canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = this.canvas.height + this.radius;
        if (this.y > this.canvas.height + this.radius) this.y = -this.radius;

        // Actualizar invulnerabilidad
        if (this.invulnerable) {
            this.invulnerableTime += 16.67; // ~60fps
            if (this.invulnerableTime >= this.invulnerableDuration) {
                this.invulnerable = false;
                this.invulnerableTime = 0;
            }
        }
    }

    /**
     * Dibuja la nave espacial
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);

        // Efecto de parpadeo cuando es invulnerable
        if (this.invulnerable && Math.floor(this.invulnerableTime / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Dibujar la nave (triángulo)
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(-this.radius * 0.7, this.radius);
        ctx.lineTo(this.radius * 0.7, this.radius);
        ctx.closePath();

        // Gradiente para la nave
        const gradient = ctx.createLinearGradient(-this.radius, 0, this.radius, 0);
        gradient.addColorStop(0, '#00d9ff');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#00d9ff');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Contorno
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cabina (detalle)
        ctx.beginPath();
        ctx.arc(0, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Llama del propulsor cuando acelera
        if (this.isThrusting) {
            ctx.beginPath();
            ctx.moveTo(-this.radius * 0.3, this.radius);
            ctx.lineTo(0, this.radius + this.radius * 0.8);
            ctx.lineTo(this.radius * 0.3, this.radius);
            
            const flameGradient = ctx.createLinearGradient(0, this.radius, 0, this.radius + this.radius * 0.8);
            flameGradient.addColorStop(0, '#ff9900');
            flameGradient.addColorStop(0.5, '#ff6600');
            flameGradient.addColorStop(1, '#ff0000');
            
            ctx.fillStyle = flameGradient;
            ctx.fill();

            // Efecto de brillo
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff6600';
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    /**
     * Establece invulnerabilidad temporal
     */
    setInvulnerable() {
        this.invulnerable = true;
        this.invulnerableTime = 0;
    }

    /**
     * Reinicia la posición del jugador
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0 };
        this.angle = -Math.PI / 2;
        this.isThrusting = false;
        this.setInvulnerable();
    }

    /**
     * Obtiene las coordenadas de los vértices de la nave para detección de colisiones
     */
    getVertices() {
        const vertices = [];
        const cos = Math.cos(this.angle + Math.PI / 2);
        const sin = Math.sin(this.angle + Math.PI / 2);

        // Vértices del triángulo
        const points = [
            { x: 0, y: -this.radius },
            { x: -this.radius * 0.7, y: this.radius },
            { x: this.radius * 0.7, y: this.radius }
        ];

        points.forEach(point => {
            vertices.push({
                x: this.x + (point.x * cos - point.y * sin),
                y: this.y + (point.x * sin + point.y * cos)
            });
        });

        return vertices;
    }
}
