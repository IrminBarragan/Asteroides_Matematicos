# Auditoría — Fase 14: Bloques de Valor

Verificación: `pnpm test` (660 pruebas) y `pnpm test:e2e`. Componentes nuevos: [`ARQUITECTURA.md`](ARQUITECTURA.md#añadidos-en-la-fase-14-v02-bloques-de-valor).

## Qué se hizo

Séptimo juego del portal y segundo de los que **enseñan** (1.º a 6.º). Trabaja con **bloques de valor posicional**: una columna por valor (unidades, decenas, centenas, unidades de millar), cada una con su forma (cuadrito, barra, plano, cubo) para no depender solo del color.

| Habilidad | Qué hace el niño | Grados de contenido |
|---|---|---|
| `leer` | Mira los bloques y dice qué número es | 1.º–3.º (2 a 4 cifras) |
| `armar` | «¿Qué número tiene 3 centenas, 0 decenas y 7 unidades?»; con ayuda **primero construye** con los bloques | 1.º–3.º |
| `posicion` | Valor de una cifra · «5 000 + 300 + 2» · «4 centenas y 15 decenas» | 3.º–6.º (hasta 6 cifras, sin bloques a partir de 5) |
| `llevada` | Suma: junta los bloques y **cambia 10 por 1** hasta que ninguna columna llegue a 10 | 2.º–6.º (2 a 4 cifras) |
| `prestamo` | Resta: quita bloques y, si no alcanzan, **cambia 1 por 10** de la columna de la izquierda | 2.º–6.º |

Misma **ayuda que se retira sola** que «Taller de Cálculo» (obligatorio → opcional → ninguna; baja con un acierto a la primera, sube con un error; sin ayuda en la misión de inicio). Al **leer** un número los bloques son la pregunta misma, así que siempre se ven.

## Decisiones de diseño

### 1. Botones, no arrastre (cambio respecto al plan)
El plan decía «bloques arrastrables». Los manejo con **botones** («+», «−», «10 → 1», «1 → 10», «Quitar uno»). Razones: (a) un arrastre exige precisión motriz que en 1.º–2.º y en una pantalla táctil de aula falla más que un botón grande; (b) el teclado y los lectores de pantalla quedan cubiertos **sin código extra** (con arrastre hay que escribir una alternativa aparte); (c) lo que se enseña es el **cambio** («10 de aquí valen 1 de allá»), y un botón por columna lo hace explícito. Costo: se pierde la metáfora física de «mover» el bloque. Si en la prueba con niños se ve que lo piden, el estado (`EstadoBloques`) ya tiene las operaciones; solo habría que añadir la entrada por puntero.

### 2. El estado cuenta; la pregunta dice cuándo está «terminado»
`EstadoBloques` solo sabe de columnas y cambios. La pregunta declara el objetivo: construir ⇒ los bloques igualan las cifras; juntar ⇒ ninguna columna ≥ 10; quitar ⇒ lo quitado iguala las cifras del sustraendo. El juego compara y revela las opciones. Así no hay una rama por habilidad en el estado.

### 3. Invariante: cambiar no cambia el valor
`juntar` y `separar` conservan `valor() + valorQuitado()`. Hay una prueba con 60 secuencias aleatorias de 100 pasos. Es la propiedad que hace verdadero lo que se enseña (10 unidades **valen** 1 decena).

### 4. El nivel sube por concepto
`leer`/`armar`: sin ceros → un cero → varios ceros (el cero en medio es el error más común). `llevada`/`prestamo`: una cifra → dos cifras → **varias llevadas seguidas** (y préstamos en cadena, como 503 − 128). `posicion`: valor de una cifra → de la suma de valores al número → **reagrupar** («4 centenas y 15 decenas»).

### 5. El error más revelador siempre se ofrece
Igual que en el Taller: olvidar la llevada (`47 + 38 → 75`) y restar «al revés» están **siempre** entre las opciones del nivel 1–3 de llevada y préstamo; al leer, se ofrece el número sin el cero.

### 6. Lo que subió al núcleo
`core/cifras.js`, `core/apoyo.js` y `core/partidaConApoyo.js` estaban dentro de Taller de Cálculo. Los moví **al descubrir que el segundo juego los necesitaba** (no antes), dejando en la ruta antigua un archivo que reexporta (`apoyo.js`, `distractores.js`) o reimportando (`generadores.js` reexporta las funciones de cifras), así que las pruebas del Taller siguieron pasando sin tocarlas.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **Los bloques regalaban la respuesta** en «¿Qué número es 4 000 + 80 + 9?»: al ver los bloques de 4 089 el niño no convertía nada. Lo vi al leer una muestra de preguntas generadas; ahora esa variante no lleva bloques y hay una prueba (`material === null`) y una mutación que la mata.
2. **Lección de préstamo con «hay −1»** en 503 − 128 (la decena que no existe): también al leer la salida de una muestra. Se reescribió el texto y hay una prueba que prohíbe «hay -».
3. **Mi procedimiento de mutaciones me hizo daño dos veces**, y lo cuento porque es una lección de método: (a) `git checkout` para deshacer una mutación en un archivo **tracked** descartó también la clase `EstadoBloques`, que aún no estaba confirmada (la reescribí; las pruebas lo delataron de inmediato); (b) en archivos **sin confirmar** mi comprobación «¿cambió el archivo?» (`git diff`) decía que no, así que **las mutaciones quedaron aplicadas sin que me diera cuenta**; las pruebas fallaron y las deshice a mano. Una de ellas (quitar el singular de «1 decena») fue de hecho detectada por la prueba de concordancia, lo cual es buena noticia sobre la prueba. **Regla nueva: confirmar siempre antes de mutar.**
4. **Prueba de navegador mal planteada**: asumía que tras el primer «10 → 1» aún faltaban cambios; con una sola llevada las opciones ya aparecen. Ahora la prueba afirma la relación real: *hay opciones ⇔ no queda ninguna columna con 10 o más*.

## Cómo se verificó

- **Pruebas unitarias nuevas** (`bloques-logica.test.js`, `material.test.js`; la misión de inicio entra en `colocacion-juegos.test.js`). Las comprobaciones **no usan las funciones del generador**: el valor de `armar` y de la descomposición se lee de las **palabras** del enunciado («3 centenas, 0 decenas y 7 unidades»), el valor de la cifra se recalcula con su posición en el texto, y las llevadas y préstamos con restos módulo 10ᵏ.
- **Cada pregunta con bloques se resuelve de verdad con las reglas del material**: la prueba construye el número con `agregar`, junta con `juntar` hasta normalizar (y exige que los cambios sean tantos como llevadas), o quita con `quitar` y `separar` en cadena. Si alguna pregunta fuera imposible de resolver con los bloques, la prueba lo diría.
- **Mutaciones** (18 cambios deliberados: relajar las reglas de nivel de llevada y préstamo, quitar el error obligatorio, que los bloques de partida no sumen las dos cifras, quitar los ceros del nivel 3, permitir cifras repetidas en «¿qué valor tiene el 4?», regalar la respuesta con bloques, que `juntar` acepte 9, que `separar` dé 9, que `quitar` no cuente, que la lección use otro dato, que recuperar baje la ayuda…): **todas detectadas**. Las pruebas de la ayuda compartida están en `calculo-partida.test.js` (la clase es común); la mutación «recuperar también baja la ayuda» la matan esas pruebas, no las de Bloques.
- **Navegador real (Chromium, `file://`)**: misión + partida normal en 1.º, 3.º y 6.º resolviendo con los bloques (construir, juntar, quitar con cambio de 1 por 10, leer), teclado, «Deshacer», la ayuda que se retira, celular de 360 px con cuatro columnas sin desborde, 0 errores de consola y 0 peticiones externas. Capturas revisadas a mano en escritorio y celular.

## Conceptos que deberías poder explicar

- Por qué «llevar» y «pedir prestado» son el **mismo** cambio en direcciones contrarias, y por qué conserva el valor.
- Por qué el cero en medio (`503`) es lo más difícil de leer y de restar.
- Por qué el estado de los bloques no conoce las preguntas y la pregunta declara su objetivo.
- Por qué una función se sube al núcleo cuando el **segundo** juego la necesita y no cuando se escribe la primera.
- Qué se pierde al cambiar arrastre por botones, y cómo se recuperaría.
- Por qué hay que confirmar antes de mutar (defecto 3).

## Cómo revisar (orden sugerido)

1. `src/core/material.js` → `EstadoBloques` y su prueba (las reglas y la invariante).
2. `src/games/bloques/logica/generadores.js` y `tests/bloques-logica.test.js`. **Pide a una maestra o maestro que revise** `ESCALAS`, los niveles de `leer`/`armar` y el lenguaje («cambia 10 por 1»).
3. `src/lecciones/bloques.js` (cómo se explica el cambio).
4. `src/ui/bloquesValor.js` y `src/games/bloques/juego.js`.

## Limitaciones conocidas

- **No se arrastra** (decisión 1) y **el cambio no se anima**: el plan decía «10 unidades se cambian por 1 decena animado»; hoy los bloques cambian de golpe. La animación queda para la Fase 16 si la prueba con niños la pide.
- **A partir de 5 cifras no hay bloques** (no caben cuatro columnas más en pantalla): `posicion` de 4.º–6.º es abstracta. Llevadas y préstamos llegan a 4 cifras en todos los grados 4.º–6.º; no cambian entre ellos más que en la proporción de niveles.
- **Las lecciones dibujan bloques solo con decenas y unidades**; con 3 o más cifras usan la operación en columnas.
- Los números de 5 y 6 cifras se escriben con espacio fino (`12 345`); Taller de Cálculo todavía no.
- **Duplicación consciente**: `juego.js` repite la estructura de `calculo/juego.js` (HUD, opciones, planificador) en vez de abstraerla; el patrón de la casa es un `juego.js` por juego y la abstracción prematura era un riesgo mayor. Si llega un tercer juego con material, conviene extraerla.
- **«Ligero» no mide si usó los bloques** (como en el Taller).
- **Contenido sin validar por docentes** y **sin probar con niños** (como el resto de la v0.2).
