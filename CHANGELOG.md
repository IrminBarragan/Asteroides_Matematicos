# Cambios

## 0.2.0 — «Enseñar, no solo evaluar»

Respuesta a la primera prueba con niños de 6.º (sin estrellas, no dominaban lo básico, «no se enseña, solo se evalúa»,
querían música y color). Plan y razones: [`docs/PLAN-V2.md`](docs/PLAN-V2.md); una auditoría por fase en `docs/AUDITORIA-FASE-*.md`.

### Para los niños
- **El sistema decide por dónde empezar** (misión de inicio de 8 preguntas, presentada como aventura) y baja o sube el contenido solo. Ningún niño que termina una partida se queda con 0 estrellas.
- **Se enseña dentro de cada juego:** «Ver cómo se hace» tras equivocarse, una introducción la primera vez que aparece una habilidad, y lecciones con material para sumar, restar, multiplicar, dividir, orden de operaciones, múltiplos, decimales y residuo.
- **Tres juegos nuevos con material para manipular y ayuda que se retira sola:**
  - **Taller de Cálculo:** sumas, restas y problemas con fichas en marcos de diez y saltos en la recta.
  - **Bloques de Valor:** leer y armar números, valor de las cifras, y llevadas y préstamos como «cambiar 10 por 1».
  - **Cajas y Reparto:** multiplicar con cajas y cuadrículas, dividir repartiendo en platos, con residuo.
- **Música, color y movimiento:** música sintetizada (sin archivos, apagada de fábrica), mascota, confeti, fondos por área, álbum de pegatinas, modo ligero y respeto a «reducir movimiento».
- Lectura en voz alta opcional (si la computadora tiene voz en español). Números grandes con espacio fino (`12 345`) en el Taller de Cálculo.

### Para la maestra o el maestro
- **«Lo que más confunden»** (nuevo en la 0.2.0): registro local de equivocaciones con nombre («olvidó la llevada», «sumó en vez de multiplicar», «usó la operación contraria»…), por grupo y por niño, con CSV `equivocaciones.csv`.
- «Contenido que le toca» por niño y juego, repetir la misión de inicio, ajustes del equipo (música, modo ligero).
- [`docs/PROTOCOLO-SEGUNDA-PRUEBA.md`](docs/PROTOCOLO-SEGUNDA-PRUEBA.md) y [`docs/REVISION-DOCENTE.md`](docs/REVISION-DOCENTE.md).

### Por debajo
- Esquema de datos **v5** con migraciones desde la v1 (no se pierde el progreso de la 0.1.0).
- `ui/juegoConMaterial.js`: esqueleto común de los juegos con material; `core/apoyo.js` y `core/partidaConApoyo.js`: la ayuda que se retira.
- 700 pruebas unitarias y 67 de navegador (Chromium real, por `file://`, sin internet); mutaciones manuales en cada fase.
- Presupuesto de `app.js` subido de 80 a 100 KB comprimido, tras medir (~0,7 s de arranque con una CPU 6 veces más lenta).

### Pendiente (honesto)
Contenido sin validar por docentes; música, voz y rendimiento sin probar en los equipos de la escuela; sin segunda prueba con niños.
Ver las limitaciones de cada `docs/AUDITORIA-FASE-*.md`.

## 0.1.0

Portal con cinco juegos (Asteroides Matemáticos, Memorama de Palabras, Reloj Aventurero, Atrapa la Ortografía, Tren de Fracciones),
modo maestro, adaptación por habilidad, lectura en voz alta, pruebas de navegador y empaquetado en ZIP.
