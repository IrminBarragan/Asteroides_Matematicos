# Auditoría — Fase 3: Asteroides Matemáticos

Arquitectura del juego: [`ARQUITECTURA.md`](ARQUITECTURA.md#anatomía-de-un-juego-ejemplo-asteroides-fase-3). Verificación: `pnpm test` (199 pruebas) y `pnpm build`.

## Qué se hizo

Asteroides se **reescribió** (no solo se movió) como juego del portal, con el contrato `Juego`. El código anterior (`GestorJuego` de ~800 líneas,
`GestorNivel`, `SistemaIA`, `CONFIG`, etc.), la página "legacy", Bootstrap y el juego de práctica temporal **se eliminaron**.

### Contenido por grado (1.º–6.º)

| Grado | Habilidades | Ejemplos |
|---|---|---|
| 1.º–2.º | suma, resta | `9 − 3`, `47 + 38` (hasta 20 / hasta 100) |
| 3.º | + multiplicación (tablas) | `7 × 8` (tablas 2/5/10 → 3/4/6 → 7/8/9) |
| 4.º | + división exacta | `56 ÷ 7`, `34 × 6` |
| 5.º | multiplicación, división, **operaciones combinadas**, **múltiplos** | `5 + 3 × 4`, `¿Cuál es múltiplo de 7?` |
| 6.º | combinadas, múltiplos, **decimales**, división | `3.7 + 2.5`, `(8 + 5) × 3` |

Cada habilidad tiene 3 niveles de dificultad que decide el motor adaptativo (sube con ≥ 85 % de dominio, baja con < 50 %).

### Reglas pensadas para niños (cambios respecto al juego original)

| Antes | Ahora | Por qué |
|---|---|---|
| 5 vidas, "game over" | **No hay vidas**: 10 preguntas y siempre termina | El miedo a perder compite con el aprendizaje |
| Fallar **aceleraba** los asteroides | Fallar da **pista** y se puede reintentar; nada se acelera | Presionar a quien tiene dificultad empeora el resultado |
| Respuestas incorrectas al azar | **Errores típicos** (±1, ±10, tabla equivocada, ir de izquierda a derecha en `a + b × c`, usar la operación contraria) | Un buen distractor mide comprensión; fallarlo informa al maestro |
| Asteroides a posiciones aleatorias (podían solaparse tras 50 intentos) | **Carriles**: cada uno cae por el suyo | Solapamiento imposible *por construcción* |
| Solo ratón | **Toque, ratón y teclado** (← → mover, ↑/espacio disparar, anillo punteado muestra el objetivo) | Pantallas táctiles y accesibilidad |
| Poderes: escudo, vida extra… | **Tiempo lento**, **puntos dobles**, **mitad** (retira 2 respuestas incorrectas) | Sin vidas, el escudo/vida extra no tienen sentido; "mitad" es estrategia matemática |
| Si se escapaba la respuesta: pierdes una vida | Se muestra **la respuesta y la pista** y se sigue | Aprender de lo que no se logró |

Puntaje: acierto a la primera = 10 (+5 si hay racha de 3+); acertar tras equivocarse = 5 (se premia no rendirse); los poderes duplican.
Cada pregunta cuenta **una sola vez** (acierto o fallo), por eso `aciertos + fallos = 10` y las estrellas reflejan la precisión.

## Decisiones de diseño (y alternativas)

### 1. Lógica pura separada de canvas/DOM
`logica/` (generadores, partida, campo) no sabe del navegador. **Por qué:** la parte que más importa —que `7 × 8 = 56` y que ninguna
pregunta sea imposible— se prueba con decenas de miles de casos en milisegundos. `juego.js` solo une piezas. **Alternativa** (un solo archivo grande,
como antes): más rápido de escribir, imposible de verificar.

### 2. Respuestas como enteros escalados (decimales)
`3.7 + 2.5` se calcula como `37 + 25 = 62` y se muestra como `6.2`. `0.1 + 0.2` en JavaScript da `0.30000000000000004`; con enteros esto no puede pasar.

### 3. Carriles en vez de "probar posiciones al azar"
Antes se reintentaba hasta 50 veces y se aceptaba la última aunque se tocaran. Con carriles, la distancia mínima entre centros es 100 px > 88 (2 × radio máximo)
**por construcción**; la prueba lo verifica con 4500 distribuciones.

### 4. Tiempo del juego = contador de pasos del bucle
Todo (transiciones, poderes, tiempo de respuesta) avanza con el `BucleJuego` de paso fijo; no hay `setTimeout`. **Consecuencia:** pausar detiene *todo*,
incluidos los poderes y el cronómetro. Verificado en navegador: dos minutos de pausa no cambian la pregunta.

### 5. Teclado con "objetivo más cercano"
El canvas no es accesible por naturaleza. El teclado dispara al asteroide más cercano en horizontal a la nave (y lo marca con un anillo), así un niño
sin ratón puede jugar con la misma mecánica de "mover la nave y disparar". El HUD (pregunta, puntos, mensajes) está en **DOM** con `aria-live`, no dibujado en el canvas.

### 6. Área táctil adaptable
En pantallas pequeñas los asteroides se ven chicos. La tolerancia al toque crece cuando el canvas se reduce (≈ 18 px reales) y se elige el asteroide
**de centro más cercano** al toque (no "el último dibujado") para que dos zonas ampliadas que se traslapan no den un resultado arbitrario.

## Cómo se verificó

- **199 pruebas** (`pnpm test`). Aspectos relevantes:
  - Toda respuesta de toda combinación grado × habilidad × nivel (más de 15 000 preguntas por corrida) se **verifica con un evaluador aritmético independiente**.
  - Distractores únicos, enteros, ≥ 0; en "múltiplos" **ninguno** es múltiplo; decimales con el formato correcto.
  - La partida siempre termina y `aciertos + fallos = N` bajo 4 patrones de juego distintos.
- **Mutaciones** (cambios deliberados al código): restas con resultado negativo, jerarquía de operaciones ignorada, carriles con holgura excesiva,
  error que resta puntos, fallo contado doble, distractores negativos → **todas detectadas**. Una sobrevivió al principio (el puntaje total tras recuperarse de un error
  no se comprobaba) y se añadió la comprobación.
- **Navegador real (Chromium, `file://`)**: toque en error (pista, sin penalización) y en acierto con el dedo, pausa que congela la partida, teclado (mover y disparar),
  partida completa hasta el resultado, móvil (390 px, sin desborde), recorrido por el portal con reloj simulado (pausa con Escape, salir con confirmación, partida con las 10
  respuestas escapándose, "Jugar otra vez", contenido de 1.º y 6.º, habilidades en modo maestro). 0 errores de consola, 0 peticiones a internet.
- **Rendimiento:** dibujar un cuadro con 6 explosiones activas cuesta ≈ 1.8 ms (presupuesto de 16 ms); 60 fps.

## Error mío de la Fase 0 encontrado y corregido

`particula.js` usaba `Utilidades` sin importarlo (lo dejé así al convertir a módulos). Crear una explosión lanzaba `ReferenceError`. Ninguna prueba
lo ejercitaba. Corregido, con `tests/particula.test.js`. Detalle en [`AUDITORIA-FASE-0.md`](AUDITORIA-FASE-0.md#corrección-posterior-descubierta-en-la-fase-3).

## Conceptos que deberías poder explicar

- Por qué no hay vidas ni aceleración al fallar (argumento pedagógico) y qué dato da fallar a un distractor "de error típico".
- Por qué los decimales se manejan como enteros escalados (punto flotante).
- Qué garantiza el diseño por carriles frente a "probar y reintentar".
- Por qué el estado del juego avanza con el bucle y no con `setTimeout` (pausa gratis, determinismo).
- Cómo se verifica una pregunta generada sin usar el mismo código que la generó (evaluador independiente).
- Cómo decide el motor adaptativo qué nivel y qué habilidad toca, y por qué no es "inteligencia artificial" opaca sino una heurística explicable.

## Cómo revisar (orden sugerido)

1. `src/games/asteroides/logica/partida.js` y `tests/partida.test.js` (las reglas).
2. `src/games/asteroides/logica/generadores.js` y `tests/generadores.test.js` (el contenido; revisa que los rangos por grado te parezcan correctos pedagógicamente).
3. `src/games/asteroides/juego.js` (cómo se une todo; entrada y bucle).
4. `src/games/asteroides/logica/campo.js` (carriles, velocidad).

**Pídele a una maestra o maestro que revise los rangos de `generadores.js`** (tablas `TOPE_SUMA`, `GRUPOS_TABLA`, `MULT_RANGOS`, `DIV_RANGOS`): son la parte del programa
que más depende de criterio pedagógico y es la más fácil de ajustar (solo números).

## Limitaciones conocidas

- **Teléfonos en vertical:** funciona (toque ampliado, sin desborde), pero los asteroides se ven chicos; el objetivo principal son PCs y tabletas.
- Los sonidos son sintéticos (pitidos); no hay música ni voz. La lectura asistida está pendiente (Fase 8).
- El motor adaptativo guarda el nivel por habilidad; si un niño cambia de grado conserva los niveles de las habilidades que se repiten (suma, resta…).
- Las pruebas de navegador son guiones manuales (no están en el repositorio); se automatizan en la Fase 8.
