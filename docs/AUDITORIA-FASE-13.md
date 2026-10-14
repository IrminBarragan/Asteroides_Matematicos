# Auditoría — Fase 13: Taller de Cálculo

Verificación: `pnpm test` y `pnpm test:e2e`. Componentes nuevos: [`ARQUITECTURA.md`](ARQUITECTURA.md#añadidos-en-la-fase-13-v02-taller-de-cálculo).

## Qué se hizo

Sexto juego del portal y el primero **pensado para enseñar** (1.º a 6.º). Sumas, restas y problemas con **material que el niño manipula**:

| Grado de contenido | Números | Material |
|---|---|---|
| 1.º | hasta 10 | marcos de diez (fichas azules y naranjas; en la resta se **tachan** fichas) |
| 2.º | hasta 20 | dos marcos de diez |
| 3.º–6.º | hasta 999 / 9 999 / 99 999 / 999 999 | **recta de saltos** (+1, +10, +100, +1 000, también hacia atrás), con «Deshacer» y «Empezar de nuevo» |

**La ayuda se retira sola** (`apoyo.js`), por habilidad:
- **completo**: hay que usar el material; las opciones aparecen al terminarlo (marcos) o se responde con «Listo» (recta, la respuesta es la posición a la que llegó).
- **ligero**: el material está cerrado pero a un botón («Usar fichas», «Usar la recta») y las opciones ya se ven.
- **ninguno**: solo la operación y las opciones.

Un acierto **a la primera** baja un escalón; un error lo sube; recuperar una pregunta no lo baja. En la **misión de inicio** no hay ayuda (se mide, no se enseña). Se ve al niño como una etiqueta («Con material», «Material opcional», «Sin ayuda») y un «¡Ya necesitas menos ayuda!».

## Decisiones de diseño

### 1. La dificultad sube por **concepto**, no solo por tamaño
1.º–2.º: sumas cortas → más largas → (2.º) **cruzar la decena**. 3.º–6.º: nivel 1 mueve **una sola cifra**; nivel 2 **sin llevada ni préstamo**; nivel 3 **con** llevada o préstamo. Es la progresión que enseña el algoritmo de columnas, no «números más grandes».

### 2. El `id` de cada opción es su valor
Así la recta responde con el número al que llegó y la misma `partida.responder` sirve para botones y material, sin una rama especial. Costo: un solo tipo de respuesta (numérica); si un juego futuro necesita otra, no aplica.

### 3. El error más revelador **siempre** se ofrece
Mi primera versión mezclaba los errores típicos al azar y la prueba mostró que «olvidar la llevada» aparecía solo en ~60 % de las preguntas. Ahora en el nivel 2 y 3 de la recta siempre está la suma sin llevar / la resta «al revés», y en problemas **siempre** la operación contraria. Así una respuesta equivocada le dice algo a la maestra.

### 4. Problemas: la dificultad es **qué se busca**
Nivel 1 «se junta / se quita»; nivel 2 «en total / cuántos más»; nivel 3 busca el **dato inicial** («tenía algunas, regaló 9 y le quedaron 9: ¿cuántas tenía?»), que es lo que más cuesta. Con concordancia de número y género (1 canica / 5 canicas; Cuántas / Cuántos), verificada por prueba.

### 5. Material con estado puro
`EstadoMarcos` y `EstadoRecta` (en `core/material.js`) tienen las reglas (límites, tope de saltos, deshacer); la pantalla solo dibuja. Un salto que se saldría de [0, máximo] se **rechaza**, no se recorta en silencio.

### 6. La escala de la recta se ajusta a lo recorrido
Una recta fija de 0 a 999 999 dejaría invisibles los saltos pequeños. Por eso debajo del dibujo siempre está el **camino escrito** («Empiezas en 370 → +10 → 380») y la posición actual (`aria-live`): el dibujo es apoyo, no la única fuente de información.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **Distractores absurdos en 1.º**: opciones como 19 o 12 para `1 + 8` (venían de «+10»). `generarDistractores` ahora acepta `maximo` y `excluir`.
2. **Error clásico solo en ~60 %** de las preguntas (decisión 3): lo detectó la prueba «aparece a menudo» con umbral 0.6 (cayó en 237/400).
3. **Prueba débil de la ayuda**: la mutación «un error ya no sube la ayuda» **sobrevivía**, porque el primer caso probado ya estaba en «completo» y no podía subir más. Se añadió una prueba que primero retira la ayuda y luego se equivoca.
4. **Rótulos de la recta encimados** en pantalla de celular (visto en captura, no en pruebas): la holgura de la escala dependía del salto más grande aun con saltos chicos. Ahora la holgura es proporcional a lo recorrido y el rótulo se baja si inicio y posición quedan juntos; las cifras suben de tamaño.
5. **Pruebas de navegador**: una regex esperaba «+ 5 puntos» y el texto es «+5 puntos»; el bucle de una prueba no cerraba la lección de introducción que tapaba «← Salir» (nuevo `saltarLeccion`); `humo.test` contaba 5 juegos y ahora son 6.

## Cómo se verificó

- **Pruebas unitarias nuevas** (`tests/material.test.js`, `calculo-logica.test.js`, `calculo-partida.test.js`). Las de los generadores **recalculan la respuesta con aritmética propia** a partir de lo que el niño ve en pantalla (no usan el código bajo prueba): la llevada se comprueba con «¿hay una posición k donde los restos módulo 10ᵏ suman 10ᵏ o más?», el préstamo con «¿el resto de a módulo 10ᵏ es menor que el de b?». Se recorren los 6 grados × habilidades × 3 niveles × 120 semillas × 3 ayudas.
- Los problemas se verifican **por las palabras de la historia** («Le dieron… y ahora tiene» ⇒ resta, «Regaló… y le quedaron» ⇒ suma…), los números que se leen en la historia y la concordancia.
- La misión de inicio del nuevo juego entra en `colocacion-juegos.test.js` junto con los otros cuatro.
- **Mutaciones** (12 cambios deliberados: permitir llevada en el nivel «sin llevada», quitar el error obligatorio de la resta y de los problemas, cambiar la operación de una plantilla, cruzar la decena de menos, quitar el tope de cifras, invertir la ayuda, que un error no suba la ayuda, que recuperar también la baje, quitar el límite de la recta, quitar «destachar», cambiar la operación de la lección): **todas detectadas**, la 8.ª solo después de reforzar la prueba (defecto 3).
- **Navegador real (Chromium, `file://`)**: misión + partida normal en 1.º, 3.º y 6.º usando el material de verdad (poner y tachar fichas, saltos con botones, «Listo»); la ayuda se retira; error con la recta → pista → corrección; teclado (Enter en los saltos), «Deshacer», «Empezar de nuevo»; celular de 360 px sin desborde; 0 errores de consola; 0 peticiones externas. Capturas revisadas a mano en escritorio y celular.

## Conceptos que deberías poder explicar

- Qué es el **andamiaje que se retira** y por qué se retira con aciertos a la primera y no con cualquier acierto.
- Por qué el nivel 3 de problemas busca el dato **inicial** (qué lo hace más difícil que «¿cuántos hay ahora?»).
- Por qué la prueba recalcula la llevada con restos módulo 10ᵏ y no con la función del generador.
- Por qué el `id` de la opción es su valor, y qué se pierde.
- Qué es un mutante superviviente y por qué el de la ayuda era una prueba que faltaba, no un mutante equivalente.

## Cómo revisar (orden sugerido)

1. `src/games/calculo/logica/apoyo.js` y `partida.js` (la idea central, ~60 líneas).
2. `src/games/calculo/logica/generadores.js` y `tests/calculo-logica.test.js`. **Pide a una maestra o maestro que revise** `ESCALAS`, los niveles de 2.º (cruzar la decena), `PLANTILLAS` y el lenguaje de los problemas.
3. `src/core/material.js` y su prueba.
4. `src/ui/marcosDiez.js`, `src/ui/rectaInteractiva.js`, `src/games/calculo/juego.js`.

## Limitaciones conocidas

- **Números sin separador de miles** («696487»): igual que Asteroides; en 5.º–6.º cuesta leerlos. Separarlos obliga a cambiar el formato de las ecuaciones que leen las pruebas y la voz; queda para la Fase 16.
- **Sin multiplicar ni dividir** (Fase 15) ni **bloques de valor posicional arrastrables** (Fase 14): el material de la recta enseña el *salto*, pero la llevada «10 unidades = 1 decena» la ilustra la lección, no un material propio.
- **Los problemas no llevan material** (solo texto y opciones); su ayuda «completo» no cambia nada.
- **La recta es difícil en celular con números grandes**: los botones caben (probado a 360 px), pero hacer 8 saltos con el dedo cansa. Es la razón de limitar la suma de cifras del segundo número a 12.
- **«Ligero» no mide si el niño usó el material**: sube y baja por aciertos, no por uso.
- **Contenido sin validar por docentes** y **sin probar con niños todavía** (como el resto de la v0.2).
- Las pruebas de navegador de «ligero» dependen de que aparezca esa ayuda al azar (reintentan hasta 30–40 veces).
