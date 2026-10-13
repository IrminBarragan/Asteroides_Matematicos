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

## 2. Principios del rediseño (y por qué)

1. **Desacoplar «grado» de «nivel de contenido».** El grado dice dónde está el niño en la escuela; el **nivel de partida** dice qué sabe hacer. Un niño de 5.º puede jugar contenido de 2.º sin que sea humillante ni se note.
2. **Todo niño que se esfuerza gana algo.** Las estrellas deben medir **participación y progreso**, no solo perfección. La exactitud sigue existiendo, pero **para la maestra** (datos honestos), no como castigo.
3. **Primero entender, luego practicar, luego demostrar.** El enfoque **concreto → pictórico → abstracto** (CPA, de la didáctica de las matemáticas): se **manipulan objetos**, luego se ven dibujos, y solo después aparece el símbolo (`3 + 4 = 7`). Cada juego nuevo tendrá modo **Aprende** (sin puntaje) antes de **Practica** y **Reto**.
4. **Dificultad que se adapta *dentro* de la sesión y *entre* sesiones**, con una escalera de niveles más fina por debajo.
5. **Motivación sin presión:** música, color, mascota que reacciona, colección de pegatinas. Nada de cronómetros nuevos ni vidas.
6. **Nada de lo bonito puede romper lo existente:** funciona sin internet, en PCs viejas, accesible (movimiento reducido, contraste, teclado) y dentro del presupuesto de tamaño.

## 3. Fases

| Fase | Nombre | Contenido | Entrega |
|---|---|---|---|
| **10** | **Rescate** | Nueva regla de estrellas · nivel de partida independiente del grado · misión de inicio (diagnóstico) · escalones nuevos por debajo (suma y resta hasta 10 y 20; tablas del 2, 5 y 10) · «modo tranquilo» en Asteroides · la maestra puede ajustar el nivel de cada niño | **v0.2-alfa:** se puede volver a probar con los mismos niños |
| **11** | **Música y color** | Música de fondo generada en el navegador (sin archivos) · volumen de música y de efectos por separado · mascota animada que reacciona · confeti y celebraciones · fondos animados por área · «modo ligero» para PCs lentas | v0.2-beta |
| **12** | **Aprende primero** | Infraestructura de **lecciones** (pasos guiados, material arrastrable, recta numérica) + **Granja de Sumas** (sumar y restar con objetos) | Primer juego que enseña |
| **13** | **Casa de las Decenas** | Valor posicional con bloques y **llevadas** animadas | Juego 2 |
| **14** | **Fábrica de Tablas** | Multiplicar como **grupos iguales y arreglos** + tablas | Juego 3 |
| **15** | **Reparto Justo** | Dividir como **repartir** y agrupar, con residuo | Juego 4 |
| **16** | **Pulido y piloto 2** | Auditorías, pruebas, manual actualizado, ZIP v0.2.0, **protocolo de observación** para la segunda prueba con niños | v0.2.0 |

Cada fase termina con commits separados, pruebas en verde (unitarias **y** de navegador) y su `docs/AUDITORIA-FASE-N.md`, como hasta ahora.

### Fase 10 — Rescate (lo más urgente)

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
- **Modo maestro:** poder **fijar** el nivel de un niño («jugar contenido de 2.º») y volver a lanzar la misión.

**10.3 Escalones nuevos por debajo (Asteroides y Reloj/otros donde aplique).**
- Suma y resta: hasta **5**, hasta **10**, hasta **20** (con y sin pasar la decena); **tablas del 2, 5 y 10** como primer escalón de multiplicación; conteo de 2 en 2, de 5 en 5 y de 10 en 10.
- La escalera se prueba como las demás: respuesta recalculada de forma independiente y distractores que no sean también correctos.

**10.4 Modo tranquilo (Asteroides).** Es el único juego con **presión de tiempo**. Modo con asteroides más lentos y pocos, **sin** caída ni urgencia, activable por el niño, por la maestra o automáticamente tras 2 errores seguidos.

**10.5 Adaptación dentro de la sesión.** Tras 2 fallos seguidos, bajar un escalón *en la misma partida* y ofrecer una pista más visual (hoy el ajuste fino ocurre sobre todo entre partidas; a verificar en el código antes de tocarlo).

**Criterios de aceptación:** un perfil nuevo de 4.º que falla todo en la misión **empieza** en el escalón más bajo; ningún niño que **termina** una partida se queda con 0 estrellas; los perfiles guardados con la v0.1 se migran sin perder datos; todo con pruebas.

### Fase 11 — Música y color

**Música (técnica):** se **sintetiza en el navegador** con la Web Audio API (osciladores y envolventes), sin archivos de audio.
- *Por qué:* funciona **sin internet**, pesa **unos KB** y **no hay derechos de autor** que resolver (descargar música «gratis» y meterla en un proyecto escolar es un riesgo de licencias). *Costo:* suena «chiptune»/simple, no orquestal.
- 3–4 melodías en bucle (menú, juego tranquilo, juego animado, victoria), con **progresiones alegres** (escala pentatónica: suena bien casi sin importar la combinación).
- **Controles:** música y efectos **por separado**, volumen, y se **silencia mientras hay pausa o lectura en voz alta**. Valor por omisión **bajo** (una sala con 30 niños + música alta es un problema real: confirmarlo con la maestra, §7).
- Más efectos: toque de botones, estrella ganada, subir de nivel, mascota.

**Color y animación:**
- **Tema por área** (matemáticas azul, español naranja, medición morado…) con degradados y fondos animados (nubes, burbujas, estrellas) hechos en **CSS/SVG**.
- **Mascota** (SVG propio) que **reacciona**: celebra, anima tras un error («¡casi!»), duerme en pausa.
- **Confeti** al ganar estrellas y animación al **subir de nivel**; botones que «respiran» al pasar el mouse.
- **Colección de pegatinas** (álbum): cada partida terminada da una pegatina; **motivación sin castigo** y razón para volver.
- **Restricciones (no negociables):** `prefers-reduced-motion` desactiva el movimiento; **«modo ligero»** apaga fondos animados en PCs lentas; animaciones solo con `transform`/`opacity`; se mantiene el contraste WCAG (hay prueba) y el presupuesto de tamaño.

### Fases 12–15 — Juegos que **enseñan** las operaciones

Los cuatro comparten una **estructura de tres modos**:

1. **Aprende** (sin puntaje): un ejemplo animado paso a paso y luego uno en el que el niño **hace** el paso con material arrastrable.
2. **Practica** (con apoyo): las ayudas visuales **van desapareciendo** conforme acierta (*andamiaje que se retira*).
3. **Reto** (con estrellas): la versión sin ayudas.

| Juego | Grados | Qué enseña | Material (concreto/pictórico) | Escalera de niveles (ejemplo) |
|---|---|---|---|---|
| **Granja de Sumas** (F12) | 1.º–3.º | Sumar y restar como **juntar/quitar**; recta numérica; «hacer 10» | Animales y objetos arrastrables a un corral; **ten-frame** (marcos de 10); **ranita** que salta en la recta | Hasta 5 → 10 → 20 sin pasar → 20 pasando la decena → hasta 100 |
| **Casa de las Decenas** (F13) | 2.º–4.º | **Valor posicional** y **llevadas** (acarreo) en suma y resta con préstamo | Bloques de unidades, decenas y centenas; «**10 unidades se cambian por 1 decena**» animado | 2 dígitos sin llevar → con llevada → 3 dígitos → resta con préstamo |
| **Fábrica de Tablas** (F14) | 3.º–5.º | Multiplicar como **grupos iguales** y **arreglos** (filas × columnas); patrones de las tablas | Cajas con el mismo número de objetos; **cuadrícula** que se llena; conteo de 2 en 2, 5 en 5, 10 en 10 | Tablas 2, 5, 10 → 3, 4 → 6, 7, 8, 9 → ×10, ×100 |
| **Reparto Justo** (F15) | 4.º–6.º | Dividir como **repartir equitativamente** y **agrupar**; el residuo | Galletas que se reparten en platos (arrastrar); sobrantes | Dividir entre 2, 5, 10 → exactas → con residuo → 2 dígitos |

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
2. **Fase 11 después.** Responde lo que **pidieron los niños** y sube la atención; tiene riesgo técnico (PCs viejas) y conviene medirlo.
3. **Fases 12–15 una por una**, cada una con su mini-prueba. Son las más grandes; **empezar por Granja de Sumas** porque es la base de todo lo demás.
4. **Fase 16** al final.

*Alternativa si hay prisa (por ejemplo, otra prueba en pocos días):* hacer **10 + parte de 11** (música y mascota) y dejar los juegos nuevos para después.

## 5. Qué se queda igual

Funciona sin internet y con doble clic; JavaScript puro; pnpm con la misma política de seguridad; sin datos personales (solo apodo, avatar y grado); sin vidas ni *game over*; todo con pruebas y auditoría por fase.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Animaciones y música **ralentizan PCs viejas** | Solo `transform`/`opacity`, «modo ligero», medir en un navegador real y en la PC de la escuela antes de generalizar |
| **Ruido** en el aula (30 niños con música) | Música baja por omisión, interruptor visible, consultar a la maestra |
| Las **estrellas «regaladas»** pierden valor | Se premia terminar y mejorar; la exactitud sigue visible para la maestra |
| La **misión de inicio** parece examen y asusta | Presentarla como aventura, sin nota ni fallo visible |
| **Contenido incorrecto para el grado** | Revisión docente (el mismo pendiente de v1; ahora más importante) |
| Se **estigmatiza** al niño por jugar «contenido de grados menores» | El nivel es invisible para él: ve juegos y niveles, no «grado 2» |
| **Alcance grande** | Fases ordenadas por valor; se puede detener tras cualquiera sin romper lo anterior |

## 7. Preguntas abiertas (me ayudarían a acertar)

Para ti y la maestra, **no hace falta tener todo**:

1. ¿Qué **grados** probaste y cuántos niños? ¿Hubo niños de 1.º–2.º que sí pudieron?
2. ¿Qué **operaciones concretas** fallaron? (¿sumar hasta 20? ¿sumar con llevadas? ¿las tablas? ¿dividir?). Aunque sea una lista aproximada de lo que vio la maestra.
3. ¿Fue por **no saber** la operación, por **no entender** la pregunta/lectura, o por **la prisa** de los asteroides?
4. ¿Se puede poner **música** en el aula? ¿Tienen **audífonos** o solo bocinas?
5. ¿Cómo son las **PCs** (año, navegador, pantalla táctil o mouse)? Condiciona el «modo ligero».
6. ¿La **maestra** quiere poder fijar el nivel de cada niño, o prefiere que el sistema lo decida solo?
