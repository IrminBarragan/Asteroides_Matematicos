# Portal de Juegos Educativos para Primaria

Videojuegos educativos para niños de 1° a 6° de primaria. Empezó como *Asteroides Matemáticos* y hoy es un portal
con **ocho juegos** que **enseñan** (no solo evalúan): el sistema detecta por dónde debe empezar cada niño, le ofrece
material para manipular (marcos, recta, bloques, cajas, platos) y **retira la ayuda** cuando ya no la necesita.
Funciona **sin internet** y se abre con doble clic. **Versión 0.2.0** ([`CHANGELOG.md`](CHANGELOG.md)).

Plan inicial: [`docs/PLAN.md`](docs/PLAN.md). Plan de la v0.2 (enseñar, música y color, juegos nuevos): [`docs/PLAN-V2.md`](docs/PLAN-V2.md). Plan de la v0.3 (aprender jugando: un camino de habilidades con repaso espaciado): [`docs/PLAN-V3.md`](docs/PLAN-V3.md).

## Uso rápido

Requiere [Node.js](https://nodejs.org) 20 o superior y [pnpm](https://pnpm.io) 10 (solo para desarrollar; las PCs donde se juega no lo necesitan).

```bash
pnpm install     # una vez
pnpm test        # pruebas de la lógica (rápidas, sin navegador)
pnpm build       # genera dist/
pnpm test:e2e    # pruebas en un Chromium real sobre dist/ (necesita Chromium; ver docs/PRUEBAS.md)
pnpm verificar   # todo lo anterior
pnpm empaquetar  # construye y crea entrega/portal-juegos-educativos-vX.Y.Z.zip
```

Después abre `dist/index.html` con doble clic. La carpeta `dist/` es autocontenida: se puede copiar a una USB.

- **Modo maestro:** botón "Modo maestro" al pie de la pantalla de inicio. PIN por defecto `2468` (cámbialo en `src/portal/config.js` antes de presentar).

## Entrega e instrucciones

- **Para la escuela:** [`docs/MANUAL-MAESTRO.md`](docs/MANUAL-MAESTRO.md) y el `LEEME.txt` que va dentro del ZIP (`pnpm empaquetar`).
- **Para presentar:** [`docs/GUION-DEMO.md`](docs/GUION-DEMO.md) (guion y checklist) y [`docs/GUIA-DEFENSA.md`](docs/GUIA-DEFENSA.md) (preguntas del jurado y cómo razonarlas).
- **Segunda prueba con niños:** [`docs/PROTOCOLO-SEGUNDA-PRUEBA.md`](docs/PROTOCOLO-SEGUNDA-PRUEBA.md) (una hoja: qué mirar, qué anotar, cómo decidir) y [`docs/REVISION-DOCENTE.md`](docs/REVISION-DOCENTE.md) (qué debe revisar una maestra o maestro antes).
- **Pruebas:** [`docs/PRUEBAS.md`](docs/PRUEBAS.md).
- **Publicar en GitHub Pages:** [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) (Actions: `.github/workflows/`).

## Estructura

Ver [`docs/PLAN.md`](docs/PLAN.md#2-estructura-objetivo) y [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Las auditorías de cada fase están en `docs/AUDITORIA-FASE-N.md`.

> El proyecto usa **pnpm** (no npm) por seguridad: ver [`docs/SEGURIDAD-DEPENDENCIAS.md`](docs/SEGURIDAD-DEPENDENCIAS.md).
