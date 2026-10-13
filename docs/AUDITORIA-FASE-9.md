# Auditoría — Fase 9: entrega

Verificación: `pnpm verificar` (421 pruebas unitarias + 28 de navegador) y `pnpm empaquetar`.

## Qué se hizo

| Entregable | Archivo |
|---|---|
| ZIP listo para llevar a la escuela | `pnpm empaquetar` → `entrega/portal-juegos-educativos-vX.Y.Z.zip` (268 KB, 13 archivos; `entrega/` no se versiona) |
| Instrucciones dentro del ZIP | `docs/LEEME-ENTREGA.txt` (se copia como `LEEME.txt`) |
| Manual para el maestro | `docs/MANUAL-MAESTRO.md` |
| Guion de demostración y checklist | `docs/GUION-DEMO.md` |
| Preguntas del jurado y cómo razonarlas | `docs/GUIA-DEFENSA.md` |

## Decisiones de diseño

### 1. Un escritor de ZIP propio (`scripts/zip.mjs`) en lugar de una librería
El proyecto limita sus dependencias por seguridad (`docs/SEGURIDAD-DEPENDENCIAS.md`) y `node:zlib` ya trae DEFLATE. El contenedor ZIP son tres estructuras (cabecera local, directorio central, registro final): unas 60 líneas, **verificables**.
**Costo:** soy yo quien responde por el formato; por eso se comprobó con **dos lectores independientes** (ver «Cómo se verificó»). Si una librería madura fuera aceptable, sería lo habitual; aquí pesó más no sumar una dependencia para una tarea de 60 líneas.

### 2. Salida determinista y a prueba de «zip slip»
Fecha fija (1980-01-01): los mismos archivos dan **los mismos bytes** (útil para comparar entregas). Se rechazan nombres con `/` inicial, `..` o `\` (ataque *zip slip*: un ZIP que escribe fuera de la carpeta al extraer). Aquí lo genera el propio proyecto, pero la prueba documenta la regla.

### 3. Una carpeta raíz dentro del ZIP
Al extraer queda `portal-juegos-educativos/` (no se riegan archivos en la carpeta del usuario). Es el error más común al repartir ZIP.

### 4. El LEEME avisa de las limitaciones reales
El progreso es **por navegador y por computadora**, y algunos navegadores lo ligan a la **ubicación del archivo**: por eso se pide no mover/renombrar la carpeta. No se ocultó, aunque «funciona sin instalar» suena mejor.

### 5. Los documentos para presentar dicen lo que NO se hizo
La guía de defensa termina con las limitaciones para que **las digas tú primero** (sin validación docente, sin niños, sin PCs reales, voz sin probar, accesibilidad parcial). Un jurado pregunta distinto a quien ya reconoció sus límites.

## Cómo se verificó

- **421 pruebas unitarias** (+5): CRC-32 contra el valor estándar (`123456789` → `0xCBF43926`), el ZIP se **lee de vuelta con un lector independiente** (recorre el directorio central, descomprime cada entrada y verifica su CRC y tamaño), acentos en los nombres, archivo vacío y binario, determinismo, nombres peligrosos y compresión real.
- **`python3 -m zipfile -t`** (lector ajeno al proyecto) valida el ZIP; se extrajo y se **abrió el portal desde la carpeta extraída** en Chromium: carga, sin errores de consola.
- Las cifras citadas en los documentos (421 + 28 pruebas, umbrales del motor 85 %/50 %/70 %, ventana de 8, mínimo 5, estrellas 90 %/70 %, 40 perfiles máximo, PIN, 4 dependencias de desarrollo) **se contrastaron con el código** al escribirlas.

## Conceptos que deberías poder explicar

- Qué contiene un ZIP (cabecera local, directorio central, EOCD) y por qué el CRC-32 detecta corrupción.
- Qué es *zip slip* y cómo se evita al **crear** y al **extraer**.
- Por qué el progreso en `localStorage` bajo `file://` es frágil si se mueve la carpeta.
- Para qué sirve un guion con *checklist* previo (reducir el riesgo de una demo en vivo).

## Qué falta (y NO puedo hacer yo)

1. **Probar en una PC real de la escuela** y en el navegador que tengan (checklist en `GUION-DEMO.md`).
2. **Que una maestra o maestro revise el contenido** por grado (cada auditoría indica qué rangos).
3. **Cambiar el PIN** (`src/portal/config.js`) antes de entregar.
4. **Piloto con un grupo** de niños y ajuste de dificultad.
5. Leer las auditorías y la guía de defensa **antes** de presentar: son tu material de estudio.

## Limitaciones conocidas

- El ZIP **no está firmado**; en Windows puede aparecer una advertencia de SmartScreen al abrir `index.html` descargado de internet. Si pasa, «Desbloquear» en Propiedades del ZIP antes de extraer.
- No hay instalador ni accesos directos: es una carpeta con `index.html`.
- La versión sale de `package.json` (0.1.0); no hay un proceso de *releases* automatizado.
