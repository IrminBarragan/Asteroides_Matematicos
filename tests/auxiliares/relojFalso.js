/**
 * requestAnimationFrame falso con reloj manual: permite simular monitores de 60 o 144 Hz
 * de forma determinista (sin esperar tiempo real).
 */
export function crearRelojFalso(inicio = 1000) {
    let tiempo = inicio;
    let siguienteId = 0;
    const cola = new Map();
    return {
        raf(funcion) {
            siguienteId++;
            cola.set(siguienteId, funcion);
            return siguienteId;
        },
        caf(id) {
            cola.delete(id);
        },
        pendientes: () => cola.size,
        /** Avanza `ms` milisegundos entregando un cuadro cada 1000/hz ms. */
        avanzar(ms, hz = 60) {
            const paso = 1000 / hz;
            const fin = tiempo + ms;
            while (tiempo + paso <= fin + 1e-9) {
                tiempo += paso;
                const pendientes = [...cola.entries()];
                cola.clear();
                for (const [, funcion] of pendientes) funcion(tiempo);
            }
        },
        /** Salta el reloj sin entregar cuadros (simula pestaña oculta / equipo congelado). */
        saltar(ms) {
            tiempo += ms;
        }
    };
}
