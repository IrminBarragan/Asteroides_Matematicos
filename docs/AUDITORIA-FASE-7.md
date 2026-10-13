# Auditoría — Fase 7: Tren de Fracciones

Verificación: `pnpm test` (386 pruebas) y `pnpm build`. Componentes nuevos: [`ARQUITECTURA.md`](ARQUITECTURA.md#componentes-y-utilidades-del-núcleo-añadidos-en-la-fase-7).

## Qué se hizo

Quinto juego del portal (3.º a 6.º). Cada pregunta es una **figura** (barra o pastel) o una **operación con fracciones apiladas** (numerador sobre denominador).
Sin cronómetro ni vidas: equivocarse da una pista y se puede reintentar; al acertar se explica la regla. El avance de la partida se ve como un **tren que suma vagones**.

| Grado | Habilidades | Qué hace el niño |
|---|---|---|
| 3.º | `identificar`, `pintar`, `comparar-visual` | Dice qué fracción está pintada; **pinta** una fracción tocando partes; compara dos barras |
| 4.º | `identificar`, `equivalentes`, `comparar` | Equivalentes (elegir, o "¿qué número falta?"); compara fracciones, incluso pares equivalentes ("Son iguales") |
| 5.º | `equivalentes`, `simplificar`, `suma-resta`, `comparar` | Simplifica; suma y resta con **mismo denominador** y luego **múltiplos** (1/2 + 1/4) |
| 6.º | `suma-resta`, `mixtas`, `decimales`, `simplificar` | Suma y resta con **cualquier denominador** (mcm); impropia ↔ mixto; fracción ↔ decimal |

Cada habilidad tiene 3 niveles que decide el motor adaptativo (denominadores mayores, factores de equivalencia más grandes, modos de comparación más sutiles).

## Decisiones de diseño

### 1. Aritmética con enteros, nunca con decimales (`core/fracciones.js`)
En JavaScript `0.1 + 0.2 = 0.30000000000000004`. Comparar `1/3` con `0.333…` en flotante daría resultados falsos. Todo se hace con **multiplicación cruzada** (`a/b < c/d ⇔ a·d < c·b`, válido porque los denominadores son positivos) y **mcm** para sumar.
Los decimales se manejan como **centésimas enteras** (3/4 → 75 → "0.75"), y solo existen cuando el denominador divide a 100; si no, `centesimas()` devuelve `null` en vez de inventar un decimal periódico.

### 2. Cada respuesta se verifica en las pruebas con un cálculo independiente
Las pruebas **no** usan `core/fracciones.js` para comprobar al generador (validar al código con él mismo no prueba nada): recalculan con su propio `mcd` y multiplicación cruzada a partir de lo que el niño ve (los operandos de la pantalla).
Ejemplo: de `2/3 + 1/4` se calcula `(2·4 + 1·3)/(3·4) = 11/12` aparte y se exige que la opción correcta sea equivalente y esté simplificada, y que **ningún error sea equivalente**.

### 3. Un distractor nunca puede ser también correcto
En fracciones es fácil de violar: si pregunto "¿cuál es equivalente a 1/2?" y ofrezco 2/4 como error, el niño tiene razón y el juego está mal. Por eso `elegirFracciones` descarta todo error equivalente a la respuesta.
**Excepción deliberada: `simplificar`.** Ahí 6/8 (equivalente a 3/4 pero reducible) **sí** es un error valioso ("simplificó a medias" o "no simplificó"); la prueba exige que todo equivalente ofrecido como error no esté simplificado, y que aparezcan simplificaciones "a medias".

### 4. Los errores ofrecidos son los errores reales de los niños
| Habilidad | Error clásico que se ofrece |
|---|---|
| suma | **1/2 + 1/3 = 2/5** (sumar numeradores y denominadores) |
| equivalentes | **sumar** el mismo número arriba y abajo (1/2 → 3/4) en vez de multiplicar |
| identificar | Contar las partes **no** pintadas (3/4 → 1/4); "pintadas contra no pintadas" (3/1) |
| mixtas | Olvidar multiplicar el entero por el denominador (2 3/4 → 5/4) |
| decimales | **Pegar** numerador y denominador (3/4 → 3.4), correr el punto |
| simplificar | Dividir solo el numerador, o solo el denominador |

### 5. Un entero se escribe "1", no "1/1"
Mi primera versión mostraba `2/3 + 1/3 = 1/1`. Ahora (`fmt`) un entero se escribe sin "/1" en botones, explicaciones y respuestas; una prueba exige que ninguna opción ni explicación contenga "/1".

### 6. La figura es interactiva sin canvas
`FiguraPintable` son elementos SVG con `role="checkbox"`, `tabindex` y teclado (Espacio/Enter). El clic funciona igual con ratón y con el dedo (el navegador sintetiza el `click` del toque), así que no se necesita lógica de punteros propia como en el reloj.
La respuesta de "pintar" es **cuántas** partes hay que pintar (no cuáles: pintar las partes 1-2-3 o 2-3-4 de 3/4 es igual de correcto).

### 7. Accesibilidad (con una limitación inherente)
Las fracciones apiladas llevan `aria-label` ("3 sobre 4") y los botones de respuesta también. **Limitación honesta:** como en el reloj, las figuras de las preguntas de lectura **no** anuncian la fracción (sería regalar la respuesta), así que *identificar* y *comparar-visual* no son accesibles para personas ciegas y la etiqueta lo dice.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **Prueba mal planteada:** `assert.equal(comparar(a,b), -comparar(b,a))` falla con `0` y `-0` (`Object.is` los distingue). El código era correcto; se cambió a `comparar(a,b) + comparar(b,a) === 0`.
2. **No alcanzaban 3 errores distintos** en mixtas con denominador 2 (solo hay un residuo posible: 1/2): las pruebas lo cazaron; el relleno ahora varía el entero en un rango mayor.
3. **La pista de decimales regalaba la respuesta** ("0.75 = 75/100"): la prueba "la pista nunca regala la respuesta" lo detectó, porque 3/4 podía salir como pregunta. La pista ya no lleva ejemplos numéricos.
4. **"1/1" como resultado** (decisión 5), visible al revisar capturas del navegador.
5. **Pastel descentrado** en la figura de pintar (visto en la captura, no en las pruebas): `margin: 0 auto` en el SVG.

## Cómo se verificó

- **386 pruebas**: `core/fracciones.js` (propiedades: mcd·mcm = a·b, simplificar idempotente, comparar contra el signo de n₁d₂ − n₂d₁, sumas y restas verificadas sin mcm, 1/2 + 1/3 ≠ 2/5, ida y vuelta mixta/impropia y centésimas/decimal en 0..1000) y generadores (decisiones 2 y 3).
- **1 680 000 preguntas generadas** (todas las combinaciones de grado, habilidad, nivel y 3/4 opciones): **0 errores, 0 opciones repetidas, siempre existe la respuesta**.
- **Mutaciones** (9 cambios deliberados: quitar el filtro de equivalentes, permitir n = d en fracciones "propias", invertir mayor/menor, respuesta de "falta el número" desplazada, operación cruzada suma↔resta, quitar el límite de 5.º, `comparar` con `<=`…): sobrevivía 1 real (fracciones propias) → se añadió una prueba y ya se detecta; otros 2 son **mutantes equivalentes** (cambian código que nunca altera la salida visible: un "relleno" de respaldo que casi nunca se usa y un candidato que se descarta por ser igual a la respuesta).
- **Navegador real (Chromium, `file://`):** las 10 modalidades con captura; **pintar con ratón** (error con "Pintaste 4 partes" + pista, corregir, acierto), **con teclado** (Espacio/Enter marcan partes, `aria-checked`) y **con el dedo**; opciones con error → pista → acierto; la explicación se lee y la partida avanza sola con el tiempo de juego; **la pausa congela el avance**; 0 errores de consola.

## Conceptos que deberías poder explicar

- Por qué se compara por multiplicación cruzada y por qué es válida (denominadores positivos) y qué pasaría con flotantes.
- Por qué el mcm (y no cualquier denominador común) para sumar, y por qué el resultado se simplifica con el mcd.
- Qué es un mutante equivalente y por qué no todo mutante superviviente es una prueba que falta.
- Por qué la prueba recalcula la respuesta **sin** el código que prueba.
- La excepción de `simplificar` a la regla "ningún distractor equivalente".
- Por qué "pintar" evalúa la **cantidad** de partes y no cuáles.

## Cómo revisar (orden sugerido)

1. `src/core/fracciones.js` y `tests/fracciones.test.js` (la matemática; lo más importante).
2. `tests/fracciones-logica.test.js` (cómo se verifica sin usar el código bajo prueba).
3. `src/games/fracciones/logica/generadores.js` (qué se pregunta en cada grado y nivel). **Pide a una maestra o maestro que revise** `DENOMINADORES`, `MODOS_COMPARAR`, `MODOS_SUMA`, `FACTORES`, `SIMPLIFICAR`, `MIXTAS` y el lenguaje ("2 cuartos", "3 entre 12").
4. `src/ui/fraccionSvg.js` y `src/games/fracciones/juego.js`.

## Limitaciones conocidas

- **Sin multiplicación ni división de fracciones**, ni comparación de decimales entre sí: quedan fuera del alcance de esta fase.
- Solo fracciones **propias** en comparar/suma (las impropias aparecen en resultados y en mixtas).
- Los decimales se limitan a 2 cifras (denominadores que dividen a 100); 1/3 = 0.333… no se pregunta.
- Las figuras de lectura no son accesibles para lectores de pantalla (punto 7).
- Con 3 opciones (nivel 1) acertar al azar es 33 %; el motor sube el nivel solo con ≥ 85 % de dominio sostenido.
- "Son iguales" aparece como tercera opción siempre en *comparar*, aunque nunca sea la correcta en los niveles iniciales: es deliberado (no delata la respuesta), pero un niño pequeño puede confundirse.
- Las pruebas de navegador siguen siendo guiones fuera del repositorio; la **Fase 8** las automatiza.
