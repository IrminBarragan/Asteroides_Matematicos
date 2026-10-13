# Auditoría — Fase 2: Portal

Arquitectura: [`ARQUITECTURA.md`](ARQUITECTURA.md#capa-de-portal-fase-2). Verificación: `pnpm test` (178 pruebas) y `pnpm build`.

## Qué se hizo

- **Portal completo** (una sola página): ¿quién juega? → crear jugador (apodo, avatar de 8 animales, grado 1.º–6.º) → galería de juegos
  filtrada por grado → partida con pausa y salida → resultados con estrellas → modo maestro.
- **Tema infantil propio** (sin Bootstrap): fuentes Fredoka (títulos) y Poppins (texto) locales, botones de ≥ 3 rem, texto base de 18 px,
  contraste AA, animaciones que se desactivan con `prefers-reduced-motion`, diseño responsivo.
- **Modo maestro** (PIN): progreso por jugador, habilidades del motor adaptativo, eliminar jugadores, borrar todo, exportar **CSV**
  (progreso y habilidades) — útil también como evidencia para tu tesis.
- **Juego de práctica** (`src/games/practica`): sumas y restas de opción múltiple. Es **temporal**: existe para poder probar
  el portal de punta a punta con un juego real que usa el contrato y el motor adaptativo. Se retira/reemplaza en la Fase 3.
- La versión anterior de Asteroides **sigue funcionando** en `dist/asteroides-legacy.html` hasta migrarla (Fase 3).

## Decisiones de diseño (y alternativas)

### 1. Controlador sin DOM + vista delgada
El controlador (`portal.js`) no sabe de HTML; pide pantallas a una vista inyectada. **Por qué:** todo el flujo (30 pruebas del portal)
se prueba en Node en milisegundos y sin navegador. **Alternativa:** lógica mezclada en los manejadores de clic (como estaba
`gestorJuego.js`): más rápido de escribir, imposible de probar y de mantener.
**Costo:** una capa extra de indirección; se compensa con que cada vista es una función pequeña.

### 2. Construir DOM con `h()` y nodos de texto (seguridad XSS)
Los apodos vienen de entrada de usuario (y de `localStorage`, editable desde F12). Se insertan **siempre** como texto.
Verificado en navegador: un perfil inyectado a mano con `<img src=x onerror=...>` se muestra como texto, no se ejecuta.
**Alternativa:** `innerHTML` con plantillas: cómodo, pero un solo descuido abre XSS. Con `h()` el camino seguro es el único camino.
Además, el nombre pasa por `limpiarApodo` al crearse (defensa en profundidad).

### 3. "¿Quién juega?" siempre al abrir
En una PC de primaria no se puede asumir que quien abre es quien jugó antes. Se cierra la sesión al cargar; cuesta un clic y
evita que un niño juegue (y sobreescriba récords) con el perfil de otro.

### 4. Resultado guardado primero, pantalla después (microtask)
`terminarPartida` persiste el resultado de inmediato y cambia de pantalla en un microtask. **Por qué:** `finalizar()` se ejecuta
*dentro* del juego; destruirlo en ese instante dejaría al juego tocando un contenedor ya eliminado. Hay una guardia por si el niño
sale justo en ese instante (prueba: "no aparece una pantalla de resultados fantasma").

### 5. Accesibilidad desde el inicio
Foco al título de cada pantalla (los lectores de pantalla anuncian el cambio), enlace "Saltar al contenido", etiquetas reales en
formularios, grupos de radio nativos (flechas y teclado gratis), modal con trampa de foco y Escape, regiones `aria-live` para avisos,
estrellas con texto ("2 de 3 estrellas"). Verificado: se puede crear un jugador **solo con teclado**.

### 6. Seguridad del CSV
Un apodo como `=HYPERLINK(...)` se ejecuta como fórmula al abrir el CSV en Excel ("CSV injection"). Los textos que empiezan con
`= + - @` se neutralizan. Los números negativos no se tocan (son números, no texto). Hay pruebas de ambos casos.

### 7. Limitaciones asumidas (dilo con honestidad si te preguntan)
- **El PIN del maestro es un disuasivo, no seguridad:** está en el código del bundle. Sirve para que un niño no borre datos por accidente.
- **`localStorage` no es privado:** cualquiera con acceso a la PC y a F12 puede leer/editar el progreso. Por eso no se guardan datos personales.
- El progreso vive **en ese navegador de ese equipo**; no se sincroniza entre PCs (decisión consciente: sin servidor ni cuentas).

## Cómo se verificó

- **178 pruebas** (`pnpm test`): controlador del portal con vista/audio falsos, CSV, formato, lógica de práctica, consistencia
  avatares ↔ almacenamiento. Se aplicaron **5 mutaciones** a mano (quitar la guardia de "resultados fantasma", no cerrar sesión al iniciar,
  no neutralizar `-` en CSV, permitir restas negativas, no validar el PIN): **las 5 hicieron fallar una prueba**.
- **Navegador real (Chromium, `file://`)**: recorrido completo — validaciones del formulario, crear perfil, jugar 10 preguntas (con un error
  deliberado: da pista y deja reintentar), pausa con Escape (el avance programado espera a reanudar), resultados, recargar y comprobar que
  el progreso persiste, segundo niño en el mismo equipo, modo maestro (PIN malo/bueno), descarga de CSV, modal de eliminar (foco inicial en
  "Cancelar", Escape cierra), intento de XSS, móvil (390 px, sin desborde horizontal), **0 errores de consola y 0 peticiones a internet**.

## Conceptos que deberías poder explicar

- MVC y por qué el controlador no toca el DOM; qué gana la testabilidad.
- XSS: por qué `textContent`/nodos de texto y no `innerHTML`; por qué no basta con "limpiar" el apodo.
- CSV injection y su mitigación.
- Por qué se guarda el resultado antes de cambiar de pantalla (orden de operaciones y ciclo de vida).
- Qué protege (y qué no) el PIN del modo maestro; por qué `localStorage` no es un lugar seguro.
- Estrellas: la mejor marca por juego; no se infla repitiendo.

## Cómo revisar (orden sugerido)

1. `src/portal/portal.js` y `tests/portal.test.js` (el flujo completo; lo más importante).
2. `src/ui/dom.js` (la regla de seguridad) y `src/portal/csv.js`.
3. `src/portal/vistas/` (pantallas) y `src/estilos/portal.css`.
4. `src/games/practica/` (ejemplo de un juego que cumple el contrato).

Para verlo: `pnpm install && pnpm build`, abre `dist/index.html` (modo maestro: PIN `2468`).

## Deuda conocida / próximos pasos

- Hay **un solo juego** (temporal). Asteroides se migra en la Fase 3 y entonces se retira `practica`.
- Lectura asistida (voz) sigue pendiente (Fase 8). No hay música; solo efectos sintetizados.
- Las pruebas de navegador son guiones manuales (no están en el repositorio); se automatizan en la Fase 8.
- Sin bloqueo por intentos fallidos de PIN (consciente: es un disuasivo).
