# Seguridad de dependencias (pnpm)

El proyecto usa **pnpm** en lugar de npm. Estas son las medidas y su razón; deberías poder defenderlas.

## Por qué pnpm es más seguro

| Medida | Qué hace | Riesgo que reduce |
|---|---|---|
| **Estructura estricta de `node_modules`** | Cada paquete solo ve las dependencias que declaró; no hay "dependencias fantasma" hoisteadas | Código que funciona por casualidad usando un paquete que nadie declaró (y que otro podría reemplazar) |
| **Scripts de instalación bloqueados por defecto** (pnpm ≥ 10) | `preinstall`/`postinstall` de las dependencias no se ejecutan salvo que se aprueben en `onlyBuiltDependencies` | El ataque típico de cadena de suministro: un paquete comprometido ejecuta código al instalarse |
| **Lockfile con integridad** (`pnpm-lock.yaml`) | Fija versión exacta y hash de cada paquete; `--frozen-lockfile` falla si no coincide | Que una instalación futura traiga una versión distinta o manipulada |
| **Almacén global por contenido (hash)** | Los archivos se verifican por su hash | Alteración de archivos ya descargados |

## Configuración del proyecto (`pnpm-workspace.yaml`)

- `onlyBuiltDependencies: []` — **ninguna** dependencia puede correr scripts. esbuild descarga su binario como
  dependencia opcional por plataforma, y funciona sin su postinstall (verificado: `pnpm test` y `pnpm build` pasan).
  pnpm mostrará un aviso "Ignored build scripts: esbuild"; es esperado y correcto.
- `minimumReleaseAge: 4320` — no se instalan versiones publicadas hace menos de 3 días. Los paquetes
  comprometidos suelen detectarse y retirarse en horas o pocos días.
- `blockExoticSubdeps: true` — las dependencias transitivas no pueden venir de git ni de tarballs arbitrarios.

Además: todas las versiones están **fijadas exactas** en `package.json` (sin `^`), solo hay 4 dependencias de
desarrollo, y **ninguna va dentro de `dist/`** salvo CSS, fuentes e íconos copiados como archivos estáticos
(no hay código de terceros ejecutándose en el navegador del niño).

## Reglas de trabajo

1. Instalar siempre con `pnpm install`. En integración o en una máquina nueva: `pnpm install --frozen-lockfile`.
2. No usar `npm install` (generaría un `package-lock.json` paralelo). El campo `packageManager` y `engines`
   documentan la versión esperada.
3. Antes de agregar una dependencia: ¿se puede resolver con ~20 líneas propias? Cada dependencia es superficie de ataque.
4. Revisar `pnpm audit` periódicamente.
5. No aprobar scripts de instalación (`pnpm approve-builds`) sin entender qué ejecutan.

## Qué NO cubre

pnpm no protege contra una dependencia maliciosa que ejecute código cuando se **importa** (en el build). Por eso
las dependencias son pocas, fijadas, y el build se corre en un entorno de desarrollo, no en las PCs de la primaria.
