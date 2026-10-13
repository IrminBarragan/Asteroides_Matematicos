# Auditoría — Fase 0: Cimientos

## Qué se hizo

1. **Reestructura a `src/`** (con `git mv`, el historial de cada archivo se conserva) y conversión de los
   scripts globales a **módulos ES** (`import`/`export`). Antes todo dependía de variables globales cargadas
   en un orden frágil (`CONFIG`, `Utilidades`…); ahora cada archivo declara de qué depende.
2. **Build con esbuild** (`scripts/build.mjs`) que empaqueta a un único `dist/app.js` **clásico (IIFE)**,
   para que `dist/index.html` funcione con doble clic.
3. **Sin CDN:** Bootstrap, Bootstrap Icons y Poppins se instalan con npm y se copian a `dist/assets/`.
   Se eliminó el `<script>` de Bootstrap JS (no se usaba).
4. **Pruebas** (`npm test`, runner nativo de Node, 33 pruebas) de la lógica pura.
5. **Corrección de bugs** (ver abajo).

## Bugs corregidos (y por qué eran bugs)

| Bug | Dónde | Por qué estaba mal | Corrección |
|---|---|---|---|
| El poder "Ralentizar" no ralentizaba lo que el niño veía | `gestorNivel.js` | Dividía a la mitad `velocidadAsteroides`, valor que solo se lee al **crear** asteroides; los que ya caían seguían igual | `factorVelocidad()` que se aplica en cada frame a los asteroides existentes |
| El ralentizador ignoraba la pausa y pisaba la velocidad | `gestorNivel.js` | Usaba `setTimeout` (tiempo real) mientras el juego corre por frames; al expirar restauraba una velocidad **vieja**, deshaciendo cualquier subida de nivel ocurrida en medio | Contador en frames (`tiempoRalentizacion`) que solo avanza si el bucle corre; la velocidad base nunca se modifica |
| El nivel podía pasar de `NIVEL_MAX` con un salto grande de puntos | `gestorNivel.js` | `nivel = nuevoNivel` sin tope | `Math.min(nuevoNivel, NIVEL_MAX)` |
| La IA no se reiniciaba por completo | `sistemaia.js` | `reiniciar()` olvidaba `rachaMaxima`, precisión, perfil y operación difícil; la partida nueva heredaba datos de la anterior | Reinicia todo el estado |
| `obtenerRecomendacionActual` modificaba la lista | `sistemaia.js` | `.sort()` ordena **en el lugar** (efecto secundario oculto en una función "consulta") | `[...lista].sort()` |
| `console.log` mostraba la respuesta correcta | `operacionMatematica.js` | Un niño que abra F12 ve la respuesta | Eliminado, con test que lo vigila |
| `Particula` dependía de la config de Asteroides | `particula.js` | Código de `core` (reutilizable) dependía de un juego concreto | Color por defecto propio |

## Conceptos que deberías poder explicar

- **Módulos ES vs. scripts globales:** por qué importar explícitamente es más seguro que un orden de `<script>`.
- **Por qué IIFE en el build:** los `<script type="module">` no cargan desde `file://` en Chrome (política CORS).
- **Tiempo real vs. tiempo de juego:** un `setTimeout` no sabe que el juego está en pausa; un contador de
  frames sí. Es una regla general: *el estado del juego debe avanzar solo con el bucle del juego*.
- **Funciones consulta sin efectos secundarios** (el `.sort()` mutando).

## Cómo revisar

```bash
npm install && npm test && npm run build
```
Abre `dist/index.html`. Debe verse igual que antes (la UI se rediseña en la Fase 2/3) pero sin pedir nada a internet
(en las herramientas del navegador, pestaña *Network*, no debe haber peticiones a dominios externos).

Archivos más importantes: `scripts/build.mjs`, `src/games/asteroides/gestorNivel.js`, `tests/`.

## Deuda conocida (se resuelve en fases posteriores)

- `src/adaptativo/sistemaia.js` todavía importa `CONFIG` de Asteroides y solo conoce 4 operaciones → Fase 1/3
  (se generaliza a "habilidades").
- `gestorJuego.js` (~800 líneas) mezcla lógica, dibujo y manipulación del DOM → se divide en Fase 3.
- UI con Bootstrap, panel de IA visible para el niño, sin soporte táctil → Fases 2 y 3.
- Reglas punitivas (2 fallos = -1 vida; fallar acelera) → Fase 3.
