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

## Capa de portal (Fase 2)

Patrón **MVC delgado**: el controlador no toca el DOM, la vista no contiene reglas.

| Archivo | Rol |
|---|---|
| `src/main.js` | Compone las piezas (inyección de dependencias) y **registra los juegos**. Para agregar un juego: importarlo y `.registrar(MiJuego)` |
| `src/portal/portal.js` | **Controlador**: decide qué pantalla toca y con qué datos; gestiona perfiles, partida, resultados, modo maestro y CSV. Sin DOM → se prueba en Node |
| `src/portal/vista.js` + `vistas/*.js` | **Vista**: dibuja la pantalla que pide el controlador y le reenvía las acciones. Cada pantalla es una función `(datos, portal) → nodo` |
| `src/ui/dom.js` | `h()` crea DOM **solo con nodos de texto** (nunca `innerHTML` con datos) |
| `src/ui/avatares.js`, `componentes.js` | Avatares SVG, estrellas, íconos, modal accesible, avisos |
| `src/estilos/portal.css` | Tema infantil (tokens, componentes, responsive, `prefers-reduced-motion`) |

Flujo: `iniciar → (crear | perfiles) → inicio → jugando → resultados → inicio…`, más `maestro-pin → maestro`.
Siempre se pregunta "¿quién juega?" al abrir: el equipo lo comparten varios niños.

**Lo que el portal entrega a un juego** (`contexto` en `alMontar`):
`{ grado, perfil, audio, habilidades }` — `habilidades` es la última instantánea guardada del `MotorAdaptativo` de ese
juego para ese niño (o `null`). Si el resultado de `finalizar()` trae `habilidades`, el portal la guarda sola.

**Reglas del portal con los juegos:**
- El resultado se guarda al instante, pero la pantalla cambia en un *microtask*: el juego puede seguir ejecutando su propio
  `finalizar()` y no se destruye "bajo sus pies". → **`finalizar()` debe ser lo último que haga un juego.**
- El portal destruye el juego al terminar, al salir y al abrir otro (nunca hay dos a la vez).
- Si `alMontar` lanza, el niño ve una pantalla de error amable y el juego se limpia.

## Anatomía de un juego (ejemplo: Asteroides, Fase 3)

Un juego se parte en capas; solo la última toca el navegador:

```
src/games/asteroides/
  logica/generadores.js   preguntas por grado × nivel × habilidad        ┐
  logica/distractores.js  errores típicos como respuestas incorrectas    │ lógica PURA: se prueba
  logica/campo.js         cuántos asteroides, velocidad, carriles, poderes│ en Node con generadores
  logica/partida.js       reglas, puntos, rachas, motor adaptativo       ┘ aleatorios sembrados
  dibujo.js               pintar en canvas (sin reglas)
  juego.js                clase `Juego`: une entrada + bucle + HUD + dibujo
  estilos.css             CSS del juego (el build lo une con el del portal)
```

Regla: **si algo se puede probar sin DOM, no vive en `juego.js`.** Los tests de `logica/` verifican la matemática con un evaluador
independiente (no con el mismo código que genera la pregunta).

## Partidas de "una pregunta tras otra" (`core/partidaPreguntas.js`)

Asteroides y Atrapa la Ortografía comparten las MISMAS reglas (10 preguntas, sin vidas, pista y reintento, acertar tras equivocarse da la mitad,
racha, motor adaptativo). En vez de copiarlas, viven en `PartidaPreguntas`; cada juego solo inyecta lo que cambia:

```js
class Partida extends PartidaPreguntas {            // asteroides/logica/partida.js (≈ 15 líneas)
  constructor(...) { super({ grado, habilidades, generar: generarPregunta, preparar: (grado, nivel) => ({ cantidad, velocidad }), ... }); }
}
```
Contrato de una pregunta: `{ habilidad, respuesta (id), textoRespuesta, pista, opciones:[{id, texto}], explicacion? }`. Un juego nuevo de este estilo
(por ejemplo, uno de ciencias) solo necesita un generador de preguntas y su vista.

## Componentes y utilidades del núcleo añadidos en la Fase 6

| Archivo | Qué es |
|---|---|
| `core/tiempo.js` | Matemática pura del tiempo: ángulos de las manecillas, hora ↔ ángulo, 12 h ↔ 24 h, minutos del día, duraciones, la hora dicha con palabras |
| `core/lectura.js` | `tiempoDeLectura(texto)`: cuánto esperar para que un niño lea una explicación (compartido por Ortografía y Reloj) |
| `ui/relojSvg.js` | `RelojSvg`: reloj analógico en SVG, de lectura o **interactivo** (puntero + teclado como `slider`). Solo dibuja y conecta eventos; la geometría está en `core/tiempo.js` |

## Componentes y utilidades del núcleo añadidos en la Fase 7

| Archivo | Qué es |
|---|---|
| `core/fracciones.js` | Aritmética de fracciones **solo con enteros** (mcd, mcm, comparar por multiplicación cruzada, sumar, restar, simplificar, mixtas, centésimas para decimales). Sin punto flotante: 0.1 + 0.2 no existe aquí |
| `ui/fraccionSvg.js` | `figuraFraccion` (barra o pastel, solo lectura), `FiguraPintable` (el niño toca partes; ratón, dedo o teclado como `checkbox`), `fraccionApilada`/`mixtaApilada`/`expresionDom` (numerador sobre denominador en DOM) |

## Añadidos en la Fase 8

| Archivo | Qué es |
|---|---|
| `core/voz.js` | `Voz` (lectura en voz alta con `speechSynthesis`, dependencias inyectadas), `textoParaVoz` ("3/4" → "3 cuartos") y `elegirVoz` (español de América, voces locales primero). `disponible` exige **una voz en español**: si no la hay, la interfaz no muestra botones |
| `portal/vista.js` | `textoALeer`, `observarTexto`: la vista lee el elemento marcado `data-leer` del juego y avisa (MutationObserver) cuando cambia. El controlador (`Portal`) sigue sin tocar el DOM |
| `tests-e2e/` | Pruebas en Chromium real sobre `dist/` (ver [`PRUEBAS.md`](PRUEBAS.md)) |

**Cómo un juego participa en la lectura asistida:** marca su enunciado con `data-leer`. No necesita más.

## Añadidos en la Fase 10 (v0.2)

| Archivo | Qué es |
|---|---|
| `adaptativo/colocacion.js` | Lógica pura de **dónde empezar**: escalera de la misión de inicio (`avanzarEscalon`) y ajuste tras cada partida (`ajustarGradoContenido`) |
| `core/partidaPreguntas.js` | Ahora también: preguntas **recuperadas**, **alivio** (tras 2 falladas seguidas) y **misión de inicio** (`colocacion`) |
| `core/resultado.js` | Estrellas por crédito (aciertos + ½ recuperadas); ver `calcularEstrellas` |
| `core/storage.js` | **Esquema v2**: `perfil.contenido` por juego; primera migración real (`MIGRACIONES[1]`) |
| `portal/portal.js` | `nivelDeInicio` decide qué grado de contenido se le da al juego (contexto `grado`, `colocacion`) y `actualizarGradoContenido` lo ajusta al terminar |

**Contrato nuevo para un juego de preguntas:** declara `static admiteColocacion = true` y pasa `contexto.colocacion` a su `Partida` (que añade `habilidadesDeGrado`). Todo lo demás es del portal.

## Añadidos en la Fase 11 (v0.2): enseñar dentro del juego

| Archivo | Qué es |
|---|---|
| `lecciones/leccion.js` | El **formato** de una lección (`titulo`, `pasos`; cada paso: `texto`, `visual?`, `hazlo?`), su validador y `protegerRespuestas` (el texto de un paso con «hazlo» no puede traer la respuesta) |
| `lecciones/aritmetica.js` | Lecciones con material para suma, resta, multiplicación, división, orden de operaciones, múltiplos y decimales |
| `lecciones/ejemplo.js` | Lección genérica «ejemplo resuelto» para cualquier juego (enunciado, clave, explicación y dibujos de un problema **gemelo**) |
| `lecciones/index.js` | `construirLeccion`: lección propia si existe y es válida; si no, el ejemplo genérico. Nunca lanza |
| `ui/leccion.js`, `ui/visualesLeccion.js` | El diálogo paso a paso (accesible, Escape siempre cierra) y el dibujo del material |
| `ui/ensenanza.js` | Pegamento de cada juego: botón «Ver cómo se hace» y lección de introducción |
| `core/partidaPreguntas.js` | `gemela`, `leccionPara`, `leccionIntro` |
| `portal/portal.js` | `ensenar` (pausa el juego mientras la lección está abierta) y `presentarHabilidad` (introducción una sola vez) |

**Contrato para un juego de preguntas:** su `Partida` puede pasar `leccion: (gemela) => Leccion|null` para una lección propia; sin ella usa el ejemplo genérico. La interfaz del juego solo añade `crearBotonEnsenar`, lo muestra tras un error y llama a `presentarIntro`.

## Añadidos en la Fase 12 (v0.2): música, color y movimiento

| Archivo | Qué es |
|---|---|
| `core/musica.js` | Música **sintetizada** (Web Audio, sin archivos): `componerPista` (melodía pentatónica + bajo + arpegio sobre I–vi–IV–V, determinista por semilla), `eventosEnVentana` (qué notas suenan entre dos instantes, en bucle) y `Musica` (programa las notas unos instantes antes de que toquen). Lógica pura separada del reproductor |
| `core/pegatinas.js` | Catálogo del álbum (30 = 6 dibujos × 5 colores), reglas (1 por partida, 2 con 3 estrellas) y elección sin repetir |
| `core/gestorAudio.js` | Ahora avisa de cada efecto pedido (`alEfecto`), suene o no; nuevos efectos `clic`, `estrella` y `victoria` |
| `ui/mascota.js` | «Chispa» (SVG propio), sus estados y reacciones |
| `ui/confeti.js`, `ui/fondo.js` | Confeti y fondo animado (solo `transform`/`opacity`); la generación es pura y se prueba con números |
| `ui/movimiento.js` | `animacionesPermitidas` (modo ligero + «reducir movimiento») y `pareceEquipoLento` |
| `ui/pegatinas.js`, `portal/vistas/album.js` | Dibujo de las pegatinas y pantalla del álbum |
| `portal/vistas/controles.js` | Botón de música |
| `core/storage.js` | **Esquema v4** (`perfil.pegatinas`) y ajustes del equipo con valores por omisión (`AJUSTES_POR_OMISION`: música permitida, volumen, modo ligero) |

**Patrón clave:** la mascota y el confeti reaccionan a los **efectos de sonido** que ya piden los juegos (`acierto`, `fallo`, `nivel`), así que **ningún juego tuvo que cambiar** para tener mascota. El portal escucha con `audio.alEfecto`.

Regla de dependencias: `ui/` depende de `core/`, nunca de un juego concreto.

## Añadidos en la Fase 13 (v0.2): Taller de Cálculo

| Archivo | Qué es |
|---|---|
| `games/calculo/logica/generadores.js` | Pares de números por grado de contenido (1.º–6.º) y nivel; errores típicos (olvidar la llevada, restar «al revés», operación contraria); problemas con concordancia. Cada opción lleva por `id` su propio valor |
| `games/calculo/logica/apoyo.js` | **Andamiaje que se retira**: `completo → ligero → ninguno`; baja con un acierto a la primera, sube con un error |
| `games/calculo/logica/partida.js` | Subclase de `PartidaPreguntas` que guarda la ayuda **por habilidad** y la lee el generador de cada pregunta; en la misión de inicio no hay ayuda |
| `core/material.js` | Estados puros `EstadoMarcos` y `EstadoRecta` (límites, deshacer, tope de saltos) |
| `ui/marcosDiez.js`, `ui/rectaInteractiva.js` | Solo dibujan el estado y reenvían clics (botones, teclado y toque) |
| `core/distractores.js` | Antes en Asteroides; ahora común (con `maximo` y `excluir`). La ruta antigua reexporta |
| `lecciones/aritmetica.js` | `leccionProblema` (leer, decidir la operación, calcular) |

**Patrón clave:** como el `id` de cada opción es su valor numérico, la recta puede **responder con el número al que llegó el niño** sin pasar por ninguna opción: la misma `partida.responder(id)` sirve para botones y para material.

## Añadidos en la Fase 14 (v0.2): Bloques de Valor

| Archivo | Qué es |
|---|---|
| `games/bloques/logica/generadores.js` | Cinco habilidades (`leer`, `armar`, `posicion`, `llevada`, `prestamo`) por grado de contenido y nivel; el nivel sube por concepto (ceros, una o varias llevadas) |
| `games/bloques/logica/partida.js`, `lecciones/bloques.js` | La partida (subclase de `PartidaConApoyo`) y las lecciones propias, con el cambio «10 por 1» y «1 por 10» explicado columna por columna |
| `core/material.js` → `EstadoBloques` | Estado puro: `juntar`, `separar`, `quitar`, `agregar`, `retirar`, `deshacer`. Invariante probada: cambiar no cambia el valor (`valor() + valorQuitado()` es constante) |
| `ui/bloquesValor.js` | Dibuja el estado y reenvía clics; cuatro modos (`ver`, `construir`, `juntar`, `quitar`) |
| `core/cifras.js` | Antes dentro de Taller de Cálculo: llevadas, préstamos, `contarLlevadas`/`contarPrestamos` y los errores típicos |
| `core/apoyo.js`, `core/partidaConApoyo.js` | El **andamiaje que se retira** subió al núcleo: lo comparten Taller de Cálculo y Bloques de Valor; cada juego solo aporta su generador y su lección |

**Patrón clave:** el estado del material **cuenta lo que el niño hizo** (cuántos bloques hay en cada columna, cuánto quitó) y la pregunta declara qué cuenta como «terminado» (todas las columnas ≤ 9, o lo quitado igual a las cifras del sustraendo). El juego no calcula nada: solo compara estado y objetivo.

## Añadidos en la Fase 15 (v0.2): Cajas y Reparto y el esqueleto de los juegos con material

| Archivo | Qué es |
|---|---|
| `ui/juegoConMaterial.js` | **Esqueleto común** de los tres juegos con material (Taller de Cálculo, Bloques de Valor, Cajas y Reparto): HUD, opciones, pistas, «Ver cómo se hace», la ayuda que se retira y el botón «Listo». Cada juego aporta `crearPartida` y `crearMaterial` (qué material arma y cuándo está «terminado») |
| `estilos/material.css` | El CSS común de esos juegos (antes se repetía por juego) |
| `core/material.js` → `EstadoGrupos`, `EstadoCuadricula` | Estados puros de las cajas/platos (con o sin montón por repartir) y de la cuadrícula (con filas fijas o no). Invariante probada: al repartir, `total + montón` es constante |
| `ui/gruposObjetos.js`, `ui/cuadricula.js` | Dibujan el estado y reenvían clics |
| `games/cajas/logica/*`, `lecciones/cajas.js` | Seis habilidades (`grupos`, `arreglo`, `tabla`, `repartir`, `inversa`, `grande`); la lección del **residuo** es lo único nuevo, el resto reutiliza las de multiplicación y división |

**Patrón clave:** como el tercer juego con material repetía el mismo esqueleto (HUD, opciones, apoyo), se **extrajo al tercero**, no antes. Un juego con material ahora son unas 60 líneas: qué estado se crea, qué componente lo dibuja y cuándo se considera terminado. Los juegos antiguos se migraron al esqueleto y sus pruebas de navegador siguieron pasando sin cambios de lógica.

## Añadidos en la Fase 16 (v0.2.0): registro de equivocaciones comunes

Flujo: **opción con nombre de error → la partida cuenta lo que el niño eligió → el resultado trae conteos → el perfil los acumula → el modo maestro los suma por grupo.**

| Pieza | Qué hace |
|---|---|
| `error:` en las opciones (generadores de Taller, Bloques y Cajas) | La opción **más reveladora** de cada pregunta lleva el nombre del error que representa («olvidó la llevada»). El resto no lleva nombre |
| `core/partidaPreguntas.js` → `contarEquivocacion`, `resultado().errores` | Cuenta **cada** respuesta equivocada con el nombre de su opción (o «otra equivocación»; si lo que se respondió no es una opción, como el número al que llegó la recta) y lo que se **escapa** («se le escapó…»). También en la misión de inicio |
| `core/resultado.js` → `limpiarErrores` | Valida y limpia la lista: **nunca lanza** (los datos de enseñanza no deben impedir guardar la partida), acota el largo de los nombres y cuántas entradas |
| `core/storage.js` (esquema **v5**) | `perfil.errores = { juego: { habilidad: { equivocación: veces } } }`: **solo conteos**. Migración 4→5 y validación del esquema (enteros positivos) |
| `portal/portal.js` → `erroresDelGrupo`, `csvErrores` | Suma las equivocaciones de todos los niños, cuenta cuántos las cometen y las ordena; exporta `equivocaciones.csv` |
| `core/cifras.js` → `formatoNumero` | Subió al núcleo (lo usan Bloques de Valor y el Taller): números de 5 cifras o más con espacio fino |

**Por qué conteos y no un registro de respuestas:** ocupan poco, no guardan más de lo necesario de cada niño y responden la pregunta de enseñanza («qué confunden»). Costo: no se puede reconstruir *cuándo* ni *en qué pregunta exacta* ocurrió cada equivocación.

## Juegos basados en DOM (ejemplo: Memorama, Fase 4)

No todo juego necesita un canvas. El Memorama son botones HTML: el navegador ya da foco, teclado, lectores de pantalla y toque.
Reglas que se siguieron:

- **Se actualizan nodos, no se recrean:** al voltear una carta se cambia `data-estado` y `aria-label` del mismo `<button>`; así el **foco no se pierde**.
- **El tiempo sigue siendo del juego:** las esperas (ver un fallo, pausa entre tableros) usan `core/planificador.js` avanzado por el `BucleJuego`.
  Pausar el bucle pausa las esperas, sin `setTimeout`. El planificador cuenta las tareas encadenadas desde su propio vencimiento (no depende del tamaño del paso).
- **Contenido como datos:** `memorama/logica/contenido.js` solo tiene listas (palabras, sílabas, rimas, sinónimos, antónimos); se puede revisar y ampliar sin tocar reglas.

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
