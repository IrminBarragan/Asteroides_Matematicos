# Despliegue en GitHub Pages

El portal es estático (`dist/`), así que GitHub Pages lo sirve sin más. Dos flujos en `.github/workflows/`:

| Archivo | Cuándo corre | Qué hace |
|---|---|---|
| `ci.yml` | En cada PR y en cada push a una rama que no sea `main` | `pnpm install --frozen-lockfile` → `pnpm check` (pruebas unitarias + build) → `pnpm test:e2e` (Chrome real) |
| `pages.yml` | En cada push a `main` (o a mano: pestaña **Actions** → «Desplegar en GitHub Pages» → *Run workflow*) | Las mismas verificaciones; **si pasan**, publica `dist/` |

## Activarlo (una sola vez, lo haces tú en GitHub)

1. Repositorio → **Settings → Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Fusiona el PR a `main`: el flujo corre solo. La URL aparece en el resumen del flujo y en Settings → Pages
   (normalmente `https://<usuario>.github.io/Asteroides_Matematicos/`).

## Por qué funciona bajo una subruta

Pages sirve el repositorio en `/<nombre-del-repo>/`, no en la raíz. El build usa **rutas relativas** (`app.js`, `assets/fonts/…`), así que funciona igual en `file://`, en la raíz de un dominio o en una subruta. Esto lo cubren las pruebas de navegador (`file://`) y no requiere configuración extra.

## Decisiones (para defenderlas)

- **Se prueba antes de publicar.** Si falla una prueba, no se despliega: `main` puede estar en rojo, pero el sitio publicado no.
- **Solo se publica `dist/`.** El código fuente, las pruebas y la documentación no se sirven.
- **Permisos mínimos** (`contents: read`, `pages: write`, `id-token: write`) y autenticación por **OIDC** (sin tokens guardados en secretos).
- **`--frozen-lockfile`**: la instalación falla si el lockfile no coincide, igual que en local.
- **`concurrency`** evita dos despliegues simultáneos.

## Limitaciones y cuidados

- **Las acciones están fijadas por versión mayor** (`@v4`), que es lo habitual. La opción más estricta es fijarlas por **SHA de commit** (resistente a que una etiqueta se mueva) y dejar que Dependabot las actualice; no lo hice porque no puedo verificar los SHA desde aquí.
- **El progreso de los niños vive en el navegador de cada computadora** (`localStorage`). En `github.io` el origen se comparte con otros sitios del mismo usuario (`<usuario>.github.io`); la clave usada es única (`portal-juegos-educativos`), pero no guardes nada sensible: ya solo se guarda apodo, avatar y grado.
- **Pages necesita internet**: sirve para demostrar o probar. Para las PCs de la escuela sin internet sigue valiendo el ZIP (`pnpm empaquetar`).
- En repositorios **privados**, Pages requiere un plan de GitHub que lo permita; con un repositorio público no hay problema.
- El primer despliegue puede tardar uno o dos minutos en reflejarse.
- No probé los flujos en GitHub (no puedo ejecutarlos desde aquí): validé la sintaxis YAML y que los comandos que invocan (`pnpm check`, `pnpm test:e2e`) pasan en local. Revisa la primera ejecución en la pestaña **Actions**.
