# Auditoría — Fase 15: Cajas y Reparto

Verificación: `pnpm test` y `pnpm test:e2e`. Componentes nuevos: [`ARQUITECTURA.md`](ARQUITECTURA.md#añadidos-en-la-fase-15-v02-cajas-y-reparto-y-el-esqueleto-de-los-juegos-con-material).

## Qué se hizo

Octavo juego del portal y tercero de los que **enseñan** (1.º a 6.º). Como decía el plan, «Tablas» y «Reparto» se hicieron **juntos**: multiplicar y dividir son la misma idea vista al revés, y comparten material.

| Habilidad | Qué hace el niño | Material |
|---|---|---|
| `grupos` | «3 cajas con 4 galletas cada una»: pone 4 en cada caja y dice cuántas hay en total | Cajas con «+» y «−» |
| `arreglo` | «Una cuadrícula de 4 filas y 6 columnas»: la arma y dice cuántos cuadros tiene | Cuadrícula con «+ fila», «+ columna»… |
| `tabla` | «7 × 8 = ?» (las tablas por grado y nivel) | Con ayuda, la cuadrícula de 7 × 8 a la vista |
| `repartir` | «Se reparten 13 galletas entre 4 platos»: da de uno en uno; ¿cuántas le tocan?, ¿cuántas **sobran**? | Platos con un montón por repartir |
| `inversa` | «20 ÷ 4 = ?», «? × 4 = 20», «4 × ? = 20» | Cuadrícula de 4 filas a la que se agregan columnas hasta llegar a 20 |
| `grande` | ×10 y ×100, 23 × 4, 72 × 23, 84 ÷ 4, 9 768 ÷ 8 | Sin material (lección con descomposición) |

Misma **ayuda que se retira sola** (obligatorio → opcional → ninguna; sin ayuda en la misión de inicio).

## Decisiones de diseño

### 1. El esqueleto se extrajo al tercer juego, no antes
Taller de Cálculo y Bloques de Valor repetían ~200 líneas (HUD, opciones, pistas, la ayuda que se retira, el botón «Listo»). En la auditoría de la Fase 14 dije que, si llegaba un tercero, convenía extraerlo. Llegó y lo hice: `ui/juegoConMaterial.js`. Cada juego aporta dos métodos —`crearPartida` y `crearMaterial` (qué estado se crea, qué componente lo dibuja y **cuándo está «terminado»**)— y un juego con material quedó en unas 60 líneas. **Los dos juegos anteriores se migraron** y sus pruebas (660 unitarias y las 15 de navegador de esos juegos) pasaron sin tocar la lógica; solo hubo que renombrar los selectores CSS en los ayudantes de navegador.
Por qué esperar al tercero: con dos ejemplos la abstracción habría salido a la medida de esos dos (la recta con «Listo» y los bloques que solo se leen casi no encajan en un mismo molde); con tres, el contrato `crearMaterial` ya tuvo que cubrir tres formas distintas de «terminado» (alcanzar un estado, responder con el material mismo, solo mirar).

### 2. Multiplicar y dividir comparten estado
`EstadoGrupos` sirve para las dos: sin montón son cajas donde se **pone** (multiplicar); con montón son platos donde se **reparte** (dividir), y `agregar` mueve un objeto del montón al plato. Invariante probada: `total + montón` es constante, es decir, **repartir no crea ni pierde objetos**.

### 3. «¿Cuántos sobran?» es una pregunta distinta de «¿cuántos le tocan?»
Con residuo, el niño puede responder bien una y mal la otra, y confundir cociente y residuo es el error clásico: por eso en «sobran» siempre se ofrece el **cociente** como opción, y en «le tocan», el **residuo**. La lección propia («Repartir cuando sobran») explica por qué **el residuo siempre es menor que el divisor**: si no, aún se podría dar uno más a cada plato.

### 4. La división se ve como el factor que falta
`20 ÷ 4` se resuelve agregando columnas a una cuadrícula de 4 filas hasta llegar a 20 cuadros; las columnas que hicieron falta **son** el cociente. Así la división no es un procedimiento aparte sino «¿cuántos 4 hacen 20?». El mismo material resuelve las tres formas de escribirlo.

### 5. Cuánto material y cuánto no
Poner o repartir de uno en uno cansa: por eso las preguntas de cajas no pasan de 24 objetos, y los repartos de más de 24 objetos o más de 6 platos no llevan material (pasan a ser abstractos, con lección). Hay un tope explícito (`MAX_OBJETOS_MATERIAL`) y una prueba que exige que sin material no haya platos.

### 6. Botones, no arrastre
Igual que en la Fase 14 (mismas razones: precisión motriz en pantalla táctil, teclado gratis, el «cambio» queda explícito).

## Defectos encontrados (en mi propio trabajo) y cómo

1. **Una prueba circular.** La prueba de «las tablas del nivel» comparaba contra la misma constante `TABLAS` que usa el generador. La mutación `[3, 4] → [3, 4, 7]` en esa constante **sobrevivía**: el código y la prueba cambiaban juntos. Ahora las tablas están escritas **aparte en la prueba** (`TABLAS_ESPERADAS`) y hay una prueba que exige que coincidan: es la especificación que debe revisar una maestra.
2. **Un error duplicado que volvía redundante al «obligatorio».** En «×10 / ×100», mi cuarta opción errónea (`a` con ceros pegados) **era igual** a la segunda (`a × k/10`), así que quitar el error obligatorio no cambiaba nada y la mutación sobrevivía. Se cambió por otro error distinto (`a × k + a`); ahora la mutación se detecta y las opciones son más variadas.
3. **Platos en una sola columna en celular**: cada plato medía 150 px y no cabían dos por fila a 360 px. Lo vi en la captura. Ahora miden 138 px (mínimo 100) y caben dos.
4. **Mi procedimiento de mutaciones esta vez fue correcto** (confirmar antes de mutar, lección de la Fase 14): 24 mutaciones, sin incidentes. Dos patrones de `sed` míos no coincidían (la herramienta lo avisó con «NO CAMBIO») y no cuentan.

## Cómo se verificó

- **Pruebas unitarias nuevas** (`cajas-logica.test.js` y los casos nuevos de `material.test.js`; la misión entra en `colocacion-juegos.test.js`). Las comprobaciones **leen los números del texto** que ve el niño y recalculan con aritmética propia: «3 cajas con 4…» → 12, «Se reparten 13 … entre 4 platos» → cociente 3 y residuo 1 con `Math.floor` y `%`, «? × 4 = 20» y «4 × ? = 20» → 5.
- **Cada pregunta con material se resuelve de verdad con las reglas del material**: se pone `b` en cada caja y se comprueba `todosCon(b)`; se reparte de uno en uno hasta que `pool < d` y se exige `iguales`, cada plato con el cociente y el montón igual al residuo; se agregan columnas hasta el total y se exige que las columnas sean el cociente.
- **Mutaciones** (24 cambios deliberados: tablas de un nivel, tope de objetos, cuántos platos, permitir residuo 0 al «sobrar», residuo en niveles sin residuo, devolver el cociente cuando se pregunta el residuo, quitar el residuo del total, quitar los errores obligatorios, material con las medidas cambiadas, que `agregar` no baje el montón, que las filas fijas no lo sean, la lección del residuo con otro dato…): **todas detectadas** tras corregir los defectos 1 y 2.
- **Navegador real (Chromium, `file://`)**: misión y partida normal en 1.º, 3.º y 6.º resolviendo con el material (cajas, platos, cuadrículas); un reparto a medias **no** muestra las opciones; teclado y «Deshacer»; la ayuda se retira; celular de 360 px sin desborde; 0 errores de consola y 0 peticiones externas. Capturas revisadas a mano en escritorio y celular.

## Conceptos que deberías poder explicar

- Por qué multiplicar y dividir son «lo mismo al revés» y qué ve el niño que lo muestra (la cuadrícula).
- Por qué el residuo es siempre menor que el divisor y qué error de comprensión revela que no lo sea.
- Por qué se extrae una abstracción cuando llega el tercer caso y no el segundo.
- Qué es una prueba circular (defecto 1) y cómo se rompe el círculo (la especificación vive aparte del código).
- Qué es un mutante superviviente por redundancia (defecto 2).

## Cómo revisar (orden sugerido)

1. `src/ui/juegoConMaterial.js` (el contrato que cumple cada juego).
2. `src/core/material.js` → `EstadoGrupos`, `EstadoCuadricula` y sus pruebas.
3. `src/games/cajas/logica/generadores.js` y `tests/cajas-logica.test.js`. **Pide a una maestra o maestro que revise** `TABLAS` (qué tablas van en cada grado y nivel), los topes de objetos y el lenguaje («se reparten… en partes iguales entre… platos»).
4. `src/lecciones/cajas.js` y `src/games/cajas/juego.js`.

## Limitaciones conocidas

- **No hay «agrupar»** («¿cuántas bolsas de 4 salen de 12?»): solo repartir. Es la otra cara de la división y el plan la mencionaba; queda para la Fase 16 si la prueba con niños muestra que hace falta.
- **No hay conteo de 2 en 2, 5 en 5** como actividad propia (el plan lo listaba). La recta de «Taller de Cálculo» permite hacerlo, pero no hay una pregunta que lo pida.
- **En `tabla` la cuadrícula solo se mira** (no se arma): la manipulación está en `arreglo` e `inversa`.
- **Los números grandes (`grande`) no llevan material**, solo lección. No hay división con residuo ni con divisor de dos cifras.
- **El reparto no se anima** ni se arrastra (decisión 6).
- **Dos preguntas con tablas altas (11 y 12) no tienen cuadrícula** (no caben 12 × 12 cuadros cómodamente).
- **Contenido sin validar por docentes** y **sin probar con niños** (como el resto de la v0.2).
