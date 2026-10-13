# Auditoría — Fase 8: pulido y calidad

Verificación: `pnpm test` (416 pruebas), `pnpm test:e2e` (28 pruebas en Chromium real) y `pnpm build`. Guía completa de pruebas: [`PRUEBAS.md`](PRUEBAS.md).

## Qué se hizo

1. **Pruebas de navegador automatizadas dentro del repo** (`tests-e2e/`, `playwright-core`): abren `dist/index.html` por `file://` como en la escuela y vigilan 0 errores de consola, 0 errores de página y 0 peticiones no locales.
2. **Lectura en voz alta** (`core/voz.js`): botón «Escuchar» y «Lectura automática» (lee cada pregunta nueva). Degrada con gracia: sin voz en español no se muestra nada.
3. **Accesibilidad:** prueba de contraste WCAG sobre los colores reales del CSS (se corrigió el anillo de foco), barra del juego que no desborda en móvil.
4. **Rendimiento:** build minificado (`app.js` de 275 KB a 163 KB; 50 KB comprimido) y **presupuesto de tamaño** vigilado por una prueba.

## Decisiones de diseño

### 1. Dos capas automáticas, cada una con su trabajo
Las unitarias (2 s) prueban lógica; las e2e (~2 min) prueban el producto. La razón es histórica: en la Fase 6 un `append(arreglo)` dejó sin botones el Reloj y 341 pruebas no lo vieron.
**Se comprobó que ahora sí se detecta:** reintroduje ese mismo error en Fracciones y 4 de 5 pruebas e2e fallaron (mutación manual; se restauró).

### 2. `playwright-core`, no `playwright`
Solo el controlador, **sin descargar navegadores** (coherente con la política de seguridad del proyecto: pocas dependencias, sin scripts de instalación). El Chromium se busca en `CHROMIUM_PATH` o rutas comunes; si no hay, las pruebas se **omiten** y lo dicen (no fallan en un equipo sin navegador).

### 3. Jugar «sin saber las respuestas»
La prueba de partida completa prueba los botones en orden hasta acertar (cada error da pista y se puede reintentar) y para «pintar» lee el numerador del enunciado. Así recorre error → pista → acierto → siguiente → resultados sin conocer el generador, y funciona para cualquier contenido futuro.

### 4. La voz solo se ofrece si de verdad sonaría
Mi primera versión mostraba los botones siempre que existiera `speechSynthesis`. **El Chromium sin interfaz tiene la API pero cero voces:** habría botones mudos. Ahora `disponible` exige **una voz en español**, entre ellas se prefieren las **locales** (las voces «en línea» de algunos navegadores no suenan sin internet) y se escuchan los cambios tardíos (`voiceschanged`: muchos navegadores cargan las voces después de arrancar).

### 5. `textoParaVoz`: decirlo como lo diría una maestra
Las voces leen mal «3/4» o «7 × 3». Se convierte a «3 cuartos» y «7 por 3» (reutilizando `fraccionEnPalabras`), «p. m.» a «de la tarde». No se tradujo la «x» suelta (podría estar dentro de una palabra o un nombre).

### 6. El controlador sigue sin DOM
La vista (`textoALeer`, `observarTexto`) lee el elemento marcado con `data-leer` y avisa de los cambios con `MutationObserver`; el `Portal` decide *qué hacer* (leer, callar al pausar, no leer en pausa). Se prueba con una vista falsa, sin navegador.

### 7. Accesibilidad medida, no supuesta
El contraste se calcula con la fórmula WCAG sobre los `--tokens` reales. Texto ≥ 4.5:1 en todos los pares y botones de color. La prueba **encontró un defecto real**: el anillo de foco ámbar (`#f59e0b`) tenía 2.1:1 sobre blanco (WCAG 2.2 pide 3:1); ahora `#b45309`.

### 8. Presupuesto de tamaño como prueba
`app.js` < 80 KB comprimido, CSS < 15 KB, todo `dist/` < 1 MB, sin URLs externas. Si alguien añade una librería pesada o un `<link>` a un CDN, falla antes de llegar a la escuela.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **Barra del juego desbordaba en móvil** (458 px en 375): al añadir 2 botones de voz los controles no se envolvían. Lo detectó la prueba e2e móvil; los controles ahora usan `flex-wrap`.
2. **Botones de voz mudos** (decisión 4), visto porque la prueba móvil mostró botones en un navegador sin voces.
3. **Expectativa errónea en mi prueba de XSS:** esperaba ver `<img` como texto, pero el almacenamiento **ya elimina `<` y `>`** del apodo (defensa en profundidad: además el DOM usa nodos de texto). La prueba ahora exige ambas cosas.
4. **`detener()` dependía de `disponible`** (cancelar no debía requerir voces): una prueba unitaria lo cazó.
5. Una lectura de texto vacío llamaba al sintetizador (ruido en la prueba): `leerPantalla` ahora lo ignora.
6. **Anillo de foco con poco contraste** (decisión 7).

## Cómo se verificó

- **416 pruebas unitarias** (+30): `voz` (conversión, elección de voz, voces tardías, errores del navegador), portal con voz (leer, lectura automática, pausa, salida) y **contraste** (16).
- **28 pruebas de navegador:** portal sin errores ni internet; validación del formulario; XSS; **los 5 juegos × 6 grados** (abrir, pausar con Escape, continuar, salir); persistencia al recargar; móvil sin desborde (con y sin voz); **sin fugas** (30 aperturas/cierres sin que cambie el número de elementos); carga < 2 s; **partida completa por grado 3.º–6.º**; pintar con teclado; voz falsa (Escuchar, lectura automática, pausa, sin voz, sin voz en español); presupuesto de tamaño.
- **Mutación de las pruebas e2e:** reintroducir el error de la Fase 6 → detectado.

## Conceptos que deberías poder explicar

- Por qué existen dos capas de pruebas automáticas y qué error concreto motivó la segunda.
- Qué es el contraste WCAG (luminancia relativa, 4.5:1 vs 3:1) y por qué se prueba con la fórmula y no «a ojo».
- Por qué `disponible` exige una voz en español y por qué se prefieren las voces locales.
- Cómo se mantiene al controlador sin DOM aunque haya lectura en voz (inyección + vista que observa).
- Qué es un `MutationObserver` y por qué se usa aquí en vez de que cada juego llame a la voz.
- Qué garantiza y qué **no** garantiza una prueba e2e (ver límites).

## Cómo revisar (orden sugerido)

1. `docs/PRUEBAS.md` y `tests-e2e/ayudas.mjs` (qué se vigila siempre).
2. `src/core/voz.js` y `tests/voz.test.js`.
3. `tests-e2e/humo.test.mjs`.
4. `src/portal/vista.js` (`observarTexto`) y `src/portal/portal.js` (sección «Lectura en voz alta»).

## Limitaciones conocidas

- **Chromium reciente ≠ el navegador de la escuela.** Antes de la demo hay que probar a mano en una PC real (el código apunta a ES2018/Chrome 70).
- **La voz real no se probó:** el Chromium del entorno no tiene voces; se prueba con una síntesis falsa. Cómo suena en Windows (y si hay voz en español instalada) solo se sabe en la PC de destino.
- **El arrastre del reloj** (poner la hora) no está automatizado (se verificó a mano en la Fase 6).
- El contraste se calcula sobre el CSS declarado, no sobre capturas; no se midieron los colores del canvas de Asteroides.
- No se hizo una auditoría con lector de pantalla real (NVDA/JAWS); las etiquetas ARIA se revisaron por código y por pruebas.
- La lectura automática es un ajuste **global del equipo** (no por perfil).
