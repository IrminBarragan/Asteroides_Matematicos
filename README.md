# Portal de Juegos Educativos para Primaria

Videojuegos educativos para niños de 1° a 6° de primaria. Empezó como *Asteroides Matemáticos* y está
creciendo a un portal con varios juegos. Funciona **sin internet** y se abre con doble clic.

Plan completo y estado de las fases: [`docs/PLAN.md`](docs/PLAN.md).

## Uso rápido

Requiere [Node.js](https://nodejs.org) 20 o superior y [pnpm](https://pnpm.io) 10 (solo para desarrollar; las PCs donde se juega no lo necesitan).

```bash
pnpm install     # una vez
pnpm test        # pruebas de la lógica (rápidas, sin navegador)
pnpm build       # genera dist/
pnpm test:e2e    # pruebas en un Chromium real sobre dist/ (necesita Chromium; ver docs/PRUEBAS.md)
pnpm verificar   # todo lo anterior
```

Después abre `dist/index.html` con doble clic. La carpeta `dist/` es autocontenida: se puede copiar a una USB.

- **Modo maestro:** botón "Modo maestro" al pie de la pantalla de inicio. PIN por defecto `2468` (cámbialo en `src/portal/config.js` antes de presentar).

## Estructura

Ver [`docs/PLAN.md`](docs/PLAN.md#2-estructura-objetivo) y [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Las auditorías de cada fase están en `docs/AUDITORIA-FASE-N.md`.

> El proyecto usa **pnpm** (no npm) por seguridad: ver [`docs/SEGURIDAD-DEPENDENCIAS.md`](docs/SEGURIDAD-DEPENDENCIAS.md).
