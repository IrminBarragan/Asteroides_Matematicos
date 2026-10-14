# Plan v2: que los niños aprendan, se motiven y quieran volver

> Nace de la **primera prueba con niños de primaria**. Resultado: casi ninguno obtuvo estrellas; la mayoría no domina las operaciones básicas del grado en que está; y pidieron **más música y una interfaz más colorida y animada**.
> Este documento es el plan vivo de la versión 0.2. Se actualiza al cerrar cada fase (igual que [`PLAN.md`](PLAN.md)).

## 1. Qué pasó (diagnóstico)

La v1 **asume que el niño domina el contenido de su grado**. La prueba mostró que no es así. Revisando el código, hay **tres causas mías**, no solo «los niños saben poco»:

| # | Causa | Dónde está | Por qué los dejó sin estrellas |
|---|---|---|---|
| 1 | **La regla de estrellas solo premia acertar a la primera.** | `src/core/resultado.js` (`calcularEstrellas`) y `src/core/partidaPreguntas.js` | Un niño que termina las 10 preguntas **reintentando hasta acertar** cuenta 0 aciertos → **0 estrellas**. Terminó, aprendió con las pistas… y no recibe nada. Es **un defecto de diseño mío**: castiga justo a quien más necesita ánimo. |
| 2 | **El nivel 1 de cada grado ya es difícil para quien está atrasado.** | `TOPE_SUMA` y rangos de `src/games/asteroides/logica/generadores.js` | 1.º arranca en sumas hasta 10 (bien), pero 3.º arranca en sumas hasta **200** y tablas del 7, 8 y 9; 4.º en sumas hasta **1 000**. Un niño de 4.º que no suma bien hasta 20 **no tiene dónde empezar**. El **grado** del perfil decide el contenido y no hay escalón por debajo. |
| 3 | **Los juegos evalúan, pero casi no enseñan.** | Todos | La ayuda llega **después de fallar** (pista de una línea). Para quien no tiene la base, falta **ver cómo se hace**, manipular y practicar con apoyo antes de que cuente como examen. |

Además: el sonido son solo efectos sintéticos cortos (`src/core/gestorAudio.js`, sin música) y la interfaz es sobria (pocas animaciones), lo que **no compite** con lo que los niños tienen en el teléfono.

> **Lo que NO afirmo:** no sé con exactitud qué contenidos faltan ni en qué grados. Esa información la tienes tú y la maestra (ver §7). El plan está hecho para **no depender de adivinarlo**: el sistema debe **encontrar solo el punto de partida** de cada niño.

## 1b. Lo que se supo después (respuestas de la maestra)

| Dato | Consecuencia para el plan |
|---|---|
| Probaron **niños de 6.º**, que **jugaron todos los juegos** | Incluso en el grado más alto la mayoría no domina las operaciones: el **piso de contenido** debe bajar mucho y el sistema debe **encontrarlo solo**. Y son niños de ~11–12 años: **la estética no puede ser infantil** (ver principio 7) |
| Queja principal: **«no se enseña, solo se evalúa»** | **Sube la prioridad de enseñar.** La enseñanza deja de ser «unos juegos nuevos al final» y pasa a ser **parte de los juegos que ya existen** (Fase 11) |
| Quieren que el niño **aprenda** y que **el sistema decida** el nivel | Se elimina el ajuste manual como requisito: la **misión de inicio** y la adaptación automática son el mecanismo. El modo maestro solo **muestra** (y, opcionalmente, reinicia la misión) |
| Hay **bocinas** (no audífonos) | **30 PCs con música = ruido**. Música **apagada por omisión** en el equipo y un ajuste visible para la maestra (Fase 12) |
| PCs **de hace unos años** con **Chrome** | Chrome moderno: se pueden usar animaciones CSS y Web Audio sin miedo; se mantiene el «modo ligero» por prudencia y se **mide** en una de esas PCs |

## 2. Principios del rediseño (y por qué)

1. **Desacoplar «grado» de «nivel de contenido».** El grado dice dónde está el niño en la escuela; el **nivel de partida** dice qué sabe hacer. Un niño de 5.º puede jugar contenido de 2.º sin que sea humillante ni se note.
2. **Todo niño que se esfuerza gana algo.** Las estrellas deben medir **participación y progreso**, no solo perfección. La exactitud sigue existiendo, pero **para la maestra** (datos honestos), no como castigo.
3. **Primero entender, luego practicar, luego demostrar.** El enfoque **concreto → pictórico → abstracto** (CPA, de la didáctica de las matemáticas): se **manipulan objetos**, luego se ven dibujos, y solo después aparece el símbolo (`3 + 4 = 7`). Cada juego nuevo tendrá modo **Aprende** (sin puntaje) antes de **Practica** y **Reto**.
4. **Dificultad que se adapta *dentro* de la sesión y *entre* sesiones**, con una escalera de niveles más fina por debajo.
5. **Motivación sin presión:** música, color, mascota que reacciona, colección de pegatinas. Nada de cronómetros nuevos ni vidas.
6. **Nada de lo bonito puede romper lo existente:** funciona sin internet, en PCs viejas, accesible (movimiento reducido, contraste, teclado) y dentro del presupuesto de tamaño.
7. **Respetar la edad.** Un niño de 6.º que repasa sumas no debe sentir que juega «cosas de primero». La **ayuda es la misma, la presentación no es infantil**: temas neutros (laboratorio, ciudad, espacio, deportes), mascota tipo «entrenador», lenguaje de reto, y el nivel de contenido **no se muestra** como «grado 2».
8. **Enseñar dentro del juego, no aparte.** Cada vez que el niño se atora, el juego le **enseña ese paso** en ese momento («¿quieres ver cómo se hace?»); no hace falta ir a otro lugar.

## 3. Fases

| Fase | Nombre | Contenido | Entrega |
|---|---|---|---|
| **10** ✅ | **Rescate** | Nueva regla de estrellas · nivel de partida independiente del grado, **decidido por el sistema** (misión de inicio + adaptación) · escalones nuevos por debajo (suma y resta hasta 10 y 20; tablas del 2, 5 y 10) · «modo tranquilo» en Asteroides | **v0.2-alfa** |
| **11** ✅ | **Aprende dentro de cada juego** | Componente **lección** (pasos guiados + material arrastrable) · «**Ver cómo se hace**» tras fallar · **mini-lección previa** al subir a un escalón nuevo · aplicado a los juegos existentes (Asteroides, Reloj, Fracciones…) | **Responde la queja principal** |
| **12** ✅ | **Música y color** | Música generada en el navegador, **apagada por omisión** en el equipo · volumen de música y efectos separados · mascota «entrenador» · confeti y celebraciones · fondos animados por área · «modo ligero» · álbum de logros | v0.2-beta |
| **13** | **Sumas y restas guiadas** (juego nuevo) | Sumar/restar con material (recta numérica, «hacer 10», marcos de 10) · tema juvenil | Juego 1 |
| **14** | **Valor posicional y llevadas** (juego nuevo) | Bloques de unidades/decenas/centenas, acarreo y préstamo animados | Juego 2 |
| **15** | **Tablas y reparto** (juego nuevo) | Multiplicar como grupos y arreglos; dividir como repartir, con residuo | Juego 3 |
| **16** | **Pulido y segunda prueba** | Auditorías, manual, ZIP v0.2.0, protocolo de observación, registro de errores comunes | v0.2.0 |

*(Los cuatro juegos nuevos del plan original se reducen a tres: «Tablas» y «Reparto» comparten material y se pueden hacer juntos. Se vuelve a separar si hace falta.)*

Cada fase termina con commits separados, pruebas en verde (unitarias **y** de navegador) y su `docs/AUDITORIA-FASE-N.md`, como hasta ahora.

### Fase 10 — Rescate (lo más urgente) — ✅ hecha, ver [`AUDITORIA-FASE-10.md`](AUDITORIA-FASE-10.md)

**10.1 Nueva regla de estrellas** (`calcularEstrellas`).
Propuesta (a validar contigo):

| Estrellas | Cuándo |
|---|---|
| ★ | **Terminar la partida** (participación) |
| ★★ | **≥ 60 %** de las preguntas resueltas con ≤ 1 error cada una *o* mejorar su mejor resultado anterior |
| ★★★ | **≥ 85 %** a la primera |

- «Terminar» es lo que premia la persistencia; reintentar sigue valiendo (da la mitad de puntos, como hoy).
- **La exactitud real no se pierde:** el modo maestro sigue mostrando aciertos a la primera por habilidad. Las estrellas son motivación; los datos son para la maestra.
- *Por qué no simplemente «regalar» estrellas:* un premio sin relación con el esfuerzo se vuelve ruido. Terminar y mejorar **sí** son conductas que queremos reforzar.

**10.2 Nivel de partida por habilidad, independiente del grado.**
- Cada perfil guarda un `nivelContenido` (por área o por juego) además del `grado`. Esquema versionado con **migración** (los perfiles actuales siguen funcionando).
- **Misión de inicio** (≈ 2 minutos, presentada como aventura, no como examen): 6–8 preguntas que suben o bajan de dificultad rápido y fijan el punto de partida por habilidad. Reutiliza el `MotorAdaptativo` con un modo «búsqueda» (cambia de nivel más rápido que en juego normal).
- **El sistema decide solo** (petición de la maestra). El modo maestro **muestra** el nivel detectado por habilidad y, como extra opcional, permite **volver a lanzar la misión** de un niño.

**10.3 Escalones nuevos por debajo (Asteroides y Reloj/otros donde aplique).**
- Suma y resta: hasta **5**, hasta **10**, hasta **20** (con y sin pasar la decena); **tablas del 2, 5 y 10** como primer escalón de multiplicación; conteo de 2 en 2, de 5 en 5 y de 10 en 10.
- La escalera se prueba como las demás: respuesta recalculada de forma independiente y distractores que no sean también correctos.

**10.4 Modo tranquilo (Asteroides).** Es el único juego con **presión de tiempo**. Modo con asteroides más lentos y pocos, **sin** caída ni urgencia, activable por el niño, por la maestra o automáticamente tras 2 errores seguidos.

**10.5 Adaptación dentro de la sesión.** Tras 2 fallos seguidos, bajar un escalón *en la misma partida* y ofrecer una pista más visual (hoy el ajuste fino ocurre sobre todo entre partidas; a verificar en el código antes de tocarlo).

**Criterios de aceptación:** un perfil nuevo de 4.º que falla todo en la misión **empieza** en el escalón más bajo; ningún niño que **termina** una partida se queda con 0 estrellas; los perfiles guardados con la v0.1 se migran sin perder datos; todo con pruebas.

### Fase 12 — Música y color — ✅ hecha, ver [`AUDITORIA-FASE-12.md`](AUDITORIA-FASE-12.md)

**Música (técnica):** se **sintetiza en el navegador** con la Web Audio API (osciladores y envolventes), sin archivos de audio.
- *Por qué:* funciona **sin internet**, pesa **unos KB** y **no hay derechos de autor** que resolver (descargar música «gratis» y meterla en un proyecto escolar es un riesgo de licencias). *Costo:* suena «chiptune»/simple, no orquestal.
- 3–4 melodías en bucle (menú, juego tranquilo, juego animado, victoria), con **progresiones alegres** (escala pentatónica: suena bien casi sin importar la combinación).
- **Controles:** música y efectos **por separado**, volumen, y se **silencia mientras hay pausa o lectura en voz alta**. Como en el aula hay **bocinas** (no audífonos), la música **viene apagada** y la maestra la activa en el modo maestro («música en este equipo»); los efectos son cortos y bajos.
- Más efectos: toque de botones, estrella ganada, subir de nivel, mascota.

**Color y animación:**
- **Tema por área** (matemáticas azul, español naranja, medición morado…) con degradados y fondos animados (nubes, burbujas, estrellas) hechos en **CSS/SVG**.
- **Mascota** (SVG propio) que **reacciona**: celebra, anima tras un error («¡casi!»), duerme en pausa.
- **Confeti** al ganar estrellas y animación al **subir de nivel**; botones que «respiran» al pasar el mouse.
- **Colección de pegatinas** (álbum): cada partida terminada da una pegatina; **motivación sin castigo** y razón para volver.
- **Restricciones (no negociables):** `prefers-reduced-motion` desactiva el movimiento; **«modo ligero»** apaga fondos animados en PCs lentas; animaciones solo con `transform`/`opacity`; se mantiene el contraste WCAG (hay prueba) y el presupuesto de tamaño.

### Fase 13 — Taller de Cálculo (sumas y restas guiadas) — ✅ hecha, ver [`AUDITORIA-FASE-13.md`](AUDITORIA-FASE-13.md)

Primer juego **nuevo** de la v0.2 y el que cumple el **«andamiaje que se retira»** pendiente de la Fase 11: sumas, restas y problemas de 1.º a 6.º con **material para manipular** (marcos de diez, recta de saltos). La ayuda baja un escalón con cada acierto a la primera (material obligatorio → opcional → sin ayuda) y sube con cada error. Se simplificó respecto al diseño de tres modos de abajo: no hay modo «Aprende» aparte, porque «Ver cómo se hace» y la introducción ya enseñan desde dentro.

### Fase 14 — Bloques de Valor (valor posicional y llevadas) — ✅ hecha, ver [`AUDITORIA-FASE-14.md`](AUDITORIA-FASE-14.md)

Segundo juego nuevo de la v0.2: **leer y armar números con bloques** (unidades, decenas, centenas, millares), el **valor de cada cifra**, y las **llevadas y préstamos** como lo que son: «10 de una columna se cambian por 1 de la siguiente» y al revés. Usa el mismo andamiaje que se retira que «Taller de Cálculo» (ahora en `core/partidaConApoyo.js`). **Cambio respecto al diseño:** los bloques se manejan con **botones** (poner, quitar, «10 → 1», «1 → 10»), no con arrastre; ver el porqué en la auditoría.

### Fase 11 — Enseñar dentro de cada juego (la prioridad pedagógica) — ✅ hecha, ver [`AUDITORIA-FASE-11.md`](AUDITORIA-FASE-11.md)

Es el cambio que más responde a la queja. Se construye **una vez** el componente `Leccion` y se conecta a los juegos existentes:

- **«Ver cómo se hace»:** tras el **primer error** de una pregunta aparece (además de la pista) un botón que abre una **mini-lección animada de ese caso** (por ejemplo, `47 + 28`: descomponer, sumar decenas, sumar unidades, juntar). El niño puede **hacer el paso él mismo** con material (arrastrar bloques, mover una ficha en la recta).
- **Mini-lección al subir de escalón:** la primera vez que aparece una habilidad nueva, se muestra un ejemplo guiado de 20–30 segundos (se puede saltar).
- **Andamiaje que se retira:** al principio de una habilidad hay apoyos visuales; si el niño acierta, **desaparecen**; si falla, **vuelven**. *(Quedó para la Fase 13, donde se hizo en «Taller de Cálculo»; los demás juegos aún no lo tienen.)*
- Cada lección es **datos** (pasos y material), no código: añadir una es escribir una lista.
- *Por qué dentro del juego:* el niño aprende **cuando lo necesita**, justo después de equivocarse, que es cuando más atención presta.

### Fases 13–15 — Juegos nuevos que **enseñan** las operaciones

Los cuatro comparten una **estructura de tres modos**:

1. **Aprende** (sin puntaje): un ejemplo animado paso a paso y luego uno en el que el niño **hace** el paso con material arrastrable.
2. **Practica** (con apoyo): las ayudas visuales **van desapareciendo** conforme acierta (*andamiaje que se retira*).
3. **Reto** (con estrellas): la versión sin ayudas.

| Juego | Grados | Qué enseña | Material (concreto/pictórico) | Escalera de niveles (ejemplo) |
|---|---|---|---|---|
| **Sumas y restas guiadas** (F13, ✅ «Taller de Cálculo») | 1.º–6.º (según el nivel que detecte el sistema) | Sumar y restar como **juntar/quitar**; recta numérica; «hacer 10» | Objetos arrastrables a una caja; **marcos de 10**; **recta numérica** con un personaje que salta | Hasta 5 → 10 → 20 sin pasar → 20 pasando la decena → hasta 100 |
| **Valor posicional y llevadas** (F14, ✅ «Bloques de Valor») | 1.º–6.º (según el nivel) | **Valor posicional** y **llevadas** (acarreo) en suma y resta con préstamo | Bloques de unidades, decenas y centenas; «**10 unidades se cambian por 1 decena**» animado | 2 dígitos sin llevar → con llevada → 3 dígitos → resta con préstamo |
| **Tablas** (F15) | 1.º–6.º (según el nivel) | Multiplicar como **grupos iguales** y **arreglos** (filas × columnas); patrones de las tablas | Cajas con el mismo número de objetos; **cuadrícula** que se llena; conteo de 2 en 2, 5 en 5, 10 en 10 | Tablas 2, 5, 10 → 3, 4 → 6, 7, 8, 9 → ×10, ×100 |
| **Reparto** (F15) | 1.º–6.º (según el nivel) | Dividir como **repartir equitativamente** y **agrupar**; el residuo | Objetos que se reparten en grupos (arrastrar); sobrantes | Dividir entre 2, 5, 10 → exactas → con residuo → 2 dígitos |

- **Por qué estos y en este orden:** son la **cadena de prerrequisitos** (contar → sumar/restar → valor posicional → multiplicar → dividir). Cada eslabón se apoya en el anterior: si falla la suma con llevadas, la multiplicación de 2 cifras no tiene base.
- Se reutiliza **toda la infraestructura existente** (contrato `Juego`, `PartidaPreguntas`, motor adaptativo, voz, pruebas) y se añade **un solo componente nuevo**: la **lección** (pasos + material arrastrable accesible con teclado y táctil).
- **Pruebas:** como siempre, la respuesta de cada pregunta se **recalcula de forma independiente** y se juega **una partida completa en Chromium** por juego; el arrastre se prueba con el ratón real.

### Fase 16 — Pulido y segunda prueba

- Auditoría por fase, manual del maestro actualizado, ZIP **v0.2.0**.
- **Protocolo de observación** para la segunda prueba (una hoja de una página): qué mirar y qué anotar.
- **Métricas para decidir si funcionó:**

| Métrica | Meta |
|---|---|
| Niños que **terminan** una partida | ≥ 90 % |
| Niños que ganan **≥ 1 estrella** | ≥ 90 % (hoy: la mayoría 0) |
| Niños que **piden jugar otra vez** | observación de la maestra |
| Habilidades en las que el niño **sube de escalón** en 3 sesiones | tendencia creciente en el CSV |
| **Errores más frecuentes** por habilidad | lista para dirigir la enseñanza en clase |

> Para la última fila, añadiré un **registro local de errores comunes** (qué respuesta equivocada eligieron más) exportable en el modo maestro. Es dato **de enseñanza**: le dice a la maestra *qué confunden*, no solo *cuánto fallan*.

## 4. Orden recomendado y por qué

1. **Fase 10 primero.** Resuelve el problema que **ya observaste** (sin estrellas, sin punto de partida) y es **barato**. Con la v0.2-alfa puedes repetir la prueba con los mismos niños y comparar.
2. **Fase 11 enseguida.** Es la **queja principal** («no se enseña»). Con 10 + 11 tienes una v0.2 que **evalúa menos y enseña más**, usando los juegos que ya existen.
3. **Fase 12 (música y color)** después: lo que **pidieron los niños**. Con bocinas conviene medir el ruido.
4. **Fases 13–15 una por una**, cada una con su mini-prueba; **empezar por sumas y restas guiadas**, base de todo lo demás.
5. **Fase 16** al final.

*Alternativa si hay prisa (otra prueba en pocos días):* **10 + 11** ya cambian lo esencial; música y juegos nuevos pueden esperar.

## 5. Qué se queda igual

Funciona sin internet y con doble clic; JavaScript puro; pnpm con la misma política de seguridad; sin datos personales (solo apodo, avatar y grado); sin vidas ni *game over*; todo con pruebas y auditoría por fase.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Animaciones y música **ralentizan PCs viejas** | Solo `transform`/`opacity`, «modo ligero», medir en un navegador real y en la PC de la escuela antes de generalizar |
| **Ruido** en el aula (30 PCs con **bocinas**) | Música **apagada por omisión**; ajuste en el modo maestro «música en este equipo»; efectos cortos y bajos; sin música durante la lectura en voz |
| Las **estrellas «regaladas»** pierden valor | Se premia terminar y mejorar; la exactitud sigue visible para la maestra |
| La **misión de inicio** parece examen y asusta | Presentarla como aventura, sin nota ni fallo visible |
| **Contenido incorrecto para el grado** | Revisión docente (el mismo pendiente de v1; ahora más importante) |
| **Niños de 6.º que sienten que juegan «cosas de bebés»** | Estética **juvenil y neutra**, lenguaje de reto, nivel de contenido invisible (principio 7); validar con ellos |
| **Las lecciones se saltan sin leer** | Cortas, interactivas (el niño **hace** el paso) y solo en el momento en que las necesita |
| **Alcance grande** | Fases ordenadas por valor; se puede detener tras cualquiera sin romper lo anterior |

## 7. Preguntas abiertas

**Ya respondidas** (ver §1b): grado probado (6.º), queja principal (enseñar), tipo de equipos (Chrome, PCs de hace unos años), sonido (bocinas), nivel decidido por el sistema.

**Siguen abiertas** (no bloquean la Fase 10):

1. ¿Qué **operaciones** concretas vio la maestra que no dominan? (sumar con llevadas, tablas, dividir, fracciones…). Orienta qué lecciones escribir primero.
2. ¿Fallaron por **no saber la operación**, por **no entender el enunciado** o por **la prisa** de los asteroides?
3. ¿Las PCs tienen **pantalla táctil** o solo mouse? ¿Qué tan **grandes** son las pantallas?
4. ¿A los niños de 6.º les gustan más temas de **deportes, espacio, videojuegos, laboratorio…**? Ayuda a elegir el tema de los juegos nuevos.
5. ¿Hay **internet** en el aula en algún momento (por ejemplo, para publicar en GitHub Pages) o todo debe ir en USB?
