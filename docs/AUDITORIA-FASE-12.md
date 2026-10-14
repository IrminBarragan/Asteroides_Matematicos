# Auditoría — Fase 12: música y color

Verificación: `pnpm test` (594 pruebas unitarias), `pnpm test:e2e` (pruebas en Chromium real) y `pnpm build`. Plan: [`PLAN-V2.md`](PLAN-V2.md).

## El problema que resuelve

Los niños pidieron **más música y una interfaz más colorida y animada** para que les llame la atención. Con dos restricciones reales: **bocinas** en el aula (30 equipos con música = ruido) y **PCs de hace unos años**.

## Qué se hizo

| Pieza | Qué es |
|---|---|
| **Música de fondo** | Generada en el navegador (sin archivos). Dos pistas: calmada para el menú, más animada para jugar. **Apagada de fábrica** |
| **Ajustes del equipo** (modo maestro) | Permitir la música, elegir el volumen (bajo por omisión) y **modo ligero** |
| **Color por área** | La barra y el fondo del juego toman el color de su área (matemáticas azul, español naranja, medición morado) |
| **Fondo animado** | Formas translúcidas que suben despacio, solo `transform`/`opacity` |
| **Mascota «Chispa»** | Robot entrenador en SVG propio: celebra, anima tras un error, piensa, se duerme en pausa |
| **Confeti** | Al terminar con 2–3 estrellas y al subir de nivel |
| **Álbum de pegatinas** | 30 pegatinas (6 dibujos × 5 colores); una por partida terminada, dos con 3 estrellas; pantalla «Mi álbum» |
| **Efectos nuevos** | `clic`, `estrella`, `victoria` |

## Decisiones de diseño (y por qué)

1. **La música se SINTETIZA, no se descarga.** Funciona sin internet, pesa unos KB y no hay derechos de autor que resolver (meter música «gratis» en un proyecto escolar es un riesgo de licencias). **Costo:** suena a sintetizador sencillo, no a orquesta.
2. **Pentatónica + progresión I–vi–IV–V.** Con la escala de cinco notas (do-re-mi-sol-la) casi cualquier combinación suena bien y **no existen las notas «raras»**; la progresión da una armonía alegre y conocida. La melodía se arma al azar *sembrado* (determinista), con saltos pequeños y cierre en el do. Se **prueba**: 60 semillas por pista, todas las notas pentatónicas, cada compás suma 8 corcheas, sin saltos de más de una octava.
3. **Lógica pura vs. reproductor.** `componerPista` y `eventosEnVentana` no saben de audio ni de tiempo real (se prueban con números); `Musica` solo programa esas notas unos instantes antes de que toquen (técnica del *lookahead scheduler*: `setInterval` impreciso + marca de tiempo exacta del `AudioContext`).
4. **Apagada de fábrica, con dos capas de control.** La maestra **permite** la música en el equipo (con bocinas, un permiso explícito); el niño la **enciende o apaga** con su botón, que solo existe si está permitida. Si la maestra la deshabilita, ningún niño puede encenderla.
5. **La mascota reacciona a los EFECTOS de sonido, no a cada juego.** Los cinco juegos ya piden `acierto`, `fallo` y `nivel`; el portal escucha con `audio.alEfecto` y la mascota/confeti reaccionan **sin cambiar ningún juego**. (`alEfecto` avisa aunque el sonido esté apagado: la mascota no depende del audio.)
6. **La mascota no regaña.** Tras un error dice «¡Casi! Tú puedes.» o «Cada intento enseña algo.»; una prueba falla si alguna frase contiene «mal», «error», «equivocado»… (mutante N17). Y **no habla con cada acierto** (sería ruido); solo anima cuando hace falta y celebra los niveles.
7. **Respeto a la edad y al movimiento.** Es un «entrenador», no un peluche (público de 11–12 años). El movimiento se apaga por **modo ligero**, por **`prefers-reduced-motion`** y de forma **automática** si el equipo parece lento (`navigator.hardwareConcurrency ≤ 2` o `deviceMemory ≤ 2`, **como pista**: no todos los navegadores lo informan).
8. **Solo `transform` y `opacity`** en las animaciones: son las únicas que el navegador resuelve sin recalcular el diseño. Medido en Chromium **sin GPU** con fondo animado y mascota: **60 cuadros por segundo** con 13 animaciones activas.
9. **Pegatinas generadas, no dibujadas a mano.** 6 glifos × 5 colores en SVG; el catálogo, las reglas y la elección (sin repetir) son lógica pura. **Solo suman, nunca se quitan.**
10. **Un esquema de ajustes tolerante.** Los ajustes del equipo se completan con valores por omisión al leerlos (los datos de la v0.1 no traían los nuevos) y un valor de tipo equivocado guardado en disco se ignora (no se confía en `localStorage`). Cuarta migración real: `pegatinas` (v4).

## Defectos encontrados (en mi propio trabajo) y cómo

1. **El cierre de la melodía podía dar un salto de 21 semitonos:** forzaba la última nota al do central aunque la anterior estuviera dos octavas arriba. Lo cazó la prueba «sin saltos enormes»; ahora cierra en el do (de 72 u 84) **más cercano** a la nota anterior.
2. **El texto «false» en la cabecera:** `cabecera.append(..., permitida && boton)` escribe un `false` literal (el `append` nativo no ignora `false`, a diferencia de mi `h()`). Lo vi en la captura de pantalla. Corregido y recordado en un comentario.
3. **«Repetir misión» (Fase 10) desbordaba en móvil** (454 px en 375): no existía una prueba de móvil del modo maestro; la nueva lo cazó. Es un defecto **de la fase anterior** que esta fase descubrió.
4. **El sonido de «terminó la partida» disparaba la reacción de «subió de nivel»:** el portal usaba el efecto `nivel` como fanfarria de resultados. Con el nuevo patrón (la interfaz reacciona a los efectos) habría salido confeti doble. Ahora el efecto de resultados es `victoria` (mismo sonido, otro tipo).
5. **Mis pruebas de portal construían dos `Portal`** (la ayuda `crear()` ya hace uno) y cada uno se suscribía al audio: las reacciones salían duplicadas. Era un defecto de la prueba.
6. **Un mutante equivalente**: la línea que «saltaba» lo que habría sonado durante la pausa al reanudar era redundante (`programarVentana` ya nunca programa en el pasado). Se eliminó el código muerto en vez de «probar» algo inobservable.
7. **Una constante mal dimensionada** (el confeti más lento tardaba 2.8 s y la capa se limpiaba a los 2.6 s): lo vio una prueba.

## Cómo se verificó

- **594 pruebas unitarias** (+61):
  - `musica` (21): teoría (frecuencias, pentatónica), composición determinista en 60 semillas × 2 pistas (notas pentatónicas, compases exactos, saltos, cierre), **ventanas consecutivas sin repetir ni perder notas incluso al dar la vuelta del bucle**, y el reproductor con un `AudioContext` falso (activación, pausa, reanudar sin ráfaga, volumen, atenuar, fanfarria);
  - pegatinas (catálogo, nombres con género, reglas, elección sin repetir hasta completar 30);
  - almacenamiento (migraciones 3→4, ajustes tolerantes, álbum dañado);
  - visuales puros (confeti, fondo, mascota, detección de equipo lento, reducir movimiento);
  - portal: música permitida/apagada/pausa, modo ligero, reacciones por efectos, pegatinas por estrellas (incluido **álbum completo**), confeti según estrellas;
  - **contraste**: título de cada área sobre su color, dibujo de cada pegatina sobre su fondo.
- **Mutaciones (17 cambios deliberados, 17 detectados** tras añadir 2 pruebas y quitar 1 línea redundante): escala con fa, tiempos desfasados, reprogramar notas ya tocadas, sonar sin estar activa o sin permiso, ignorar el equipo lento, pegatinas mal repartidas o repetidas, oyentes que solo avisan con sonido, mascota que no reacciona o que regaña, el modo ligero que no apaga, la pausa que no calla.
- **Navegador real (Chromium, `file://`):** la música **apagada de fábrica no crea ni un oscilador**; permitida, programa notas, se calla con el botón y en pausa, y vuelve al continuar; el color y la mascota cambian por área; al terminar una partida hay pegatinas y confeti según las estrellas y el **álbum se conserva al recargar**; **modo ligero** y **`reducir movimiento`** dejan sin animaciones decorativas ni confeti; rendimiento; móvil sin desborde.

## Conceptos que deberías poder explicar

- Qué es la **escala pentatónica** y por qué suena bien casi sin importar qué notas se elijan.
- Cómo funciona un **lookahead scheduler** y por qué `setInterval` solo no basta para música en tiempo real.
- Por qué la música es **lógica pura + un reproductor delgado**, igual que el resto del proyecto.
- Por qué se anima solo `transform`/`opacity` (composición en la GPU, sin *layout* ni *paint*).
- Qué es `prefers-reduced-motion` y por qué respetarlo es accesibilidad, no un detalle.
- Cómo la mascota reacciona **sin tocar los juegos** (patrón observador sobre los efectos de sonido).

## Cómo revisar (orden sugerido)

1. `src/core/musica.js` y `tests/musica.test.js` (composición, programación, reproductor).
2. `src/portal/portal.js` (sección «Música, mascota y movimiento») y los tests «música:», «modo ligero:», «pegatinas:».
3. `src/estilos/portal.css` (final: «Fase 12») y `src/ui/mascota.js`.
4. **Escucha la música en una de las PCs de la escuela** (ver limitaciones): es lo único que no puedo juzgar yo.

## Limitaciones conocidas (y qué validar en la segunda prueba)

- **No pude escuchar la música.** El entorno no tiene audio: verifiqué *qué notas se programan y cuándo*, no *cómo suena*. **Hay que oírla en la PC y las bocinas reales** (volumen, si la melodía es agradable o cansa, si el timbre «triangle» suena bien en esas bocinas). Si no gusta, es fácil de cambiar: son parámetros en `PISTAS` y `GANANCIA_POR_VOZ`.
- **Solo dos pistas** (menú y juego): puede volverse repetitiva en sesiones largas.
- **El rendimiento se midió en Chromium sin GPU** (60 cuadros/s), no en las PCs de la escuela; el modo ligero existe justamente por eso.
- **La detección de equipo lento es una heurística** (`hardwareConcurrency`/`deviceMemory`): puede equivocarse en ambos sentidos.
- **El álbum no cambia nada del aprendizaje**: es motivación. Si los niños lo ignoran o se obsesionan con coleccionar (jugar sin esforzarse para conseguir pegatinas), habrá que revisarlo: las pegatinas se dan por *terminar con al menos una pregunta resuelta*.
- **La mascota está oculta en pantallas chicas durante el juego** (para no tapar la pantalla) y en modo ligero.
- **Sin efecto de sonido en cada botón** (`clic` existe pero no está conectado: sería ruido con 30 equipos).
- **La voz y la música no se mezclan con inteligencia**: la música solo baja un momento al hablar el sistema; no hay *ducking* fino.
- **Sin accesibilidad especial para la música** más allá de su botón (`aria-pressed`) y de poder apagarla del todo.
