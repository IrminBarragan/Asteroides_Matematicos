# Portal de Juegos Educativos para Primaria

Videojuegos educativos para niños de 1° a 6° de primaria. Empezó como *Asteroides Matemáticos* y está
creciendo a un portal con varios juegos. Funciona **sin internet** y se abre con doble clic.

Plan completo y estado de las fases: [`docs/PLAN.md`](docs/PLAN.md).

## Uso rápido

Requiere [Node.js](https://nodejs.org) 20 o superior y [pnpm](https://pnpm.io) 10 (solo para desarrollar; las PCs donde se juega no lo necesitan).

```bash
pnpm install     # una vez
pnpm test        # pruebas de la lógica
pnpm build       # genera dist/
```

Después abre `dist/index.html` con doble clic. La carpeta `dist/` es autocontenida: se puede copiar a una USB.

## Estructura

Ver [`docs/PLAN.md`](docs/PLAN.md#2-estructura-objetivo) y [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Las auditorías de cada fase están en `docs/AUDITORIA-FASE-N.md`.

> El proyecto usa **pnpm** (no npm) por seguridad: ver [`docs/SEGURIDAD-DEPENDENCIAS.md`](docs/SEGURIDAD-DEPENDENCIAS.md).
