/**
 * Clase Particle - Representa una partícula individual de una explosión
 */
class Particle {
    constructor(x, y, color = '#ff6600') {
        this.x = x;
        this.y = y;
        this.color = color;
        
        // Velocidad y dirección aleatorias
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        
        this.radius = Math.random() * 3 + 1;
        this.life = 1.0; // Vida de la partícula (1.0 = 100%)
        this.decay = Math.random() * 0.02 + 0.01; // Velocidad de desvanecimiento
        this.gravity = 0.05; // Simular gravedad
    }

    /**
     * Actualiza la posición y vida de la partícula
     */
    update() {
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= this.decay;
        this.radius *= 0.98; // La partícula se hace más pequeña
    }

    /**
     * Dibuja la partícula
     */
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        
        // Gradiente radial para efecto de brillo
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, 'rgba(255, 102, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Punto brillante en el centro
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Verifica si la partícula ha terminado su vida
     */
    isDead() {
        return this.life <= 0;
    }
}

/**
 * Clase Explosion - Representa una explosión completa
 */
class Explosion {
    constructor(x, y, size = 'medium') {
        this.x = x;
        this.y = y;
        this.particles = [];
        
        // Número de partículas según el tamaño
        let particleCount;
        let colors;
        
        switch(size) {
            case 'small':
                particleCount = 15;
                colors = ['#ff6600', '#ff9900', '#ffcc00'];
                break;
            case 'medium':
                particleCount = 25;
                colors = ['#ff3300', '#ff6600', '#ff9900', '#ffcc00'];
                break;
            case 'large':
                particleCount = 40;
                colors = ['#ff0000', '#ff3300', '#ff6600', '#ff9900', '#ffcc00'];
                break;
        }
        
        // Crear partículas
        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color));
        }
    }

    /**
     * Actualiza todas las partículas de la explosión
     */
    update() {
        this.particles = this.particles.filter(particle => {
            particle.update();
            return !particle.isDead();
        });
    }

    /**
     * Dibuja todas las partículas de la explosión
     */
    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }

    /**
     * Verifica si la explosión ha terminado
     */
    isDone() {
        return this.particles.length === 0;
    }
}

/**
 * Clase ParticleManager - Gestiona todas las explosiones y partículas
 */
class ParticleManager {
    constructor() {
        this.explosions = [];
    }

    /**
     * Crea una nueva explosión
     */
    createExplosion(x, y, size = 'medium') {
        this.explosions.push(new Explosion(x, y, size));
    }

    /**
     * Actualiza todas las explosiones
     */
    update() {
        this.explosions = this.explosions.filter(explosion => {
            explosion.update();
            return !explosion.isDone();
        });
    }

    /**
     * Dibuja todas las explosiones
     */
    draw(ctx) {
        this.explosions.forEach(explosion => explosion.draw(ctx));
    }

    /**
     * Limpia todas las explosiones
     */
    clear() {
        this.explosions = [];
    }

    /**
     * Crea efecto de estrellas de fondo (opcional)
     */
    static createStarField(canvas, count = 100) {
        const stars = [];
        
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5,
                opacity: Math.random() * 0.5 + 0.5,
                twinkleSpeed: Math.random() * 0.02
            });
        }
        
        return stars;
    }

    /**
     * Dibuja el campo de estrellas
     */
    static drawStarField(ctx, stars, time) {
        stars.forEach(star => {
            const twinkle = Math.sin(time * star.twinkleSpeed) * 0.3 + 0.7;
            
            ctx.save();
            ctx.globalAlpha = star.opacity * twinkle;
            
            // Estrella con brillo
            const gradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.radius * 2
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.5, '#ccccff');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Punto central brillante
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
    }
}
