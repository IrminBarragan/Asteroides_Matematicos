# Arquitectura

Documento vivo. Describe las piezas compartidas (`src/core`, `src/adaptativo`) y cómo encajan los juegos.

## Vista general

```
                    ┌────────────┐
                    │   Portal   │  (Fase 2) perfiles, galería, resultados
                    └─────┬──────┘
          usa             │ crea / monta / pausa / destruye
   ┌──────────────┐  ┌────▼───────────┐   emite 'fin'   ┌────────────┐
   │   Progreso   │  │ RegistroJuegos │◄───────────────│   Juego    │ ← contrato
   │  (storage)   │  └────────────────┘                 └─────┬──────┘
   └──────▲───────┘                                           │ extiende
          │ guarda resultado                       ┌──────────▼──────────┐
          └────────────────────────────────────────│ Asteroides, Memorama │ (Fases 3-7)
                                                   │ Ortografía, Reloj... │
                                                   └──────────┬──────────┘
                                          usan                │
              BucleJuego · EntradaPuntero/Teclado · GestorAudio · BusEventos · MotorAdaptativo
```

Regla de dependencias: **`core` y `adaptativo` no conocen ningún juego ni el portal.** Los juegos dependen de `core`;
el portal depende de `core` y de la interfaz `Juego`, nunca de los detalles de un juego concreto.

## Piezas de `src/core`

| Archivo | Responsabilidad | Decisión clave |
|---|---|---|
| `eventos.js` | `BusEventos` (publicar/suscribir) | Un juego avisa "terminé" sin importar al portal |
| `bucle.js` | `BucleJuego` | **Paso de tiempo fijo**: la lógica avanza a 60 pasos/s sin importar la pantalla (60 Hz, 144 Hz, o una PC lenta a 30 fps) |
| `entrada.js` | `EntradaPuntero`, `EntradaTeclado`, `aCoordenadasLogicas` | **Pointer Events**: un código para mouse, táctil y lápiz; el teclado trabaja por *acciones* |
| `storage.js` | `Progreso` | Varios perfiles por equipo, esquema versionado, nunca lanza al niño si `localStorage` falla |
| `resultado.js` | `calcularEstrellas`, `normalizarResultado` | Forma común del resultado de cualquier juego |
| `juego.js` | `Juego` (contrato), `validarMeta` | Método plantilla: la clase base controla el ciclo de vida |
| `registro.js` | `RegistroJuegos` | El portal pregunta qué juegos hay por grado |
| `gestorAudio.js` | `GestorAudio` | Sonidos sintetizados (sin archivos); `reanudar()` para el gesto del usuario |
| `../adaptativo/motor.js` | `MotorAdaptativo` | Dificultad por *habilidad*, heurística explicable, nunca castiga |

## El contrato de juego

```js
class MiJuego extends Juego {
  static meta = { id: 'mi-juego', nombre: '…', descripcion: '…', area: 'matematicas', grados: [1, 2, 3] };

  alMontar(contenedor, { grado, perfil, audio }) { /* dibuja y arranca */ }
  alPausar() {}  alReanudar() {}
  alDestruir() { /* quita eventos, timers y nodos del DOM */ }

  // dentro del juego, al acabar la partida:
  //   this.finalizar({ aciertos, fallos, tiempoMs })   → el portal recibe el resultado normalizado
}
```

**Ciclo de vida:** `creado → jugando ⇄ pausado → terminado → destruido`. Las transiciones inválidas se ignoran
(pausar un juego ya pausado no hace nada); `destruir()` es idempotente y siempre deja el estado limpio.

**Checklist para cada juego nuevo:**
1. Define `static meta` completo (lo valida el registro).
2. Toda lógica pura (reglas, generación de preguntas) en archivos aparte y con pruebas; la vista solo dibuja.
3. Todo `addEventListener`, `setTimeout`, `requestAnimationFrame` se cancela en `alDestruir()`.
4. El tiempo del juego avanza con el bucle, **nunca** con `setTimeout`/`Date.now()` (así respeta la pausa).
5. Llama a `finalizar()` una sola vez con un resultado válido.

## Persistencia

`localStorage` guarda un único objeto JSON versionado (`VERSION_ESQUEMA`):

```
{ version, ajustes:{sonido, lecturaAsistida}, perfilActivo, siguienteId,
  perfiles:{ [id]:{ id, apodo, avatar, grado, creado, juegos:{[juegoId]:{partidas, mejorPuntaje, mejorEstrellas, ultimaPartida}},
                    habilidades:{[juegoId]: instantánea del MotorAdaptativo} } } }
```

- Datos personales: **solo apodo, avatar y grado**.
- Si el JSON está dañado o no cumple el esquema: se descarta, se guarda copia en `<clave>-danado` y se avisa con `recuperadoDeError`.
- Si el formato cambia: se agrega `MIGRACIONES[n]` (de la versión n a la n+1); no se pierde el progreso.
- Si `localStorage` no existe o está lleno: se sigue en memoria (`guardadoFallido = true` para que la interfaz avise).

## Estrellas y recompensas

- 0 estrellas: sin aciertos · 1: hay aciertos · 2: precisión ≥ 70 % · 3: precisión ≥ 90 %.
- El total de estrellas de un perfil suma la **mejor marca de cada juego**, así repetir el mismo juego no infla el total.
