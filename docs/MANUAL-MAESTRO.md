# Manual del maestro

Para quien va a usar el portal en el salón o en el aula de cómputo. No necesita saber programar.

## 1. Instalar (una sola vez por computadora)

1. Copia el archivo `portal-juegos-educativos-vX.Y.Z.zip` a la computadora (USB, correo o nube).
2. Haz clic derecho → **Extraer todo** (no lo abras directamente desde el ZIP).
3. Entra a la carpeta y haz doble clic en **`index.html`**. Se abre en el navegador.
4. *(Opcional)* Crea un acceso directo a `index.html` en el escritorio.

No necesita internet, instalación ni permisos de administrador.

**Importante:** una vez que los niños empiecen a jugar, **no muevas ni renombres la carpeta** y usa **siempre el mismo navegador**: el progreso se guarda en ese navegador, de esa computadora.

## 2. Qué verá el niño

1. **«¿Quién juega?»** — varios niños comparten la computadora; cada uno toca su nombre. La primera vez cada niño crea su jugador: nombre o apodo (sin apellidos), un amigo (avatar) y su grado.
2. **Galería de juegos** — solo se muestran los de su grado. Las estrellas doradas son su mejor resultado.
3. **La partida** — son **10 preguntas** (3–5 minutos). Botón **Pausa** (o la tecla Escape) y **← Salir**.
4. **Resultados** — de 0 a 3 estrellas según la precisión (3 estrellas: ≥ 90 % de aciertos a la primera; 2: ≥ 70 %; 1: cualquier otro caso con algún acierto).

Los datos personales se limitan al nombre o apodo y al avatar. **No se envía nada a internet.**

## 3. Los juegos

| Juego | Grados | Qué practica |
|---|---|---|
| **Asteroides Matemáticos** | 1.º–6.º | 1.º–2.º suma y resta · 3.º tablas de multiplicar · 4.º división y multiplicación de 2 cifras · 5.º–6.º operaciones combinadas y múltiplos |
| **Memorama de Palabras** | 1.º–3.º | Dibujo ↔ palabra, sílaba inicial, contar sílabas, rimas, sinónimos y antónimos |
| **Reloj Aventurero** | 1.º–4.º | En punto y media · cuartos y decir la hora · minutos y duración · reloj de 24 horas |
| **Atrapa la Ortografía** | 3.º–6.º | b/v, g/j, h · c/s/z, ll/y · acentuación · homófonos y «porque / por qué» |
| **Tren de Fracciones** | 3.º–6.º | Leer, pintar y comparar fracciones · equivalentes · simplificar, sumar y restar · números mixtos y decimales |

### Cómo se trata el error (importante para quien acompaña)

- **No hay vidas ni «game over».** Equivocarse **no resta puntos ni acelera el juego**: muestra una **pista** y se puede **reintentar**.
- Al acertar se **explica la regla** («7 × 3 es 7 + 7 + 7 = 21»).
- Acertar tras equivocarse da la mitad de puntos: se premia no rendirse.
- **La dificultad se ajusta sola, por habilidad:** si el niño domina una habilidad sube de nivel; si le cuesta, baja. No hace falta que el maestro configure nada.

### Ayudas de lectura (opcional)

Si la computadora tiene una **voz en español**, durante el juego aparecen **«Escuchar»** (lee la pregunta) y **«Lectura automática»** (lee cada pregunta nueva). Útil en 1.º y 2.º. Si no hay voz, los botones no aparecen y el juego funciona igual.

## 4. Modo maestro

En «¿Quién juega?», botón **«Modo maestro»** (al pie). Pide un **PIN** (de fábrica: **2468**; ver el apartado 6 para cambiarlo).
Es una puerta para que los niños no borren datos por accidente; **no es una medida de seguridad fuerte**.

Ahí puedes:

- Ver por niño: **juegos jugados, mejor puntaje y estrellas**.
- Ver por niño sus **habilidades**: nivel actual, intentos, aciertos y **dominio reciente** (porcentaje de aciertos en sus últimos intentos). Un dominio bajo en una habilidad indica **qué reforzar**.
- **Descargar CSV** (`progreso.csv`, `habilidades.csv`) y abrirlos en Excel o Google Sheets.
- **Eliminar** a un jugador, o **borrar todo** (pide confirmación; no se puede deshacer).

### Cómo leer «Dominio reciente»

Es el porcentaje de aciertos **a la primera** en los últimos 8 intentos de esa habilidad. Referencia del sistema: **≥ 85 %** sube de nivel; **< 50 %** baja; **< 70 %** se considera habilidad «a reforzar». Con menos de 5 intentos no se decide nada: los primeros resultados son poco confiables.

## 5. Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| Pantalla en blanco | Actualizar (F5). Comprobar que JavaScript esté activado. Probar con otro navegador (Chrome, Edge, Firefox). |
| «Mi jugador desapareció» | Probablemente se abrió con **otro navegador** u otra computadora, o se movió/renombró la carpeta, o se borraron los «datos de navegación». El progreso es por navegador y por computadora. |
| Las letras se ven distintas | La tipografía está incluida; si se ve rara, actualizar el navegador. |
| No suena nada | Revisar el ícono del altavoz (arriba a la derecha) y el volumen de la computadora. El juego funciona sin sonido. |
| No aparece «Escuchar» | La computadora no tiene voz en español instalada (Configuración de Windows → Hora e idioma → Voz). |
| Un niño no puede crear su jugador | El nombre está repetido en esa computadora, o ya hay 40 jugadores (el máximo). |

## 6. Para quien instala (opcional)

- **Cambiar el PIN:** requiere regenerar el portal (ver el `README.md`): cambiar `PIN_MAESTRO` en `src/portal/config.js` y ejecutar `pnpm build`. El PIN **no es secreto fuerte**: está en el código del portal.
- **Copias de seguridad del progreso:** descarga los CSV desde el modo maestro. El progreso en sí vive en el navegador.
- **Contenido por grado:** conviene que un docente **revise** los rangos de cada juego (documentados en `docs/AUDITORIA-FASE-N.md`, sección «Cómo revisar») y reporte ajustes.
