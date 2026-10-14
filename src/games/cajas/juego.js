/**
 * Cajas y Reparto — juego del portal (contrato `Juego`).
 *
 * Multiplicar como GRUPOS IGUALES y ARREGLOS (cajas con objetos, cuadrículas) y dividir como REPARTIR (platos, residuo).
 * El flujo (ayuda que se retira, opciones, pistas, lecciones) vive en `ui/juegoConMaterial.js`; aquí solo está lo propio:
 * qué material se arma para cada pregunta y cuándo se considera terminado.
 */
import { EstadoGrupos, EstadoCuadricula } from '../../core/material.js';
import { JuegoConMaterial } from '../../ui/juegoConMaterial.js';
import { GruposObjetos } from '../../ui/gruposObjetos.js';
import { Cuadricula } from '../../ui/cuadricula.js';
import { Partida } from './logica/partida.js';
import { NOMBRES_HABILIDAD } from './logica/generadores.js';

export class JuegoCajas extends JuegoConMaterial {
    static meta = {
        id: 'cajas-reparto',
        nombre: 'Cajas y Reparto',
        descripcion: 'Multiplica poniendo objetos en cajas y cuadrículas, y divide repartiendo en platos. Al principio te ayudamos; después lo haces tú.',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    static TITULO = 'Cajas y Reparto';
    static ETIQUETAS_APOYO = { completo: 'Con material', ligero: 'Material opcional', ninguno: 'Sin ayuda' };
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
        if (material.tipo === 'grupos') {
            const estado = new EstadoGrupos({ grupos: material.grupos });
            return {
                componente: new GruposObjetos({ estado, modo: 'construir', contenedor: material.contenedor, cosa: material.cosa, alCambiar: avisar }),
                manipula: true,
                abrir: 'Usar las cajas',
                consigna: `Pon ${material.objetivo} ${material.cosa} en cada ${material.contenedor}.`,
                terminado: () => estado.todosCon(material.objetivo),
                mensajeTerminado: '¡Muy bien! Ahora cuenta todos y elige cuántos hay en total.'
            };
        }
        if (material.tipo === 'reparto') {
            const estado = new EstadoGrupos({ grupos: material.grupos, pool: material.pool });
            return {
                componente: new GruposObjetos({ estado, modo: 'repartir', cosa: material.cosa, alCambiar: avisar }),
                manipula: true,
                abrir: 'Usar los platos',
                consigna: `Reparte los ${material.cosa}: da uno a cada plato, parejo, hasta que ya no alcance para dar a todos.`,
                terminado: () => estado.iguales && estado.pool < material.grupos,
                mensajeTerminado: material.pide === 'sobran' ? '¡Muy bien! Ahora mira cuántos quedaron sin repartir.' : '¡Muy bien! Ahora mira cuántos le tocaron a cada plato.'
            };
        }
        // cuadrícula
        if (material.modo === 'ver') {
            const estado = new EstadoCuadricula({ filas: material.filas, columnas: material.columnas, maxFilas: 12, maxColumnas: 12 });
            return { componente: new Cuadricula({ estado, modo: 'ver', alCambiar: avisar }), manipula: false, consigna: `Mira la cuadrícula: ${material.filas} filas y ${material.columnas} columnas.` };
        }
        if (material.modo === 'completar') {
            const estado = new EstadoCuadricula({ filas: material.filas, columnas: 0, filasFijas: true, maxFilas: 12, maxColumnas: 12 });
            return {
                componente: new Cuadricula({ estado, modo: 'completar', objetivoTotal: material.objetivoTotal, alCambiar: avisar }),
                manipula: true,
                abrir: 'Usar la cuadrícula',
                consigna: `La cuadrícula tiene ${material.filas} filas. Agrega columnas hasta llegar a ${material.objetivoTotal} cuadros.`,
                terminado: () => estado.total() === material.objetivoTotal,
                mensajeTerminado: '¡Muy bien! Ahora mira cuántas columnas pusiste.'
            };
        }
        const estado = new EstadoCuadricula({ maxFilas: 12, maxColumnas: 12 });
        return {
            componente: new Cuadricula({ estado, modo: 'construir', alCambiar: avisar }),
            manipula: true,
            abrir: 'Usar la cuadrícula',
            consigna: `Arma una cuadrícula de ${material.filas} filas y ${material.columnas} columnas.`,
            terminado: () => estado.coincideCon(material.filas, material.columnas),
            mensajeTerminado: '¡Muy bien! Ahora cuenta todos los cuadros y elige cuántos hay.'
        };
    }
}
