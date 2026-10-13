# Plan: Portal de Juegos Educativos (1° a 6° de primaria)

> Este documento es el plan vivo del proyecto. Se actualiza al cerrar cada fase.

## 1. Principios

1. **Funciona offline con doble clic.** Sin CDN, sin servidor, sin instalación en las PCs de la primaria.
2. **JS puro con clases.** El único paso de build es esbuild, que empaqueta todo en un script clásico.
3. **Una sola página (SPA).** Portal y juegos viven en un `index.html`. `localStorage` en `file://` puede no compartirse entre páginas distintas en algunos navegadores; con una sola página el progreso se guarda siempre.
4. **Lógica separada de pantalla.** Las reglas de cada juego son clases puras, probables con tests.
5. **Contenido separado de código.** Preguntas, palabras y ejercicios van en archivos de datos.
6. **Pedagogía antes que arcade.** Fallar no castiga: da una pista y otra oportunidad.

### Decisión: ¿framework (React, etc.)?

**No.** Los juegos viven en `<canvas>`, donde React no aporta; el portal tiene pocas pantallas; las PCs de la
primaria son un riesgo (equipos viejos, sin internet) y menos dependencias es menos riesgo; y el código debe
ser fácil de auditar. Se reconsideraría solo si el proyecto creciera a cuentas de usuario, panel de maestros o
decenas de pantallas.

**Detalle técnico clave:** los módulos ES (`<script type="module">`) no cargan con doble clic (`file://`) en
Chrome. Por eso se escribe en módulos ES (para poder probar con Node) pero se **empaqueta como script clásico
(IIFE)** con esbuild.

## 2. Estructura objetivo

```
/src/
  index.html           ← única página
  main.js              ← arranque y router
  core/                ← bucle, entrada (Pointer Events), audio, partículas, storage, eventos
  ui/                  ← tema infantil, botones, HUD, modales, resultados
  portal/              ← inicio, selección de grado, galería, progreso, modo maestro
  adaptativo/          ← motor adaptativo (SistemaIA generalizado)
  games/<juego>/       ← logica.js, vista.js, datos
/scripts/build.mjs     ← empaquetado a dist/
/tests/                ← node:test, solo lógica pura
/dist/                 ← resultado del build (lo que se entrega; no se versiona)
/docs/                 ← este plan, auditorías por fase, manual del maestro
```

**Contrato de juego** (para que agregar juegos sea barato):

```js
class Juego {
  static meta = { id, nombre, grados: [1,2,3], area: 'matemáticas' }
  montar(contenedor, { grado, perfil })
  pausar() / reanudar()
  destruir()   // limpia timers y eventos
  // al terminar emite: { estrellas, aciertos, fallos, tiempoMs, habilidades }
}
```

## 3. Catálogo y cobertura por grado

| Juego | Área | Contenido | 1° | 2° | 3° | 4° | 5° | 6° |
|---|---|---|---|---|---|---|---|---|
| Asteroides Matemáticos | Aritmética | 1-2°: suma/resta · 3°: tablas × · 4°: ÷ y × 2 cifras · 5-6°: operaciones combinadas, múltiplos | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Memorama de Palabras | Lectura | 1°: sílabas y palabras con imagen · 2°: rimas · 3°: sinónimos/antónimos | ✔ | ✔ | ✔ | | | |
| Reloj Aventurero | Medición | 1°: en punto y media · 2°: cuartos · 3°: minutos · 4°: 24 h y duración | ✔ | ✔ | ✔ | ✔ | | |
| Atrapa la Ortografía | Español | 3°: b/v, g/j, h · 4°: c/s/z, ll/y · 5°: acentuación · 6°: diacríticos y homófonos | | | ✔ | ✔ | ✔ | ✔ |
| Tren de Fracciones | Fracciones | 3°: mitades y cuartos · 4°: equivalentes y comparación · 5°: suma/resta · 6°: mixtas y decimales | | | ✔ | ✔ | ✔ | ✔ |

Las imágenes y los íconos serán SVG propios (los emojis no se ven en color en Windows 7 / 10 viejos).

## 4. Reglas pedagógicas transversales

- **Sin castigo:** se elimina "fallas y aceleran los asteroides". Un error muestra una pista y se reintenta.
- **Retroalimentación explicativa:** "7 × 3 es 7 + 7 + 7 = 21", no solo "incorrecto".
- **Dificultad adaptativa por habilidad:** el `SistemaIA` se generaliza y refuerza lo que el niño falla.
- **Sesiones cortas** (3-5 min), 1 a 3 estrellas, récord personal.
- **Sin datos personales:** solo apodo y avatar en `localStorage` (son menores).
- **Lectura asistida** opcional en 1° y 2° con `speechSynthesis` (degrada con gracia si no hay voces).
- **Modo maestro:** el panel de métricas de IA pasa a una vista oculta (atajo de teclado).

## 5. Fases

Cada fase termina con commits separados, tests en verde y un `docs/AUDITORIA-FASE-N.md`.

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Cimientos: estructura `src/`, esbuild, tests, sin CDN, bugs conocidos | ✅ Hecha |
| 1 | Núcleo compartido: bucle, input unificado (mouse+táctil), audio, storage, eventos, contrato `Juego` | Pendiente |
| 2 | Portal: inicio, perfil (apodo+avatar), grado, galería, resultados, modo maestro, tema infantil | Pendiente |
| 3 | Asteroides Matemáticos: migración al contrato, contenido por grado, reglas amigables, táctil | Pendiente |
| 4 | Memorama de Palabras (primer juego basado en DOM) | Pendiente |
| 5 | Atrapa la Ortografía | Pendiente |
| 6 | Reloj Aventurero | Pendiente |
| 7 | Tren de Fracciones (aritmética en enteros, sin decimales flotantes) | Pendiente |
| 8 | Pulido: accesibilidad, humo automatizado con Chromium headless, rendimiento | Pendiente |
| 9 | Entrega: ZIP de `dist/`, manual del maestro, guion de demo, guía de defensa | Pendiente |

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Navegador viejo en las PCs | JS/CSS ampliamente soportado (target es2018) y prueba con navegador antiguo antes de la demo |
| Emojis o fuentes ausentes | SVG propios y fuente local |
| Alcance grande | Fases ordenadas por valor; se pueden recortar los últimos juegos sin romper el portal |
| Audio bloqueado | Iniciar audio tras el primer clic; todo debe funcionar sin sonido |
| Pérdida de progreso | Storage versionado con recuperación ante datos corruptos |
