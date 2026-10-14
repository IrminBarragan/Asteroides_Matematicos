# Auditoría — Fase 11: enseñar dentro de cada juego

Verificación: `pnpm test` (533 pruebas unitarias), `pnpm test:e2e` (33 pruebas en Chromium real, todas pasan) y `pnpm build`. Plan: [`PLAN-V2.md`](PLAN-V2.md).

## El problema que resuelve

La queja principal de la prueba con niños de 6.º fue: **«no se enseña, solo se evalúa»**. Hasta la Fase 10 la ayuda era una pista de una línea *después* de fallar. Esta fase hace que el juego **enseñe en el momento en que el niño lo necesita**, sin sacarlo del juego.

## Qué se hizo

### 1. «Ver cómo se hace» (tras equivocarse)
Después del primer error de una pregunta aparece un botón **«Ver cómo se hace»**. Abre una **lección paso a paso** con un **ejemplo resuelto parecido** (otra pregunta de la misma habilidad, con otros datos) y, en los pasos clave, un **«Ahora tú»**: el niño hace el paso él mismo antes de seguir. Al cerrarla, el niño vuelve **a su misma pregunta**.

### 2. Introducción de cada habilidad nueva
La **primera vez** que aparece una habilidad (en una partida normal; **no** en la misión de inicio, donde se mide) se muestra su lección de introducción, **omitible**. No se repite.

### 3. Dos tipos de lección
| Tipo | Dónde | Qué trae |
|---|---|---|
| **Lección propia con material** | Asteroides (suma, resta, multiplicación, división, orden de operaciones, múltiplos, decimales) | Bloques de decenas y unidades, recta numérica con saltos, grupos de objetos, operación en columnas; la estrategia depende del tamaño (completar 10, por partes, por columnas con llevadas/préstamo, dividir por trozos) |
| **Ejemplo resuelto genérico** | Todos los demás (Fracciones, Reloj, Ortografía, y respaldo de los anteriores) | El problema gemelo con sus dibujos (figuras de fracciones, relojes, opciones), «La clave» (la pista) y «Así se resuelve» (la explicación) |

### 4. Piezas nuevas
- `src/lecciones/` (lógica pura, sin DOM): formato de lección y su validador, lecciones de aritmética, ejemplo genérico.
- `src/ui/leccion.js` y `src/ui/visualesLeccion.js`: el diálogo accesible y el dibujo del material (SVG/DOM propios).
- `src/ui/ensenanza.js`: el pegamento de cada juego (botón, introducción).
- `core/partidaPreguntas.js`: pregunta **gemela**, `leccionPara`, `leccionIntro`.
- `portal/portal.js`: `ensenar` y `presentarHabilidad` (pausan el juego mientras la lección está abierta).
- Almacenamiento **v3**: `perfil.lecciones` cuenta cuántas veces vio el niño la lección de cada habilidad (segunda migración real).

## Decisiones de diseño (y por qué)

1. **La lección es datos, no código.** Una lección es una lista de pasos (`texto`, `visual`, `hazlo`); la pantalla sabe dibujar cada tipo. Así *qué* se enseña (probado con Node) está separado de *cómo* se ve (probado en el navegador), y escribir una lección nueva es escribir una lista.
2. **El ejemplo es un problema GEMELO, no el del niño.** Mostrar la solución de la pregunta que tiene delante le regala la respuesta y no enseña; un **ejemplo resuelto con otros datos** ("efecto del ejemplo resuelto", de la psicología del aprendizaje) sí. La gemela se genera con el mismo generador un nivel más fácil y se garantiza que no sea la misma pregunta (prueba + mutante L9).
3. **«Hazlo tú» = el niño hace el paso, pero el texto no trae la respuesta.** Mi primera versión mostraba «Primero sumamos las decenas: 40 + 20 = 60» y *después* preguntaba «40 + 20 = ?»: el ejercicio ya venía resuelto. `protegerRespuestas` quita la ecuación del texto del paso y la guarda como explicación que se muestra **después** de acertar. Hay una prueba que falla si algún texto trae la respuesta de su propio «hazlo».
4. **Enseñar sin pelearse con el tiempo real.** El portal **pausa el juego** mientras la lección está abierta (Asteroides tiene asteroides cayendo): usa el mismo mecanismo de pausa, y la lección puede pedirse durante el montaje del juego (la pausa se difiere un instante, hasta que el juego está «jugando»).
5. **El niño nunca queda atrapado:** «Cerrar» y Escape siempre cierran; la introducción es **omitible** desde el primer paso y saltarla cuenta como vista (no se insiste).
6. **Todo hazlo es «a ○ b = ?».** Así las pruebas **recalculan** cada respuesta por su cuenta (no se valida el código con el propio código) y las opciones erróneas son vecinos que corresponden a errores típicos (uno más/menos, una decena más/menos).
7. **Una lección rota se descarta, no se muestra:** `construirLeccion` valida la lección propia y, si falla o devuelve nada, usa el ejemplo genérico. Nunca lanza dentro de una partida.
8. **Tono para 11–12 años:** sin personajes ni voz infantil; lenguaje directo («Con números grandes sumamos por columnas…»).

## Defectos encontrados (en mi propio trabajo) y cómo

1. **El «hazlo tú» ya venía resuelto en el texto** (decisión 3): lo vi en la captura del navegador, no en las pruebas; ahora hay prueba y mutante (L8).
2. **La lección «dividir ≤ 60» preguntaba un dato que el paso anterior ya mostraba** (el dividendo): se reformuló como «comprobar el reparto». Sigue siendo la menos informativa; se anota en limitaciones.
3. **Hazlo de la tabla del 5 filtraba su respuesta** en la frase «= 20 + 8»: lo detectó la prueba de filtración.
4. **Lección propia inválida se mostraba** (primera versión de `construirLeccion`): una prueba lo hizo lanzar; ahora se valida *dentro* del `try`.
5. **Mi harness de capturas usaba un CSS viejo** (`dist/` sin reconstruir): los bloques salían negros. No era el código, pero casi me hace «corregir» algo que no estaba roto.
6. **Primera prueba de navegador mal planteada:** una pregunta de «pintar» no tiene botones; el juego-prueba esperaba opciones.

## Cómo se verificó

- **533 pruebas unitarias** (+40 respecto a la Fase 10):
  - formato de lección y `protegerRespuestas`; opciones del «hazlo» (todas las respuestas 0–300, con pasos 1/5/10);
  - funciones de apoyo **recalculadas aparte**: `columnasSuma/Resta` reconstruyen a ± b en 400 pares cada una, `partesPosicionales`, `trozosDivision`;
  - **cada lección de aritmética con los datos reales de Asteroides** (todos los grados y niveles, 150 muestras por habilidad): cada «hazlo» recalculado, ninguna respuesta filtrada en el texto, el resultado correcto al final;
  - las **4 partidas reales** con 40 semillas × 6 preguntas: la lección es válida y la gemela distinta; la introducción es estable;
  - portal: introducción única, saltar cuenta como vista, pausa/reanuda (también durante el montaje), no reanuda si el niño ya pausó, no se abren dos a la vez, salir antes de que se muestre, voz;
  - almacenamiento: migración 1→2→3 y datos dañados.
- **Mutaciones (14 cambios deliberados, 14 detectados):** unidades/decenas/resto mal sumados, préstamo no marcado, llevada ignorada, trozos con `ceil`, descomposición del factor equivocado, `protegerRespuestas` anulada, gemela igual a la original, introducción que se repite siempre, juego que no se reanuda o no se pausa, contador de lecciones siempre 1, lección propia sin validar.
- **Navegador real (Chromium, `file://`):**
  - las **18 lecciones** de muestra (aritmética propia + ejemplos de Fracciones, Reloj y Ortografía) se recorren **completas** resolviendo cada «hazlo» probando opciones, con **0 errores de consola**, y se revisaron las capturas;
  - **flujo real:** perfil de 6.º → misión (sin lecciones) → «Jugar otra vez» → aparece la introducción («Antes de empezar: …») omitible → «Entendido» → la introducción **no se repite** en la misma partida; tras fallar aparece «Ver cómo se hace», abre el ejemplo, Escape lo cierra y la **misma pregunta** sigue ahí; en Asteroides (2.º) un asteroide que se escapa ofrece la lección con material y no se puede avanzar sin resolver el «hazlo»; «Escuchar» lee el paso con palabras; en móvil (375×667) el diálogo cabe y no desborda.

## Conceptos que deberías poder explicar

- Qué es el **efecto del ejemplo resuelto** y por qué un ejemplo *gemelo* enseña y la solución del propio problema no.
- Por qué el texto de un paso con «hazlo» **no puede** traer la respuesta (y cómo lo garantiza `protegerRespuestas` + una prueba).
- Por qué la lección es **datos** y la pantalla la interpreta.
- Cómo se pausa el juego durante una lección, y por qué hay que **diferir la pausa** si se pide al montar (`montar` pone el estado «jugando» *después* de `alMontar`).
- Qué es un **«hazlo tú»** y por qué todos tienen la forma `a ○ b = ?` (verificables de forma independiente).
- Por qué una lección inválida **no se muestra** (robustez frente al niño).

## Cómo revisar (orden sugerido)

1. `src/lecciones/leccion.js` (formato, `protegerRespuestas`) y `tests/lecciones.test.js` (cómo se verifica sin usar el código bajo prueba).
2. `src/lecciones/aritmetica.js` (**el contenido: pide a una maestra o maestro que lo lea**: ¿explica como ella explicaría? ¿«llevamos», «pedimos prestado», «por partes» son los términos que usa?).
3. `src/core/partidaPreguntas.js` (gemela, `leccionPara`, `leccionIntro`) y `src/portal/portal.js` (`ensenar`, `presentarHabilidad`).
4. `src/ui/leccion.js` y `src/ui/visualesLeccion.js` (diálogo y dibujos).

## Limitaciones conocidas (y qué validar en la segunda prueba)

- **No se ha probado con niños:** que las lecciones *enseñen* es una hipótesis. Observar: ¿abren «Ver cómo se hace»? ¿leen o saltan? ¿aciertan más después de verla? (La cuenta `perfil.lecciones` ya guarda cuántas veces vio cada una; falta mostrarla en el modo maestro.)
- **El material no se manipula arrastrando:** el «hazlo tú» es elegir entre opciones. El material arrastrable (bloques que se agrupan, objetos que se reparten) queda para los juegos nuevos de las fases 13–15.
- **Fracciones, Reloj y Ortografía usan el ejemplo genérico**, que es una lectura guiada de la pista y la explicación existentes: útil, pero **menos rico** que las lecciones propias de aritmética (no hay material interactivo para sumar fracciones, ni un reloj que se mueva).
- **La lección de «dividir ≤ 60» es la más floja:** su «hazlo» comprueba el reparto (multiplicar) en vez de descubrirlo.
- **No hay «andamiaje que se retira»** (ayudas visuales que desaparecen cuando acierta): estaba en el plan de la fase y **no se hizo**; pasa a las fases de juegos nuevos.
- **No hay aviso «vamos más despacio»** del modo tranquilo (pendiente de la Fase 10).
- La **introducción se muestra por habilidad, una sola vez** (no al subir de nivel dentro de la misma habilidad); en aritmética subir de nivel solo cambia el tamaño de los números, no el concepto.
- Las lecciones **no se muestran durante la misión de inicio** (decisión: ahí se mide).
- **Memorama** no tiene lecciones (no usa preguntas por grado).
- La lección de **orden de operaciones** muestra la regla general pero solo calcula el ejemplo gemelo, no discute por qué existe la convención.
