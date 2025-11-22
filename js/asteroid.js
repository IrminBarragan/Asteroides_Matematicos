/**
 * Clase Asteroid - Representa un asteroide en el juego
 */
class Asteroid {
    constructor(x, y, size, canvas) {
        this.x = x;
        this.y = y;
        this.canvas = canvas;
        this.size = size; // 'large', 'medium', 'small'
        
        // Definir radio según tamaño
        switch(size) {
            case 'large':
                this.radius = 40;
                this.points = 20;
                break;
            case 'medium':
                this.radius = 25;
                this.points = 50;
                break;
            case 'small':
                this.radius = 15;
                this.points = 100;
                break;
        }

        // Velocidad aleatoria
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };

        // Rotación aleatoria
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;

        // Forma irregular del asteroide
        this.vertices = this.generateVertices();
    }

    /**
     * Genera vértices aleatorios para dar forma irregular al asteroide
     */
    generateVertices() {
        const vertices = [];
        const numVertices = 8 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const distance = this.radius * (0.7 + Math.random() * 0.3);
            vertices.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            });
        }
        
        return vertices;
    }

    /**
     * Actualiza la posición del asteroide
     */
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.rotation += this.rotationSpeed;

        // Wrap around
        if (this.x < -this.radius) this.x = this.canvas.width + this.radius;
        if (this.x > this.canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = this.canvas.height + this.radius;
        if (this.y > this.canvas.height + this.radius) this.y = -this.radius;
    }

    /**
     * Dibuja el asteroide
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Dibujar asteroide
        ctx.beginPath();
        this.vertices.forEach((vertex, index) => {
            if (index === 0) {
                ctx.moveTo(vertex.x, vertex.y);
            } else {
                ctx.lineTo(vertex.x, vertex.y);
            }
        });
        ctx.closePath();

        // Color según tamaño
        let color;
        switch(this.size) {
            case 'large':
                color = '#8b4513';
                break;
            case 'medium':
                color = '#a0522d';
                break;
            case 'small':
                color = '#cd853f';
                break;
        }

        // Gradiente radial
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, '#4a4a4a');
        gradient.addColorStop(1, '#2a2a2a');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Contorno
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Detalles (cráteres)
        this.drawCraters(ctx);

        ctx.restore();
    }

    /**
     * Dibuja cráteres en el asteroide para darle más detalle
     */
    drawCraters(ctx) {
        const numCraters = this.size === 'large' ? 3 : this.size === 'medium' ? 2 : 1;
        
        for (let i = 0; i < numCraters; i++) {
            const angle = (i / numCraters) * Math.PI * 2;
            const distance = this.radius * 0.4;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const craterRadius = this.radius * 0.15;

            ctx.beginPath();
            ctx.arc(x, y, craterRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
        }
    }

    /**
     * Detecta colisión con otro objeto circular
     */
    checkCollision(object) {
        const dx = this.x - object.x;
        const dy = this.y - object.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + object.radius;
    }

    /**
     * Divide el asteroide en asteroides más pequeños
     */
    split() {
        if (this.size === 'small') {
            return []; // No se divide más
        }

        const newSize = this.size === 'large' ? 'medium' : 'small';
        const newAsteroids = [];

        // Crear 2 asteroides más pequeños
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const offset = 20;
            const newX = this.x + Math.cos(angle) * offset;
            const newY = this.y + Math.sin(angle) * offset;
            
            newAsteroids.push(new Asteroid(newX, newY, newSize, this.canvas));
        }

        return newAsteroids;
    }

    /**
     * Crea asteroides en posiciones aleatorias del canvas
     */
    static createRandom(canvas, count, playerX, playerY, minDistance = 150) {
        const asteroids = [];
        
        for (let i = 0; i < count; i++) {
            let x, y;
            let tooClose = true;
            
            // Asegurar que no aparezcan cerca del jugador
            while (tooClose) {
                x = Math.random() * canvas.width;
                y = Math.random() * canvas.height;
                
                const dx = x - playerX;
                const dy = y - playerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > minDistance) {
                    tooClose = false;
                }
            }
            
            asteroids.push(new Asteroid(x, y, 'large', canvas));
        }
        
        return asteroids;
    }
}
