/**
 * Punto de entrada del portal: arma las piezas (inyección de dependencias) y las conecta.
 * Aquí se REGISTRAN los juegos disponibles: para agregar uno, se importa y se registra.
 */
import { Progreso } from './core/storage.js';
import { GestorAudio } from './core/gestorAudio.js';
import { RegistroJuegos } from './core/registro.js';
import { Portal } from './portal/portal.js';
import { VistaPortal } from './portal/vista.js';
import { JuegoAsteroides } from './games/asteroides/juego.js';
import { JuegoMemorama } from './games/memorama/juego.js';
import { JuegoOrtografia } from './games/ortografia/juego.js';

function arrancar() {
    const registro = new RegistroJuegos()
        .registrar(JuegoAsteroides)
        .registrar(JuegoMemorama)
        .registrar(JuegoOrtografia);

    const vista = new VistaPortal(document.getElementById('app'));
    const portal = new Portal({
        registro,
        progreso: new Progreso(),
        audio: new GestorAudio(),
        vista
    });
    vista.conectar(portal);

    // Escape: pausa/reanuda la partida (los diálogos manejan su propio Escape)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && portal.pantalla === 'jugando' && !document.querySelector('.modal-fondo')) {
            portal.alternarPausa();
        }
    });
    // Si la pestaña queda oculta, la partida se pausa sola
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && portal.pantalla === 'jugando') portal.pausarJuego();
    });
    // Un error inesperado no debe dejar al niño con una pantalla rota sin explicación
    window.addEventListener('error', (e) => {
        console.error('Error no controlado:', e.error || e.message);
        vista.aviso('Algo no salió como esperábamos.', 'error');
    });

    portal.iniciar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
} else {
    arrancar();
}
