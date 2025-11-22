/**
 * Clase Laser - Representa un disparo láser
 */
class Laser {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.radius = 3;
        this.speed = 10;
        this.velocity = {
            x: Math.cos(angle) * this.speed,
            y: Math.sin(angle) * this.speed
        };
        this.distance = 0;
        this.maxDistance = 600; // Distancia máxima antes de desaparecer
        this.trail = []; // Estela del láser
        this.maxTrailLength = 5;
    }

    /**
     * Actualiza la posición del láser
     */
    update(canvas) {
        // Guardar posición anterior para la estela
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Actualizar posición
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.distance += this.speed;

        // Wrap around
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }

    /**
     * Dibuja el láser con efectos visuales
     */
    draw(ctx) {
        // Dibujar estela
        if (this.trail.length > 1) {
            ctx.beginPath();
            this.trail.forEach((point, index) => {
                const alpha = (index + 1) / this.trail.length;
                const size = this.radius * alpha;
                
                ctx.save();
                ctx.globalAlpha = alpha * 0.5;
                ctx.fillStyle = '#00d9ff';
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        // Dibujar láser principal
        ctx.save();
        
        // Brillo exterior
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00d9ff';
        
        // Círculo exterior (brillo)
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#00d9ff');
        gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Núcleo del láser
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Verifica si el láser ha excedido su distancia máxima
     */
    isExpired() {
        return this.distance >= this.maxDistance;
    }

    /**
     * Detecta colisión con un objeto circular
     */
    checkCollision(object) {
        const dx = this.x - object.x;
        const dy = this.y - object.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.radius + object.radius;
    }
}

/**
 * Clase LaserManager - Gestiona todos los láseres
 */
class LaserManager {
    constructor() {
        this.lasers = [];
        this.lastFireTime = 0;
        this.fireRate = 200; // Milisegundos entre disparos
    }

    /**
     * Dispara un nuevo láser
     */
    fire(x, y, angle) {
        const currentTime = Date.now();
        if (currentTime - this.lastFireTime >= this.fireRate) {
            // Ajustar posición inicial para que salga de la punta de la nave
            const offset = 20;
            const laserX = x + Math.cos(angle) * offset;
            const laserY = y + Math.sin(angle) * offset;
            
            this.lasers.push(new Laser(laserX, laserY, angle));
            this.lastFireTime = currentTime;
            return true; // Disparo exitoso
        }
        return false; // No puede disparar aún
    }

    /**
     * Actualiza todos los láseres
     */
    update(canvas) {
        this.lasers = this.lasers.filter(laser => {
            laser.update(canvas);
            return !laser.isExpired();
        });
    }

    /**
     * Dibuja todos los láseres
     */
    draw(ctx) {
        this.lasers.forEach(laser => laser.draw(ctx));
    }

    /**
     * Limpia todos los láseres
     */
    clear() {
        this.lasers = [];
    }

    /**
     * Obtiene todos los láseres activos
     */
    getAll() {
        return this.lasers;
    }

    /**
     * Elimina un láser específico
     */
    remove(laser) {
        const index = this.lasers.indexOf(laser);
        if (index > -1) {
            this.lasers.splice(index, 1);
        }
    }
}
