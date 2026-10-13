/**
 * Dibujo en canvas de Asteroides Matemáticos. Solo pinta; las reglas viven en logica/.
 * Todas las coordenadas son lógicas (900×600); el juego escala el canvas completo.
 */
import { entre } from '../../core/aleatorio.js';
import { ANCHO, ALTO } from './logica/campo.js';

const COLORES_ASTEROIDE = ['#c2410c', '#7c3aed', '#0f766e', '#be185d', '#4338ca', '#a16207', '#0369a1', '#6d28d9'];
const FUENTE = '"Fredoka", "Poppins", Arial, sans-serif';
const COLOR_PODER = { lento: '#38bdf8', doble: '#fbbf24', mitad: '#4ade80' };

export function crearEstrellas(aleatorio, cantidad = 90) {
    return Array.from({ length: cantidad }, () => ({
        x: entre(aleatorio, 0, ANCHO),
        y: entre(aleatorio, 0, ALTO),
        radio: 0.5 + aleatorio() * 1.2,
        fase: aleatorio() * Math.PI * 2
    }));
}

/**
 * Crea la entidad de un asteroide. Todos se ven igual de "amistosos": ninguna pista visual revela cuál es la correcta.
 */
export function crearAsteroide({ x, y, radio }, opcion, esCorrecta, velocidad, aleatorio) {
    const lados = 9;
    return {
        x, y, radio, velocidad,
        id: opcion.id,
        texto: opcion.texto,
        esCorrecta,
        estado: 'activo',      // activo | impactado (acierto) | incorrecto | saliendo
        alfa: 1,
        temblor: 0,
        rotacion: aleatorio() * Math.PI * 2,
        velRotacion: (aleatorio() - 0.5) * 0.02,
        color: COLORES_ASTEROIDE[Math.floor(aleatorio() * COLORES_ASTEROIDE.length)],
        vertices: Array.from({ length: lados }, (_, i) => ({
            angulo: (i / lados) * Math.PI * 2,
            radio: radio * (0.85 + aleatorio() * 0.15)
        })),
        eliminar: false
    };
}

export function dibujarFondo(ctx, estrellas, tiempo) {
    const degradado = ctx.createLinearGradient(0, 0, 0, ALTO);
    degradado.addColorStop(0, '#0b1026');
    degradado.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    for (const e of estrellas) {
        ctx.globalAlpha = 0.35 + Math.sin(tiempo * 0.002 + e.fase) * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radio, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export function dibujarAsteroide(ctx, a) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, a.alfa);
    const temblor = a.temblor > 0 ? Math.sin(a.temblor * 1.6) * 5 : 0;
    ctx.translate(a.x + temblor, a.y);

    ctx.save();
    ctx.rotate(a.rotacion);
    ctx.beginPath();
    a.vertices.forEach((v, i) => {
        const px = Math.cos(v.angulo) * v.radio;
        const py = Math.sin(v.angulo) * v.radio;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = a.estado === 'incorrecto' ? '#6b7280' : a.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = a.estado === 'impactado' ? '#4ade80' : '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Número horizontal con contorno oscuro: legible sobre cualquier color. Se encoge si es muy ancho (decimales)
    let tamano = a.radio * 0.78;
    ctx.font = `700 ${tamano}px ${FUENTE}`;
    const ancho = ctx.measureText(a.texto).width;
    const maximo = a.radio * 1.75;
    if (ancho > maximo) {
        tamano *= maximo / ancho;
        ctx.font = `700 ${tamano}px ${FUENTE}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(a.texto, 0, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(a.texto, 0, 2);
    ctx.restore();
}

/** Anillo punteado que indica a qué asteroide dispararía el teclado. */
export function dibujarAnillo(ctx, a, tiempo) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(tiempo * 0.002);
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, a.radio + 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

export function dibujarPoder(ctx, p, tiempo) {
    const color = COLOR_PODER[p.tipo];
    const pulso = 1 + Math.sin(tiempo * 0.006) * 0.08;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulso, pulso);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, p.radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${p.radio * 0.9}px ${FUENTE}`;
    if (p.tipo === 'doble') {
        ctx.fillText('x2', 0, 2);
    } else if (p.tipo === 'mitad') {
        ctx.fillText('½', 0, 2);
    } else { // copo de nieve: tiempo lento
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 3);
            ctx.beginPath();
            ctx.moveTo(0, -p.radio * 0.6);
            ctx.lineTo(0, p.radio * 0.6);
            ctx.stroke();
            ctx.restore();
        }
    }
    ctx.restore();
}

export function dibujarLaser(ctx, l) {
    ctx.save();
    ctx.strokeStyle = '#a5f3fc';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(l.x - l.dx * 14, l.y - l.dy * 14);
    ctx.lineTo(l.x, l.y);
    ctx.stroke();
    ctx.restore();
}

export function dibujarNave(ctx, nave, imagen, imagenLista) {
    ctx.save();
    ctx.translate(nave.x, nave.y);
    if (imagenLista) {
        ctx.drawImage(imagen, -nave.ancho / 2, -nave.alto / 2, nave.ancho, nave.alto);
    } else { // plan B si la imagen no cargó: un triángulo
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.moveTo(0, -nave.alto / 2);
        ctx.lineTo(nave.ancho / 2, nave.alto / 2);
        ctx.lineTo(-nave.ancho / 2, nave.alto / 2);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}
