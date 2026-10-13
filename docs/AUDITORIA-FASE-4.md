# Auditoría — Fase 4: Memorama de Palabras

Verificación: `pnpm test` (251 pruebas) y `pnpm build`. Arquitectura de juegos DOM: [`ARQUITECTURA.md`](ARQUITECTURA.md#juegos-basados-en-dom-ejemplo-memorama-fase-4).

## Qué se hizo

Segundo juego del portal y **primero basado en DOM** (botones HTML, sin canvas). Las cartas giran en 3D; al encontrar una pareja se le **explica por qué** van juntas
("gato y pato riman: terminan igual, en «-ato»").

| Grado | Modos (habilidades) | Qué se junta |
|---|---|---|
| 1.º | `imagen-palabra`, `silaba-inicial` | dibujo ↔ palabra · dibujo ↔ sílaba con la que empieza |
| 2.º | `silaba-inicial`, `conteo-silabas`, `rimas` | palabra ↔ sílaba inicial · palabra ↔ número de sílabas (1–5) · palabras que riman |
| 3.º | `rimas`, `sinonimos`, `antonimos` | rimas · significan lo mismo · significan lo contrario |

Cada partida son **3 tableros**; el motor adaptativo elige el modo y la dificultad de cada uno (3 → 4 → 6 parejas; en "contar sílabas" 3 → 4 → 5).
Contenido: 24 dibujos propios (16 SVG nuevos + los 8 animales), 46 palabras con sílabas, 23 rimas, 18 sinónimos, 23 antónimos.

## Decisiones de diseño (la parte difícil de este juego)

### 1. Una carta nunca puede tener dos parejas válidas
En un memorama semántico es fácil crear injusticias: `gato` rima con `pato` **y** con `plato`; `alto` es lo contrario de `bajo` **y** (en cierto sentido) de `pequeño`.
Solución: cada pareja pertenece a un **`grupo`** (la terminación, el campo de significado, la sílaba o la cantidad) y **un tablero nunca mezcla dos parejas del mismo grupo**.
Se verifica con pruebas sobre miles de tableros generados y sobre los datos (p. ej. "ninguna palabra rima con una pareja de *otro* grupo").
**Alternativa descartada:** aceptar cualquier pareja válida. Obligaría a calcular equivalencias semánticas (imposible de verificar sin un diccionario) y confundiría al niño.

### 2. Qué cuenta como "error" (el criterio que define las estrellas)
En un memorama, fallar al voltear cartas **nuevas** es parte normal del juego: ni un jugador perfecto puede evitarlo. Si cada fallo restara, **nadie** podría sacar 3 estrellas.
Por eso solo cuenta como **error evitable** el fallo en el que *la pareja de la primera carta ya se había visto antes* (el niño podía haber acertado recordando).
Se verifica con un "jugador de memoria perfecta" simulado (100 tableros): **0 errores evitables**. Esto es lo que debes poder defender si te preguntan cómo se calculan las estrellas.

### 3. Sin penalización
Los errores evitables no restan puntos (10 por pareja); solo quitan el **bonus de tablero sin errores** (+20) y cuentan para las estrellas. Los fallos a ciegas dan un mensaje neutro y un sonido suave;
solo el evitable avisa ("Casi. ¡Ya habías visto la pareja de la primera carta!").

### 4. Tiempo del juego pausable
Ver un fallo (1.4 s) y la pausa entre tableros (2.2 s) usan el nuevo `Planificador`, que solo avanza cuando el `BucleJuego` corre. **Verificado en navegador:** con un fallo a la vista y el juego en pausa durante 2.2 s, las cartas siguen
boca arriba; al reanudar se ocultan. Esta fase destapó una imprecisión del primer diseño del planificador (las tareas encadenadas contaban desde el final del avance); se corrigió y se añadió una prueba
("el resultado no depende del tamaño del avance").

### 5. Accesibilidad
Cada carta es un `<button>` con etiqueta que cambia con su estado ("Carta 3, boca abajo" → "Carta 3: rana" → "Carta 3, pareja encontrada: rana"). Funciona con Tab y Enter/Espacio (verificado);
los mensajes van en regiones `aria-live`. El foco **no se pierde** al voltear (se actualiza el mismo nodo) y pasa a la primera carta en cada tablero nuevo.

### 6. Datos separados de las reglas
`contenido.js` son solo listas. Las sílabas de cada palabra están **escritas a mano** (la división silábica tiene hiatos y diptongos: `hi-po-pó-ta-mo`, `pie` = 1 sílaba); un algoritmo daría errores que un niño memorizaría.
Las pruebas verifican que las sílabas, unidas, formen la palabra (detecta erratas) pero **no pueden verificar que la división sea correcta**: eso requiere una revisión humana.

## Cómo se verificó

- **251 pruebas.** Datos: sílabas ↔ palabra, rimas que de verdad terminan igual, sin sinónimo/antónimo contradictorios. Tableros: 2 cartas por pareja, **0 grupos repetidos** en miles de tableros, ninguna carta repetida visualmente, en rimas ninguna palabra rima con otra que no sea su pareja. Motor del tablero: errores evitables vs. a ciegas, bloqueo mientras hay un fallo, cartas ya encontradas ignoradas.
- **Mutaciones** (cambios deliberados): todo fallo evitable, ningún fallo evitable, sin bloqueo, grupos repetidos, bonus siempre, sílabas mal escritas, rimas con claves incorrectas → **todas detectadas**. (Una mutación aparentemente "sobreviviente" resultó ser un cambio válido por diseño — dos parejas del mismo grupo son legales porque solo una entra por tablero; se probó con una mutación que sí rompe la regla.)
- **Navegador real (Chromium, `file://`)**: los 6 modos (capturas revisadas), partida completa con memoria perfecta (3 estrellas), error evitable y bloqueo, pausa durante un fallo, teclado y etiquetas, móvil (390 px, sin desborde), tablero de 12 cartas dentro de 768 px de alto.
  Recorrido por el portal con reloj simulado: galería de 2.º con los dos juegos, partida completa jugada "a fuerza bruta" hasta los resultados, "ver todos" para un 5.º, habilidades en el modo maestro. 0 errores de consola, 0 peticiones a internet.

## Conceptos que deberías poder explicar

- Por qué existe el `grupo` y qué problema evita (ambigüedad: una carta con dos parejas válidas).
- Qué es un error *evitable* y por qué calcular las estrellas con "todos los fallos" sería injusto.
- Por qué un juego DOM actualiza nodos en lugar de recrearlos (foco, accesibilidad).
- Qué ventaja da un planificador en "tiempo de juego" frente a `setTimeout`.
- Por qué los datos del contenido están separados de las reglas.

## Cómo revisar (orden sugerido)

1. `src/games/memorama/logica/tablero.js` (la definición de error evitable) y `tests/memorama-logica.test.js`.
2. `src/games/memorama/logica/generadores.js` (cómo se garantiza la unicidad de parejas).
3. `src/games/memorama/logica/contenido.js` — **pídele a una maestra o maestro que revise las listas**: sílabas, rimas, sinónimos y antónimos son contenido pedagógico; revisa también si el vocabulario es apropiado para tu región (usé "platicar", propio de México).
4. `src/games/memorama/juego.js`.

## Limitaciones conocidas

- **Nada lee en voz alta:** un niño de 1.º que aún no lee con fluidez depende de que alguien le lea las palabras. La lectura asistida (`speechSynthesis`) está planificada para la Fase 8.
- Los dibujos son simples y propios (geométricos); no sustituyen ilustraciones profesionales.
- Las rimas consideradas son **consonantes**; los niños pueden percibir rimas asonantes (casa–mesa) como válidas. El mensaje al acertar enseña la terminación exacta ("terminan igual, en «-asa»").
- 5.º y 6.º no tienen modos propios: si juegan este juego (vía "ver todos") reciben los tableros de 3.º.
- Las pruebas de navegador son guiones manuales (no están en el repositorio); se automatizan en la Fase 8.
