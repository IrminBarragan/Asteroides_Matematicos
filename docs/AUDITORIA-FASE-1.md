# Auditoría — Fase 1: Núcleo compartido

Contexto y diagrama: [`ARQUITECTURA.md`](ARQUITECTURA.md). Verificación: `pnpm test` (133 pruebas) y `pnpm build`.

## Qué se hizo

Módulos nuevos, todos **sin dependencia de ningún juego**: `eventos`, `bucle`, `entrada`, `storage`, `resultado`,
`juego` (contrato), `registro`, y `adaptativo/motor`. Se mejoró `gestorAudio` (reanudar contexto, ajuste inicial,
efectos desconocidos no crean nodos). El juego Asteroides **no se tocó**: se migra al contrato en la Fase 3.

## Decisiones de diseño (y alternativas descartadas)

### 1. Bucle de paso fijo (`bucle.js`)
- **Problema real del código anterior:** `actualizar()` corría una vez por cuadro. En un monitor de 144 Hz el juego
  iba 2.4× más rápido; en una PC lenta a 30 fps, en cámara lenta.
- **Solución:** acumulador de tiempo; la lógica avanza en pasos de 1/60 s. Se dibuja una vez por cuadro.
- **Tope `maxDelta` (250 ms):** si la pestaña estuvo oculta un minuto, no se ejecutan 3600 pasos de golpe ("espiral de la muerte").
- **Alternativa:** multiplicar movimientos por `delta` variable. Más simple, pero hace la lógica dependiente del tiempo
  de cada cuadro (resultados distintos en cada máquina, difícil de probar). El paso fijo es determinista.
- Pruebas: 60 Hz = 144 Hz = 30 Hz en pasos lógicos; congelamiento largo; cancelar durante `actualizar`.

### 2. Entrada con Pointer Events (`entrada.js`)
- Un solo conjunto de eventos cubre mouse, táctil y lápiz. **Alternativa** (mouse + `touchstart`/`touchmove`) duplica
  código y genera clics fantasma en pantallas táctiles.
- `touch-action: none` evita que el navegador interprete el arrastre como scroll/zoom.
- `aCoordenadasLogicas` convierte pantalla → coordenadas del juego (el canvas se dibuja a 900×600 pero el CSS lo escala).
  Es una función pura: así se prueba sin navegador.
- `EntradaTeclado` por **acciones** (`izquierda`) en vez de teclas; limpia las teclas al perder el foco (si no, la nave queda "pegada").

### 3. Varios perfiles por equipo (`storage.js`)
- En una PC de primaria juegan muchos niños; un perfil único se pisaría. Límite de 40 perfiles.
- Esquema versionado + migraciones: si el formato cambia, no se pierde el progreso.
- **Defensa en profundidad:** los datos de `localStorage` se tratan como *no confiables* (un niño puede editarlos desde F12):
  se valida el esquema completo al cargar y el motor adaptativo acota valores al importar.
- Falla "en silencio y con gracia": localStorage lleno/bloqueado/dañado ⇒ sigue en memoria y se conserva copia del dato dañado.
- El apodo se limpia (`<`, `>`, caracteres de control) y se mostrará siempre con `textContent`, nunca `innerHTML`.

### 4. Contrato `Juego` con método plantilla (`juego.js`)
- Los métodos públicos controlan el estado; cada juego implementa *ganchos* (`alMontar`, `alDestruir`…).
  **Por qué:** un juego no puede olvidarse de cambiar de estado ni de limpiar el bus; el portal puede confiar en el ciclo de vida.
- `destruir()` limpia aunque `alDestruir()` falle (`try/finally`), para no dejar fugas entre juegos.
- **Alternativa:** una interfaz "pura" (cada juego implementa todo). Más flexible, pero cada autor puede equivocarse en lo repetitivo.

### 5. Motor adaptativo por habilidad (`adaptativo/motor.js`)
- Generaliza el `SistemaIA` (solo 4 operaciones). Una *habilidad* es cualquier cosa medible.
- **Heurística explicable**, no aprendizaje automático: ventana de intentos + umbrales (sube ≥ 85 %, baja < 50 %).
  Se puede justificar en una defensa y se prueba con exactitud (hay pruebas de los límites exactos).
- **No castiga:** baja la dificultad y ofrece pista tras 2 fallos seguidos; no acelera nada ni quita premios.
- `elegirHabilidad` usa pesos (1 a 4): las habilidades débiles salen más, pero todas pueden salir (variedad).
- `aleatorio` es un parámetro → la selección es determinista en las pruebas.

## Cómo se verificó

- **133 pruebas** (`pnpm test`) con `node:test`. Para validar que las pruebas sirven se hicieron *mutaciones* a mano
  (cambiar `while` por `if` en el bucle, `>=` por `>` en un umbral, quitar el escalado de coordenadas…): **cada mutación hizo fallar
  al menos una prueba**. Dos mutantes sobrevivieron al principio → se añadieron pruebas (monitor de 30 Hz y límites exactos 85 %/50 %).
- **Navegador real** (Chromium, `file://`): bucle con `requestAnimationFrame` real = 59 pasos/s; toque y clic de mouse
  reportan coordenadas lógicas correctas con el canvas escalado y desplazado; `localStorage` persiste; el audio queda en `running`.

## Conceptos que deberías poder explicar

- Por qué un paso de tiempo fijo hace el juego idéntico en cualquier máquina (y por qué hay que limitar `maxDelta`).
- Qué es un método plantilla y qué garantiza el contrato frente a una interfaz sin lógica.
- Por qué `localStorage` es entrada **no confiable** y qué validaciones se hacen.
- Diferencia entre **coordenadas de pantalla** y **coordenadas lógicas**, y por qué sin convertir los clics fallan al escalar.
- Por qué las estrellas totales suman la mejor marca por juego.

## Cómo revisar (orden sugerido, de más a menos importante)

1. `src/core/juego.js` y `docs/ARQUITECTURA.md` (el contrato: todo lo demás depende de él)
2. `src/core/bucle.js` + `tests/bucle.test.js`
3. `src/core/storage.js` + `tests/storage.test.js`
4. `src/adaptativo/motor.js` + `tests/motor.test.js`
5. `src/core/entrada.js`

## Deuda conocida

- Asteroides sigue con su bucle, su entrada de mouse y el `SistemaIA` antiguo → se migra en la Fase 3 (y `sistemaia.js` se elimina).
- `EntradaPuntero` y `BucleJuego` están verificados en navegador real mediante un script de pruebas manual; la prueba
  automatizada de humo en Chromium headless se agrega en la Fase 8.
- Lectura asistida (`speechSynthesis`) queda como ajuste guardado pero aún sin implementar → Fase 8.
