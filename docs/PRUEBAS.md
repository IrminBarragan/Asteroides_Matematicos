# Pruebas del proyecto

Hay **tres capas**, cada una con un propósito distinto. Ninguna reemplaza a las otras.

| Capa | Comando | Qué prueba | Velocidad |
|---|---|---|---|
| **Unitarias** | `pnpm test` | Lógica pura (matemática, generadores, motor adaptativo, portal con vista falsa, contraste de colores, voz) | ~2 s |
| **Navegador (e2e)** | `pnpm test:e2e` | El producto real: `dist/index.html` por `file://` en un Chromium sin interfaz | ~1–2 min |
| **Manual** | — | Lo que solo una persona puede juzgar: ¿se entiende?, ¿es agradable?, ¿el contenido es correcto para el grado? | — |

`pnpm verificar` corre las dos automáticas.

## Por qué hacen falta las dos capas automáticas

Las pruebas unitarias no pueden ver el DOM. En la Fase 6 un error mío (`append(arreglo)` en vez de `append(...botones)`) dejó
**sin botones** las preguntas del reloj y **ninguna de las 341 pruebas lo notó**; solo lo encontré jugando en un navegador.
La capa e2e existe para que ese tipo de error lo detecte una máquina, no una persona.

## Qué vigilan las pruebas de navegador (`tests-e2e/`)

En **todas** las pruebas, además de lo propio de cada una, se vigila que haya: **0 errores de consola**, **0 errores de página** y **0 peticiones que no sean locales** (el portal debe funcionar sin internet).

- `humo.test.mjs`: abre el portal; valida el formulario; un apodo con HTML no se ejecuta (XSS); por cada grado (1.º–6.º) abre **cada juego**, lo pausa con Escape, continúa y sale; el jugador sobrevive a recargar; móvil 375×667 sin desborde horizontal; **sin fugas** (abrir/cerrar juegos 10 veces no acumula elementos); la carga tarda < 2 s.
- `fracciones.test.mjs`: una **partida completa** por grado (3.º–6.º) jugada como lo haría un niño sin saber las respuestas (prueba botones hasta acertar, pinta partes), hasta la pantalla de resultados; pintar con teclado.
- `calculo.test.mjs`: **Taller de Cálculo** (1.º, 3.º y 6.º): la misión de inicio (sin material) y una partida normal resolviendo **con el material de verdad** (poner fichas, tachar, saltos en la recta y «Listo»); la ayuda se retira con los aciertos; equivocarse con la recta da pista y se corrige; la recta con teclado, «Deshacer» y «Empezar de nuevo»; celular de 360 px sin desplazamiento horizontal.
- `bloques.test.mjs`: **Bloques de Valor** (1.º, 3.º y 6.º): misión (sin bloques que manipular) y partida normal resolviendo **con los bloques de verdad** (poner, cambiar 10 por 1, quitar y cambiar 1 por 10); las opciones aparecen exactamente cuando ya no queda nada que cambiar; teclado, «Deshacer»; la ayuda se retira; celular de 360 px con cuatro columnas sin desplazamiento horizontal.
- `cajas.test.mjs`: **Cajas y Reparto** (1.º, 3.º y 6.º): misión (sin material) y partida normal resolviendo **con el material de verdad** (poner objetos en cajas, repartir de uno en uno hasta que ya no alcance, armar cuadrículas de filas y columnas, agregar columnas hasta el total); un reparto a medias no muestra las opciones; la ayuda se retira; celular de 360 px sin desplazamiento horizontal.
- `errores.test.mjs`: una partida con equivocaciones intencionales llega al **modo maestro** («Lo que más confunden» con la suma exacta) y exporta `equivocaciones.csv`; sin equivocaciones la sección no aparece.
- `voz.test.mjs`: con una síntesis de voz falsa, «Escuchar» y la lectura automática; en pausa no se lee; **sin voz en el navegador** no hay botones y el juego funciona igual.
- `lecciones.test.mjs`: la introducción de una habilidad (omitible, una sola vez, no en la misión), «Ver cómo se hace» (ejemplo resuelto, Escape cierra y la pregunta sigue), la lección de Asteroides con material y «hazlo tú» obligatorio, «Escuchar» con voz y el diálogo en móvil.
- `ambiente.test.mjs`: la música apagada de fábrica (cuenta los osciladores del navegador: 0 sin permiso, suena con permiso, se calla al apagarla y en pausa), pistas por pantalla, color por área y mascota, pegatinas/confeti/álbum que persiste, **modo ligero**, **reducir movimiento**, cuadros por segundo y móvil.
- `presupuesto.test.mjs`: tamaño de `dist/` (app.js < 100 KB gz, CSS < 15 KB gz, todo < 1 MB) y que no haya URLs externas.

## Cómo configurarlas

Necesitan un Chromium. Se busca en `CHROMIUM_PATH`, `PLAYWRIGHT_BROWSERS_PATH` y rutas comunes (`/usr/bin/chromium`, `google-chrome`…).
Si no hay ninguno, las pruebas de navegador **se omiten** (no fallan) y lo indican. Se usa `playwright-core` (solo el controlador; **no descarga navegadores**).

```bash
CHROMIUM_PATH=/ruta/a/chrome pnpm test:e2e
```

## Qué NO cubren (límites honestos)

- **No es un navegador antiguo.** El target del código es ES2018/Chrome 70, pero las pruebas corren con un Chromium reciente. Antes de la demo hay que **probar a mano en una PC de la escuela**.
- **No prueban el arrastre del reloj** (las preguntas de «poner la hora»): se verificó a mano con ratón y dedo; automatizarlo es posible pero frágil.
- **No evalúan si el contenido es adecuado** para cada grado: eso lo debe revisar una maestra o maestro.
- La voz es una **síntesis falsa**: se prueba que se pide hablar, no cómo suena en las voces reales de Windows.
- Contraste: se calcula sobre los colores declarados en el CSS (`--tokens` y figuras), no sobre capturas de pantalla.
