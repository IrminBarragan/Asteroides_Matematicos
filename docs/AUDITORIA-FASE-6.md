# Auditoría — Fase 6: Reloj Aventurero

Verificación: `pnpm test` (341 pruebas) y `pnpm build`. Componentes nuevos: [`ARQUITECTURA.md`](ARQUITECTURA.md#componentes-y-utilidades-del-núcleo-añadidos-en-la-fase-6).

## Qué se hizo

Cuarto juego del portal (1.º a 4.º), con un **reloj analógico en SVG** cuyas manecillas se **arrastran** (ratón, dedo o lápiz) o se mueven con el teclado.
No hay cronómetro: cada pregunta espera lo que el niño necesite; equivocarse da una pista y se puede reintentar.

| Grado | Habilidades | Qué hace el niño |
|---|---|---|
| 1.º | `leer-hora`, `poner-hora` | Lee o pone horas **en punto y y media** |
| 2.º | + `hora-en-palabras` | **Cuartos**; dice la hora ("las tres y cuarto", "las cuatro menos cuarto") |
| 3.º | `leer-hora`, `poner-hora`, `duracion` | Minutos de 5 en 5 y luego **minuto a minuto**; "empieza a las 3:10 y dura 25 min, ¿a qué hora termina?" |
| 4.º | + `formato-24h` | Reloj de **24 horas** (15:20 ↔ 3:20 p. m., con 12 a. m. y 12 p. m.) y duraciones más largas |

Dos formatos de pregunta: **leer** (se ve un reloj y se elige entre 3–4 botones) y **poner** (se arrastran las manecillas y se toca "Comprobar").
Cada habilidad tiene 3 niveles que decide el motor adaptativo (qué minutos aparecen, cada cuántos "salta" el minutero, tamaño de las duraciones).

## Decisiones de diseño

### 1. La matemática del reloj es lógica pura y se prueba de forma exhaustiva (`core/tiempo.js`)
El horario avanza **30° por hora y 0.5° por minuto** (a las 3:30 está a mitad de camino entre el 3 y el 4); el minutero 6° por minuto. Se prueba la **ida y vuelta** ángulo ↔ hora para los 60 minutos y las 12 horas,
la conversión 12 h ↔ 24 h **para las 24 horas del día** (con 12 a. m. = 00 y 12 p. m. = 12), y la hora con palabras para las **144 combinaciones** (cada una distinta).
El SVG solo aplica `rotate(ángulo)`: si la matemática es correcta, el dibujo lo es.

### 2. Las manecillas se arrastran por separado (no acopladas)
En un reloj real el horario se mueve al girar el minutero; así, para poner las 7:30 habría que dar 7 vueltas. Aquí cada manecilla se arrastra **independientemente** (la corta fija la hora, la larga los minutos),
pero el horario se dibuja siempre en su posición real (`hora × 30 + minutos × 0.5`), como en un reloj de verdad. **Costo:** no se practica la idea de que "al pasar el minutero por el 12 la hora avanza"; se enseña en las explicaciones.

### 3. El minutero "salta" (snap) según el grado
En 1.º salta cada 30 min, en 2.º cada 15, en 3.º cada 5 y luego cada 1; en 4.º cada 5 y luego cada 1. Un niño de 6 años no puede apuntar a "exactamente las 3:30" con un dedo de 1 cm; el salto lo hace posible y además **evita errores por imprecisión motriz** (se evalúa la hora, no la puntería).
Verificado en navegador: se suelta la manecilla 2° o 3° "mal" y queda en la hora exacta.

### 4. ¿Qué manecilla agarró el niño? (`elegirMano`)
Lejos del centro solo puede ser el minutero (es más largo). Cerca, la más cercana al toque; si hay empate (las 12:00, las dos juntas) el horario, que queda debajo. Función pura probada, incluidos los empates.

### 5. Accesibilidad (con una limitación inherente)
Cada manecilla es un `slider` (Tab, flechas, `aria-valuenow`/`aria-valuetext`: "3 horas", "30 minutos"). **Limitación honesta:** leer un reloj analógico es una tarea visual; los relojes de las preguntas de lectura
**no** anuncian la hora (sería darle la respuesta a quien usa lector de pantalla), así que esas preguntas no son accesibles para personas ciegas y la etiqueta lo dice.

### 6. Distractores = errores típicos al leer el reloj
Al leer 3:30 el error clásico es leer la manecilla larga como hora y la corta como minutos (**6:15**); también equivocarse una hora y de minutos por un paso. En "reloj de 24 horas": no sumar 12, sumar 10, cambiar mañana/tarde.
Una prueba confirma que el error "manecillas intercambiadas" realmente aparece.

### 7. La explicación enseña el concepto correcto
Mi primera versión decía "a las 2:45 la manecilla corta señala el 2", **lo cual es engañoso** (a las 2:45 está casi en el 3). Ahora dice "ya pasó el 2 pero no llegó al 3 (por eso es la hora 2)": **la hora es el número que la corta ya pasó**, un error clásico de 1.º a 3.º.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **Solo 3 opciones cuando se pedían 4** (reloj de 24 h): varios errores típicos coinciden con la respuesta (en horas de la mañana "no sumar 12" da lo mismo). Lo vio una prueba; se creó un ayudante que **garantiza** la cantidad. Después se generaron **432 000 preguntas** de todas las habilidades/niveles/cantidades: **0 con opciones mal formadas**.
2. **Botones de respuesta que no aparecían**: usé `append(arreglo)` del DOM nativo, que convierte el arreglo en texto, en vez de `append(...botones)`. **Ninguna prueba unitaria podía verlo**: lo encontré al jugar en el navegador real. Es el argumento más claro para la automatización de navegador de la Fase 8.
3. **Enunciado "a las las nueve y media"** (artículo duplicado) y "a las 1:30" en vez de "a la 1:30".
4. **Explicación pedagógicamente engañosa** (punto 7 de arriba).
5. Dos pruebas mal planteadas por mí (el punto de corte del redondeo con paso de 30 minutos está a los 90°, no a los 45°).

## Cómo se verificó

- **341 pruebas.** `tiempo.js`: ángulos, ida y vuelta, 12↔24 h exhaustivo, minutos del día, palabras. Generadores: respuesta correcta verificada **con un cálculo independiente** (acarreo de horas, vuelta de las 12, regla de las 24 h), niveles de minutos y pasos coherentes, nunca empieza ya resuelto, opciones únicas y de la cantidad pedida, reproducibles.
- **Mutaciones** (14 cambios deliberados: horario a 0.25°/min, minutero a 5°/min, "menos" sin pasar a la hora siguiente, sumar 10 en vez de 12, las 12 como 0, siempre agarrar el minutero, `codigoHora` sin módulo, duración mal sumada, sin casos de 12 a. m./p. m., "las una"…) → **las 14 se detectan**.
- **Navegador real (Chromium, `file://`):** las 6 modalidades (capturas revisadas); **arrastre con ratón** de ambas manecillas con ajuste automático; **arrastre con el dedo** (eventos táctiles reales por CDP, sin que la página se desplace); error → pista con "Tu reloj marca 12:00" → reintento; teclado (flechas mueven las manecillas, `slider` con `aria-valuetext`); pausa de 60 s sin cambios; móvil sin desborde; partida completa perfecta (10/10, 3 estrellas, 140 puntos).
  **Recorrido por el portal real**: galería de 2.º con los 3 juegos, pausa con Escape, 10 preguntas resueltas como un niño (2 de "poner" arrastrando, 8 de lectura), resultados y habilidades en el modo maestro. 0 errores de consola, 0 peticiones a internet.

## Conceptos que deberías poder explicar

- Por qué el horario se mueve 0.5° por minuto y qué pasaría si estuviera fijo en cada hora.
- Qué es el *snap* del minutero y por qué evalúa la hora y no la puntería.
- Por qué las manecillas son independientes aquí aunque en un reloj real están acopladas (y qué se pierde).
- La regla 12 h ↔ 24 h y los dos casos límite (12 a. m. = 00, 12 p. m. = 12).
- Cómo se eligió "qué manecilla agarra el dedo" (`elegirMano`) y por qué se prueba como función pura.
- Por qué los relojes de lectura no son accesibles para lectores de pantalla y por qué eso no es un descuido sino una decisión.

## Cómo revisar (orden sugerido)

1. `src/core/tiempo.js` y `tests/tiempo.test.js` (la matemática; lo más importante).
2. `src/games/reloj/logica/generadores.js` (qué se pregunta en cada grado y nivel). **Pide a una maestra o maestro que revise los rangos** (`MINUTOS`, `PASO_MINUTERO`, `DURACION`) y las frases ("las cuatro menos cuarto" es la forma que se usa en México; otras regiones dicen "las tres cuarenta y cinco").
3. `src/ui/relojSvg.js` (el componente interactivo).
4. `src/games/reloj/juego.js`.

## Limitaciones conocidas

- **Sin segundero**: el reloj solo tiene horario y minutero.
- El reloj analógico no tiene el **anillo interior de 13–24**; el reloj de 24 h se trabaja con enunciados y botones.
- Las manecillas desacopladas (decisión 2).
- Las preguntas de lectura no son accesibles para lectores de pantalla (punto 5).
- Con 3 opciones (nivel 1) acertar al azar es 33 %; el motor sube el nivel solo con ≥ 85 % de dominio sostenido.
- Las pruebas de navegador siguen siendo guiones manuales fuera del repositorio; la **Fase 8** las automatiza (y este juego mostró por qué hace falta).
