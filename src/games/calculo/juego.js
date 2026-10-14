/**
 * Taller de Cálculo — juego del portal (contrato `Juego`).
 *
 * Sumas, restas y problemas con MATERIAL para manipular: marcos de diez (1.º–2.º) y recta de saltos (3.º–6.º).
 * El flujo (ayuda que se retira, opciones, pistas, lecciones) vive en `ui/juegoConMaterial.js`; aquí solo está lo propio:
 * qué material se arma para cada pregunta y cuándo se considera terminado.
 */
import { EstadoMarcos, EstadoRecta } from '../../core/material.js';
import { JuegoConMaterial } from '../../ui/juegoConMaterial.js';
import { MarcosDiez } from '../../ui/marcosDiez.js';
import { RectaInteractiva } from '../../ui/rectaInteractiva.js';
import { formatoNumero as F } from '../../core/cifras.js';
import { Partida } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';

export class JuegoCalculo extends JuegoConMaterial {
    static meta = {
        id: 'taller-calculo',
        nombre: 'Taller de Cálculo',
        descripcion: 'Suma y resta con fichas y saltos en la recta. Al principio te ayudamos; cuando ya puedes, lo haces tú.',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    static TITULO = 'Taller de Cálculo';
    static NOMBRES_HABILIDAD = NOMBRES_HABILIDAD;

    crearPartida(contexto) {
        return new Partida({
            grado: contexto.grado || 1,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio,
            colocacion: contexto.colocacion
        });
    }

    crearMaterial(pregunta, avisar) {
        const { material } = pregunta;
        const esSuma = material.operacion === 'suma';
        if (material.tipo === 'marcos') {
            const estado = new EstadoMarcos({ capacidad: material.capacidad, llenas: esSuma ? 0 : material.a });
            return {
                componente: new MarcosDiez({ estado, modo: esSuma ? 'colocar' : 'quitar', alCambiar: avisar }),
                manipula: true,
                abrir: 'Usar fichas',
                consigna: esSuma ? `Pon ${material.a} fichas azules y ${material.b} fichas naranjas.` : `Hay ${material.a} fichas. Tacha ${material.b}: son las que quitas.`,
                terminado: () => {
                    const c = estado.conteo();
                    return esSuma ? c.a === material.a && c.b === material.b : c.tachadas === material.b;
                }
            };
        }
        const estado = new EstadoRecta({ desde: material.desde, saltos: material.saltos, maximo: material.maximo });
        return {
            componente: new RectaInteractiva({ estado, alCambiar: avisar }),
            manipula: true,
            abrir: 'Usar la recta',
            consigna: esSuma ? `Empiezas en ${F(material.a)}. Avanza ${F(material.b)} con saltos.` : `Empiezas en ${F(material.a)}. Retrocede ${F(material.b)} con saltos.`,
            respuesta: () => estado.posicion,
            detalleFallo: (valor) => `Llegaste a ${F(valor)}. `
        };
    }
}
