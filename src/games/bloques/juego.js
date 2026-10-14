/**
 * Bloques de Valor — juego del portal (contrato `Juego`).
 *
 * Valor posicional y llevadas con BLOQUES: se leen y se arman números por columnas, y las sumas y restas se hacen
 * cambiando «10 por 1» (llevada) y «1 por 10» (préstamo). El flujo (ayuda que se retira, opciones, pistas, lecciones)
 * vive en `ui/juegoConMaterial.js`. Al LEER un número los bloques son la pregunta misma, así que siempre se ven.
 */
import { EstadoBloques } from '../../core/material.js';
import { JuegoConMaterial } from '../../ui/juegoConMaterial.js';
import { BloquesValor } from '../../ui/bloquesValor.js';
import { Partida } from './logica/partida.js';
import { NOMBRES_HABILIDAD, descomposicionEnPalabras } from './logica/generadores.js';

export class JuegoBloques extends JuegoConMaterial {
    static meta = {
        id: 'bloques-valor',
        nombre: 'Bloques de Valor',
        descripcion: 'Lee y arma números con bloques y descubre por qué se «lleva» al sumar y se «pide prestado» al restar.',
        area: 'matematicas',
        grados: [1, 2, 3, 4, 5, 6]
    };

    static TITULO = 'Bloques de Valor';
    static ETIQUETAS_APOYO = { completo: 'Con bloques', ligero: 'Bloques opcionales', ninguno: 'Sin ayuda' };
    static NOMBRES_HABILIDAD = NOMBRES_HABILIDAD;
    static TEXTO_ABRIR = 'Usar bloques';
    static TEXTO_PRIMERA = 'Usa los bloques para encontrar la respuesta.';

    crearPartida(contexto) {
        return new Partida({
            grado: contexto.grado || 1,
            habilidadesGuardadas: contexto.habilidades,
            aleatorio: this.aleatorio,
            colocacion: contexto.colocacion
        });
    }

    consigna(material) {
        if (material.modo === 'construir') return `Construye con bloques: ${descomposicionEnPalabras(Number(material.objetivo.slice().reverse().join('')))}.`;
        if (material.modo === 'juntar') return `Junta los bloques de ${material.a} y de ${material.b}. Si una columna llega a 10 o más, cámbialos con «10 → 1».`;
        if (material.modo === 'quitar') return `Están los bloques de ${material.a}. Quita ${material.b}; si no alcanzan, cambia 1 por 10 con «1 → 10».`;
        return '';
    }

    crearMaterial(pregunta, avisar) {
        const { material } = pregunta;
        const estado = new EstadoBloques({ columnas: material.columnas, inicial: material.cuenta });
        const terminado = {
            construir: () => estado.coincideCon(material.objetivo),
            juntar: () => estado.normalizado,
            quitar: () => estado.quitoExactamente(material.quitar)
        }[material.modo];
        return {
            componente: new BloquesValor({ estado, modo: material.modo, alCambiar: avisar }),
            manipula: material.modo !== 'ver',
            abrir: 'Usar bloques',
            consigna: this.consigna(material),
            terminado,
            mensajeTerminado: material.modo === 'construir' ? '¡Muy bien! Ahora di qué número armaste.' : undefined
        };
    }
}
