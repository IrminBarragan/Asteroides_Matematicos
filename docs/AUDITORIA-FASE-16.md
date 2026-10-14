# Auditoría — Fase 16: pulido, registro de equivocaciones y entrega v0.2.0

Verificación: `pnpm test` (701 pruebas) y `pnpm test:e2e`. Entrega: `pnpm empaquetar` → `entrega/portal-juegos-educativos-v0.2.0.zip`.

## Qué se hizo

| Entregable | Qué es |
|---|---|
| **Registro de equivocaciones comunes** | El modo maestro muestra **«Lo que más confunden»** (equivocaciones con nombre, de todo el grupo, con cuántos niños las cometen) y exporta `equivocaciones.csv`. Es el dato de enseñanza que prometía el plan: *qué* confunden, no solo *cuánto* fallan |
| **Etiquetas de error** | La opción más reveladora de cada pregunta de Taller de Cálculo, Bloques de Valor y Cajas y Reparto lleva nombre: «olvidó la llevada», «restó al revés cada columna», «usó la operación contraria», «sumó en vez de multiplicar», «dio el residuo en vez del cociente»… |
| **Separador de miles** (pendiente de la Fase 13) | Los números de 5 cifras o más del Taller se escriben `12 345`, también en la recta |
| **Versión 0.2.0** | `package.json`, `CHANGELOG.md`, `LEEME.txt` del ZIP (ocho juegos, modo maestro, música y voz), `README.md` |
| **`PROTOCOLO-SEGUNDA-PRUEBA.md`** | Hoja de una página: checklist previo en un equipo real, qué mirar y anotar, qué descargar, métricas con su origen en los CSV, cómo decidir y qué **no** concluir |
| **`REVISION-DOCENTE.md`** | Todo lo que debe validar una maestra o maestro, **con el archivo y la constante** de cada juego y de las lecciones |

## Decisiones de diseño

### 1. Se guardan **conteos**, no respuestas
`perfil.errores = { juego: { habilidad: { equivocación: veces } } }`. Un registro de cada respuesta equivocada (con el enunciado, la hora…) habría dado más detalle pero: ocupa mucho más en un `localStorage` de ~5 MB compartido con todos los niños, guarda más de cada niño de lo necesario y no responde mejor a la pregunta de la maestra («¿qué confunden?»). Costo asumido: no se puede saber *cuándo* ni *en qué pregunta exacta*.

### 2. El nombre del error lo pone **quien lo diseñó**, en el generador
Un error «con nombre» solo se puede reconocer si el generador sabe qué número resulta de cometerlo: `47 + 38 → 75` es «olvidó la llevada» porque el generador **calculó** ese 75 a propósito. Por eso solo se nombra la opción más reveladora (`obligatorios`), y el resto cuenta como «otra equivocación». Una prueba recalcula a mano (con restos módulo 10ᵏ) que la opción llamada «olvidó la llevada» es de verdad la suma sin llevar, y que la llamada «restó al revés» es de verdad el valor absoluto por columna.

### 3. Se cuenta **cada** respuesta equivocada, no solo la primera de cada pregunta
Si el niño prueba tres botones, cada elección dice algo. Los **aciertos a la primera** siguen siendo lo que cuenta para las estrellas y la ayuda: no se mezclan.

### 4. Los datos de enseñanza **nunca** impiden guardar la partida
`limpiarErrores` no lanza: filtra lo dañado, acota el largo y el número de entradas, y quita `<` `>` y caracteres de control. Una prueba guarda un resultado con `errores` basura y comprueba que **la partida se guarda igual**. En cambio, el **esquema** sí rechaza datos manipulados (`errores` con valores no enteros o negativos) para que no se rompa la pantalla del maestro.

### 5. «6.º no ve Reloj y Memorama»: se deja como está
Es un pendiente de la auditoría de la Fase 12 (la galería filtra por grado escolar). **No lo cambié**: los juegos de 1.º–3.º le parecerían «cosas de bebés» a un niño de 6.º que no lo necesita (principio 7 del plan), y el que sí lo necesite ya tiene tres juegos de sumas, restas, valor posicional y multiplicación **que se ajustan a su nivel**. Si en la segunda prueba aparece un niño de 6.º que se beneficiaría del Reloj, es una decisión de la maestra (cambiarle el grado) o un cambio pequeño de `RegistroJuegos.porGrado`.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **La prueba de navegador contaba 2 equivocaciones en vez de 3.** El ayudante `resolverPreguntaCalculo(..., { fallarPrimero: true })` no equivocaba en la rama de los **problemas** (la añadí en la Fase 13 sin esa opción). La prueba exacta («la suma de *Veces* debe ser 3, ni más ni menos») lo delató; si hubiera sido `≥ 1` no se habría visto. Cuando se prueba un contador, la prueba debe exigir el número exacto.
2. **Una migración de prueba mal armada**: mi perfil de la versión 4 llevaba una pegatina inválida (`'x'`) y el almacenamiento, correctamente, lo trató como datos dañados. El defecto era de la prueba, no del código; lo que sí confirma es que la validación del esquema es estricta.
3. **Las pruebas viejas del Taller leían los números con `\d+`** y se habrían roto con `12 345` al separar los miles (4 pruebas rojas al instante); se leen ahora quitando el espacio fino, y hay una prueba propia de la regla (4 cifras o menos sin separador; 5 o más con él; ningún enunciado de 1.º–3.º lo lleva).
4. **Mutaciones (11 cambios deliberados en el registro: que la clave no incluya el tipo, que no se cuenten las respuestas equivocadas, que lo que se escapa no cuente, que se sobrescriba en lugar de sumar, que no se guarde en `registrarResultado`, que el esquema acepte negativos o no valide `errores`, que se acepten entradas dañadas, que no se acote el número de entradas, que el grupo no se ordene, que no cuente niños): todas detectadas a la primera.** Confirmé antes de mutar (lección de la Fase 14).

## Cómo se verificó

- **Unitarias nuevas** (`errores.test.js`, casos nuevos en `portal.test.js`, `calculo-logica.test.js`): limpieza y límites, la partida cuenta lo elegido (con y sin nombre, lo que da el material, lo que se escapa, la misión de inicio), **cada etiqueta de los tres juegos es un error y no la respuesta** (con nombre legible y como máximo una por pregunta), el recálculo a mano de las dos etiquetas más importantes, la migración 4→5, la acumulación partida tras partida por juego/habilidad/tipo, que sobreviva a recargar y que un esquema manipulado se rechace, y el agregado del grupo (suma, niños, orden, límite) y el CSV (con BOM y sin fórmulas de Excel).
- **Navegador real:** una partida con tres equivocaciones intencionales llega al modo maestro y la sección muestra **exactamente 3** veces; se descarga `equivocaciones.csv` con sus encabezados; sin equivocaciones la sección no aparece. Captura revisada a mano.
- **ZIP:** `pnpm empaquetar` produce `portal-juegos-educativos-v0.2.0.zip` (315 KB, 13 archivos, íntegro, con `LEEME.txt` sin marcadores sin reemplazar). `entrega/` está en `.gitignore`: **el ZIP no va en el PR**, se genera con un comando.

## Conceptos que deberías poder explicar

- Por qué se guardan conteos y no respuestas, y qué se pierde.
- Por qué un «error con nombre» exige que el generador lo calcule a propósito.
- Por qué los datos de enseñanza no deben poder romper el guardado de una partida (y por qué el esquema, en cambio, sí rechaza lo manipulado).
- Qué conclusiones **no** se pueden sacar de una sola sesión de observación (último apartado del protocolo).
- Por qué una prueba que cuenta algo debe exigir el número exacto.

## Cómo revisar (orden sugerido)

1. `src/core/partidaPreguntas.js` (`contarEquivocacion`, `resultado().errores`) y `src/core/resultado.js` (`limpiarErrores`).
2. `src/core/storage.js` (esquema v5, `sumarErrores`, `erroresValidos`) y `tests/errores.test.js`.
3. `src/portal/portal.js` (`erroresDelGrupo`, `csvErrores`) y `src/portal/vistas/maestro.js`.
4. Los documentos: `PROTOCOLO-SEGUNDA-PRUEBA.md` y `REVISION-DOCENTE.md` (**la parte más importante de la fase**: lo que sigue ya no es código).

## Limitaciones conocidas

- **Solo tres juegos nombran sus equivocaciones** (los nuevos). En Fracciones los errores típicos ya están diseñados (`1/2 + 1/3 = 2/5`, contar las partes no pintadas…) pero no etiquetados; en los demás la información es «otra equivocación». Es la mejora más barata y de más valor para una versión 0.3.
- **No se sabe *cuándo* ocurrió** cada equivocación (decisión 1) ni se distingue si fue a la primera o al reintentar.
- **«Lo que más confunden» muestra las 12 más frecuentes** del grupo; el CSV trae todas.
- **El PIN de fábrica es 2468** y el modo maestro no es una medida de seguridad fuerte (como en la v0.1).
- **Lo que no pude hacer desde aquí y es lo más importante**: (1) **revisión docente del contenido**, (2) **probar música, voz y rendimiento en las computadoras de la escuela**, (3) **la segunda prueba con niños**. El protocolo y la guía de revisión existen para eso.
- Las pruebas de navegador de algunas situaciones (ayuda «ligera», una pregunta concreta con material) reintentan hasta 30–50 veces porque dependen del azar de las preguntas.
