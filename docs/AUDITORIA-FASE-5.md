# Auditoría — Fase 5: Atrapa la Ortografía

Verificación: `pnpm test` (294 pruebas) y `pnpm build`. Reglas de partida compartidas: [`ARQUITECTURA.md`](ARQUITECTURA.md#partidas-de-una-pregunta-tras-otra-corepartidapreguntasjs).

## Qué se hizo

Tercer juego del portal (3.º a 6.º). Una pregunta arriba y 2–3 palabras en burbujas que **caen** hacia el pasto; hay que tocar la correcta.
Si se equivoca: **pista** y puede reintentar. Al acertar —o si la palabra se escapa— se **explica la regla** y hay tiempo para leerla (o un botón "Siguiente").
Las palabras son **botones reales**: toque, ratón, teclado (Tab, ← →, Enter, o los números 1–3) y lectores de pantalla.

| Grado | Habilidades | Ejemplo |
|---|---|---|
| 3.º | `b-v`, `g-j`, `h` | `livro` / **libro** · `ánjel` / **ángel** · `hoso` / **oso** |
| 4.º | `b-v`, `g-j`, `c-s-z`, `ll-y` | `felis` / **feliz** · `caye` / **calle** |
| 5.º | `acentuacion`, `c-s-z`, `ll-y`, `h` | `camion` / **camión** / `cámion` |
| 6.º | `homofonos`, `diacriticos`, `porques`, `acentuacion` | «El agua pasa por el ___» → tubo / tuvo · «___ casa es grande» → Mi / Mí · «¿___ no viniste?» → Por qué |

Contenido (en `logica/contenido.js`): **226 palabras** (171 de b/v, g/j, h, c/s/z, ll/y + 55 de acentuación con sílabas y tónica) y **47 ejercicios de oración**
(23 homófonos, 16 tilde diacrítica, 8 porque/por qué), cada uno con su explicación. Cada habilidad tiene 3 niveles de dificultad que decide el motor adaptativo.

## Decisiones de diseño

### 1. Los errores se GENERAN por regla, no se escriben a mano
Para `libro` el juego produce `livro` aplicando "cambiar b↔v"; para `camión`, `camion` / `cámion` / `cancíon`… (quitar la tilde o moverla). Ventajas: menos datos que revisar y todo error sigue
exactamente la regla que se enseña. **Riesgo y cómo se controla:** un cambio de letra puede producir *otra palabra real* (`vaca`→`baca`, `médico`→`medico`). Por eso hay una lista de
`PALABRAS_VALIDAS_QUE_NO_SON_ERROR` y una prueba comprueba, para **cada palabra y cada error posible**, que ninguno sea una palabra real ni otra correcta del juego.
**Alternativa descartada:** escribir cada par correcto/incorrecto a mano (≈ 400 cadenas que revisar, y más fácil colar errores).

### 2. Cada error cambia SOLO lo que la regla enseña
Pruebas por regla: b/v solo cambia b↔v; g/j solo **delante de e, i** (`ga`/`jo` suenan distinto: no son una confusión real); c/s/z solo donde suenan igual (la «c» solo antes de e, i);
h nunca toca la «ch»; ll/y no toca la «y» final (`hoy`, `rey`). Cada regla se prueba **con palabras inventadas** (no solo con las listas), porque las listas reales pueden no incluir el caso límite.

### 3. La acentuación se deduce de la regla, no se memoriza
Cada palabra guarda sus **sílabas y cuál es la tónica**; de ahí se calcula si es aguda, grave o esdrújula y si **debe** llevar tilde. Una prueba exige que la palabra escrita en el contenido sea
**coherente con esa regla** (tilde exactamente en la sílaba tónica y solo cuando corresponde). Así la explicación ("es grave y NO termina en n, s ni vocal: por eso lleva tilde") nunca enseña algo falso.

### 4. Pista vs. explicación
La **pista** (tras un error) orienta sin dar la respuesta; la **explicación** (tras acertar o si se escapa) la da completa. Una prueba verifica que ninguna pista nombre la palabra correcta. Si la regla de una
palabra la nombra (`vivir lleva v`), se usa una pista genérica y la regla va en la explicación.

### 5. Tiempo para leer, sin presión
Una explicación de 120 caracteres no se lee en 2 s. El avance automático espera un tiempo **proporcional al texto** (2.4–9 s) y hay un botón **"Siguiente"** para quien termina antes. Las palabras
caen más despacio a los grados menores (≈ 20 s en cruzar en 3.º, 15 s en 6.º). En el nivel 1 hay 2 opciones y desde el 2 hay 3.

### 6. Reutilización: `PartidaPreguntas`
Las reglas de partida (10 preguntas, sin vidas, puntos, racha, motor) eran idénticas a las de Asteroides. Se **extrajeron al núcleo** (`core/partidaPreguntas.js`); `asteroides/logica/partida.js` pasó a ser una subclase de ~15 líneas.
Las 17 pruebas de la partida de Asteroides (`tests/partida.test.js`) siguieron pasando sin modificarse: es la prueba de que el refactor no cambió su comportamiento.

## Defectos que las pruebas encontraron en mi propio trabajo (sin esta verificación habrían llegado al niño)

1. **Dato erróneo:** puse `hojo` (que no existe) en la lista de palabras reales; eso dejaba a `ojo` sin ningún error posible.
2. **Error absurdo generado:** `ahora` producía `hahora` (agregaba una h a una palabra que ya la tiene); y mi primera corrección fue demasiado estricta (`ocho` tiene una «ch», no una h real).
3. **Pista que regalaba la respuesta:** para `vivir` la pista era "…vivir lleva v".
4. **Prueba mal planteada:** la prueba de "la pista no revela la respuesta" fallaba con la palabra `sílaba` (aparece en el texto genérico de una pista, lo cual no regala nada); se afinó.

## Cómo se verificó

- **294 pruebas.** Datos: sílabas ↔ palabra, tónica válida, tilde coherente con la regla, reglas de las listas coherentes con la palabra, **ningún error generado es una palabra real**, oraciones con un espacio y opciones únicas.
  Preguntas: la correcta está entre las opciones, opciones únicas, la posición varía, pista ≠ respuesta, explicación nombra la respuesta, reproducibles con semilla.
- **Mutaciones**: 12 cambios deliberados (g/j con `ja/jo/ju`, `ca/co/cu` como error, quitar la h de «ch», sin filtros de palabras reales, tónica mal indicada, opciones repetidas, pista que revela, etc.).
  Al principio **4 sobrevivieron**: no porque el código estuviera bien, sino porque *mis listas no ejercitaban esos casos*. Se añadieron pruebas con palabras inventadas y se hicieron inyectables los conjuntos de palabras → **las 12 se detectan**.
- **Navegador real (Chromium, `file://`)** con reloj simulado: las 9 habilidades (capturas revisadas), error → pista → acierto → explicación, el avance espera la lectura y "Siguiente" lo adelanta, **pausa durante 30 s: nada se mueve**, palabra que se escapa (revela y explica),
  teclado (← → enfoca, número atrapa), partida completa perfecta (10/10, 3 estrellas, 140 puntos), móvil 390 px sin desborde. Recorrido por el portal: galería de 4.º, pausa con Escape, partida entera con todas las palabras escapándose hasta los resultados, habilidades en el modo maestro. 0 errores de consola, 0 peticiones a internet.

## Conceptos que deberías poder explicar

- Por qué los errores se generan por regla y qué riesgo tiene (palabras reales que parecen error) y cómo se mitiga.
- La regla de la tilde (aguda/grave/esdrújula) y cómo el código la deduce de las sílabas y la tónica.
- Diferencia entre pista y explicación, y por qué la pista no puede nombrar la respuesta.
- Por qué `g/j` solo se confunden delante de e, i; por qué la «c» solo se ofrece antes de e, i.
- Qué es un mutante superviviente y qué enseñó aquí (las pruebas dependían de datos reales que no cubrían casos límite).
- Por qué extraer `PartidaPreguntas` y cómo se comprobó que no rompió Asteroides.

## Cómo revisar (orden sugerido)

1. `src/games/ortografia/logica/generadores.js` (cómo se generan los errores) y `tests/ortografia-contenido.test.js`.
2. `src/games/ortografia/logica/contenido.js` — **pídele a una maestra o maestro que lo revise**: son contenido pedagógico. En particular: las **sílabas y la tónica** de las 55 palabras de acentuación (hiatos y diptongos), los 47 ejercicios de oración y si el
   vocabulario es adecuado para cada grado y para tu región. Las listas de palabras reales de `PALABRAS_VALIDAS_QUE_NO_SON_ERROR` crecen con la revisión.
3. `src/core/partidaPreguntas.js` (reglas compartidas).
4. `src/games/ortografia/juego.js`.

## Limitaciones conocidas

- **Contexto mexicano (seseo):** las reglas de c/s/z se explican por posición, no por sonido. Para otras regiones habría que revisar.
- **b/v, g/j (salvo unas pocas reglas), h, ll/y se aprenden en gran parte por memoria visual**: el juego da práctica y explica las reglas que sí existen (-bir, -ger/-gir, -aje, hue-, -illo…), no inventa reglas.
- Algunos errores generados son poco probables en niños (`ezcuela`); no son *incorrectos*, solo menos frecuentes. Con revisión docente se pueden filtrar.
- Con 2 opciones (nivel 1, y la habilidad `h` siempre) acertar al azar es 50 %; el motor lo compensa subiendo el nivel solo con ≥ 85 % de dominio sostenido.
- Sin lectura en voz alta (Fase 8). Las pruebas de navegador son guiones manuales (Fase 8 las automatiza).
