/**
 * Punto de entrada del portal: arma las piezas (inyección de dependencias) y las conecta.
 * Aquí se REGISTRAN los juegos disponibles: para agregar uno, se importa y se registra.
 */
import { Progreso } from './core/storage.js';
import { GestorAudio } from './core/gestorAudio.js';
import { Voz } from './core/voz.js';
import { Musica } from './core/musica.js';
import { pareceEquipoLento } from './ui/movimiento.js';
import { RegistroJuegos } from './core/registro.js';
import { Portal } from './portal/portal.js';
import { VistaPortal } from './portal/vista.js';
import { JuegoAsteroides } from './games/asteroides/juego.js';
import { JuegoMemorama } from './games/memorama/juego.js';
import { JuegoOrtografia } from './games/ortografia/juego.js';
import { JuegoReloj } from './games/reloj/juego.js';
import { JuegoFracciones } from './games/fracciones/juego.js';

function arrancar() {
    const registro = new RegistroJuegos()
        .registrar(JuegoAsteroides)
        .registrar(JuegoMemorama)
        .registrar(JuegoOrtografia)
        .registrar(JuegoReloj)
        .registrar(JuegoFracciones);

    const vista = new VistaPortal(document.getElementById('app'));
    const audio = new GestorAudio();
    const musica = new Musica(audio);
    const portal = new Portal({
        registro,
        progreso: new Progreso(),
        audio,
        voz: new Voz(),
        musica,
        equipoLento: pareceEquipoLento(),
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
        // La música no suena con la pestaña oculta
        if (document.hidden) musica.pausar(); else if (portal.pantalla !== 'jugando' || !portal.pausado) musica.reanudar();
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
