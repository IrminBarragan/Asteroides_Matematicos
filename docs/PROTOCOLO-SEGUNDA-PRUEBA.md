# Protocolo de observación — segunda prueba con niños (v0.2.0)

**Objetivo:** saber si la v0.2 resolvió lo que se vio en la primera prueba (sin estrellas, no dominaban lo básico, «no se enseña, solo se evalúa»), **comparando con los mismos niños y el mismo grupo** (6.º). No es un examen para los niños: se prueba el portal.

## 0. Antes (30 min, en una computadora de la escuela, sin niños)

- [ ] Abrir `index.html` con doble clic desde el ZIP extraído (no desde el ZIP). Crear un jugador de prueba, jugar un minuto de **cada** juego y **borrarlo** después (Modo maestro → Eliminar).
- [ ] **Probar la voz** («Escuchar»): ¿hay voz en español? Si no hay botón, está bien (el juego funciona igual).
- [ ] **Probar la música** (Modo maestro → Música de fondo → Sí → volumen **Bajo**): ¿suena bien por la bocina? **Con 30 equipos a la vez** suele ser mucho: decidir si se enciende. Por omisión viene apagada.
- [ ] **Ver si va fluido** (que no se trabe al cambiar de pantalla). Si va lento: Modo maestro → **Modo ligero**.
- [ ] Anotar: navegador y versión, resolución de pantalla, si hay pantalla táctil.
- [ ] Modo maestro → **Borrar todo el progreso** para empezar limpio (o conservar el de la primera prueba si se quiere comparar a los mismos niños: en ese caso, usar **Repetir misión** de cada niño).

## 1. Durante (25–30 min de juego libre, con una persona observando por cada ~5 niños)

**Reglas del observador:** no explicar el juego, no dar respuestas, no corregir. Si un niño pide ayuda, anotarlo y decirle «prueba tú». Solo intervenir si hay un fallo técnico (pantalla en blanco): anotarlo.

Observar y anotar (marcar ✔ cuando ocurra; usar la hoja de abajo):

| ¿Qué mirar? | Por qué importa |
|---|---|
| **¿Entiende qué hacer sin que se lo digan?** (la consigna, los botones) | Si no, el problema es de la pantalla, no del niño |
| **¿Usa el material** (fichas, recta, bloques, cajas, platos) o lo ignora? | El material es lo que enseña; si lo ignora, ¿por qué? |
| **¿Lee las lecciones** («Ver cómo se hace», introducción) o las **salta** sin leer? | Si las salta siempre, son largas o no se ven útiles |
| **¿Pide «Ver cómo se hace»** tras equivocarse? | ¿Descubre que existe? |
| **¿Se frustra o abandona?** ¿En qué pregunta? | Marca dónde la dificultad es excesiva |
| **¿Se ríe, se emociona, comenta?** ¿Pide **jugar otra vez**? | Es la señal más fuerte de interés |
| **¿Se aburre** (preguntas fáciles)? | El sistema debería haber subido el nivel |
| **¿Qué juego elige primero?** ¿Cuál repite? | Qué atrae (y por qué) |
| **Música y color:** ¿comentan algo? | Lo que pidieron en la primera prueba |

## 2. Hoja de anotación por niño (una fila por niño)

| Niño (apodo) | Juegos que jugó | ¿Terminó partida? | ¿Pidió repetir? | ¿Usó el material? | ¿Leyó lecciones? | Momento de frustración (juego y pregunta) | Frase que dijo (literal) |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 3. Al terminar: datos del Modo maestro

Modo maestro → descargar **los tres CSV** (`progreso.csv`, `habilidades.csv`, `equivocaciones.csv`) y **tomar una captura de «Lo que más confunden»**. Guardarlos con la fecha. Sin nombres reales: solo apodos.

## 4. Cómo decidir si funcionó (metas de `PLAN-V2.md`)

| Métrica | Meta | De dónde sale |
|---|---|---|
| Niños que **terminan** una partida | ≥ 90 % | `progreso.csv`: niños con `partidas` ≥ 1 / niños que jugaron |
| Niños que ganan **≥ 1 estrella** | ≥ 90 % (en la 1.ª prueba: la mayoría, 0) | `progreso.csv`: `mejores_estrellas` ≥ 1 |
| Niños que **piden jugar otra vez** | observación | Hoja de anotación |
| Habilidades en que **sube de escalón** | tendencia creciente (con varias sesiones) | `habilidades.csv`: `nivel` |
| **Qué confunden** | lista para dirigir la clase | `equivocaciones.csv` y «Lo que más confunden» |

**Lectura rápida:**
- **Muchas estrellas, pero nadie usó el material ni las lecciones** → los niños avanzan por ensayo y error: revisar si el material invita a usarse.
- **Pocas estrellas en un juego concreto** → su nivel inicial (misión de inicio) o el contenido de ese grado está mal calibrado: revisar con [`REVISION-DOCENTE.md`](REVISION-DOCENTE.md).
- **Una equivocación domina en «Lo que más confunden»** (p. ej. «olvidó la llevada») → es tema para la **clase**, no para el portal: la maestra puede trabajarlo y repetir la medición.
- **Se frustran en la misma pregunta** → anotar juego, nivel y pregunta: es un defecto del contenido.

## 5. Cinco preguntas para los niños (al final, en grupo, sin juzgar)

1. ¿Cuál fue tu juego favorito? ¿Por qué?
2. ¿Hubo algo que no entendiste qué hacer?
3. ¿Aprendiste algo que no sabías? ¿Qué?
4. ¿Cuál te pareció muy fácil o muy difícil?
5. ¿Qué le cambiarías o qué le agregarías?

## 6. Límites de esta prueba (para no sacar conclusiones de más)

- Es **una sesión corta**: sirve para ver si se entiende y si engancha, **no** para medir aprendizaje. Para eso hacen falta varias sesiones y una evaluación aparte.
- Los niños saben que los observan: parte del interés es novedad.
- Los **CSV** cuentan lo que pasó dentro del portal, no lo que el niño sabe fuera de él.
