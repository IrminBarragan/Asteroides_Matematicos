# Qué debe revisar una maestra o maestro antes de usar el portal

**El contenido lo escribió una IA y lo auditó (con pruebas) un estudiante: nadie con formación docente lo ha validado.** Es el pendiente más importante de la v0.2. Esta guía junta, en un solo lugar, **qué mirar, dónde está y qué preguntar**, para que la revisión lleve una hora por juego y no días.

**Cómo revisar:** abrir el juego y jugarlo como niño de cada grado, **o** leer la constante indicada (son listas cortas). Anotar cambios en la columna «Cambiar» y pasarlos a quien mantiene el código.

**Tres preguntas para todo:** (1) ¿Es **correcto**? (2) ¿Es **de este grado** según el programa que usa la escuela? (3) ¿Se **entiende** el lenguaje para un niño de ese grado?

## Lo más urgente

| # | Qué | Dónde | Preguntas |
|---|---|---|---|
| 1 | **Misión de inicio**: 8 preguntas, sube y baja de grado de contenido | `src/adaptativo/colocacion.js` | ¿8 preguntas bastan para ubicar a un niño? ¿Con qué grado debe empezar un niño de 6.º que no domina lo básico? |
| 2 | **Qué sube y baja de nivel**: sube con ≥ 85 % de aciertos sostenidos, baja con < 50 % | `src/adaptativo/motor.js` | ¿Esos umbrales son razonables para primaria? |
| 3 | **Estrellas**: 3 si ≥ 90 %, 2 si ≥ 60 %, 1 si resolvió al menos una | `src/core/resultado.js` | ¿Es justo premiar así el esfuerzo? |

## Por juego

| Juego | Qué revisar | Dónde |
|---|---|---|
| **Asteroides Matemáticos** | Qué operaciones y tamaños de número van en cada grado (tablas, división, combinadas, múltiplos, decimales) | `src/games/asteroides/logica/generadores.js` |
| **Memorama de Palabras** | Las palabras, sílabas, rimas, sinónimos y antónimos de 1.º a 3.º | `src/games/memorama/logica/contenido.js` |
| **Reloj Aventurero** | Qué se pregunta en cada nivel (en punto, media, cuartos, minutos, 24 horas) y el vocabulario | `src/games/reloj/logica/generadores.js` |
| **Atrapa la Ortografía** | Las palabras por regla y grado (b/v, g/j, h, c/s/z, ll/y, acentos, homófonos); **¿hay alguna palabra mal escrita, mal clasificada o muy difícil?** | `src/games/ortografia/logica/contenido.js` |
| **Tren de Fracciones** | `DENOMINADORES`, `MODOS_COMPARAR`, `MODOS_SUMA`, `FACTORES`, `SIMPLIFICAR`, `MIXTAS`; el lenguaje («2 cuartos», «3 entre 12») | `src/games/fracciones/logica/generadores.js` |
| **Taller de Cálculo** | `ESCALAS` (hasta qué número por grado), los niveles (cruzar la decena en 2.º; llevada y préstamo en 3.º–6.º) y el lenguaje de los **problemas** (`PLANTILLAS`) | `src/games/calculo/logica/generadores.js` |
| **Bloques de Valor** | `ESCALAS`, los niveles (ceros, varias llevadas) y el lenguaje («cambia 10 por 1») | `src/games/bloques/logica/generadores.js` |
| **Cajas y Reparto** | `TABLAS` (qué tablas en cada grado y nivel), los topes de objetos y el lenguaje («se reparten… en partes iguales entre… platos») | `src/games/cajas/logica/generadores.js` |

## Las lecciones (todas)

Lo que el niño lee en «Ver cómo se hace» y en las introducciones. **¿Explican bien el porqué?** Frases como «10 unidades se cambian por 1 decena», «el residuo siempre es menor que el divisor», «completar 10», «descomponer».

| Qué | Dónde |
|---|---|
| Suma, resta, multiplicación, división, orden de operaciones, múltiplos, decimales, problemas | `src/lecciones/aritmetica.js` |
| Valor posicional, llevada, préstamo con bloques | `src/lecciones/bloques.js` |
| Residuo | `src/lecciones/cajas.js` |
| Ejemplo resuelto genérico (relojes, fracciones, ortografía) | `src/lecciones/ejemplo.js` |

## Las equivocaciones con nombre

El modo maestro muestra «Lo que más confunden» con nombres como **«olvidó la llevada»**, **«restó al revés cada columna»**, **«sumó en vez de multiplicar»**, **«dio el residuo en vez del cociente»**. **¿Describen bien lo que hace un niño?** ¿Falta alguna equivocación típica que usted vea en clase? Están en `error:` dentro de cada generador (busque «error:»).
*Solo los tres juegos nuevos tienen estas etiquetas; los demás cuentan las equivocaciones como «otra equivocación».*

## Qué hacer con lo que se encuentre

- **Un error de contenido** (palabra mal escrita, regla mal aplicada, operación incorrecta): anotar juego, grado, nivel y la pregunta exacta (captura de pantalla). Es lo más grave: se corrige primero.
- **Contenido de otro grado**: anotar a qué grado debería ir.
- **Lenguaje confuso**: anotar cómo lo diría usted a sus alumnos.
- **Falta algo** que se enseña en el grado: anotarlo (no se promete hacerlo todo, pero se prioriza).
