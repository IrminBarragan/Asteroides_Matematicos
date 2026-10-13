# Guía de defensa

Preguntas que puede hacer un jurado y cómo pensar la respuesta. **No es un guion para memorizar**: cada respuesta tiene el *porqué*, las alternativas y la desventaja, para que puedas razonar aunque la pregunta venga con otra forma. Si una respuesta no te convence, **abre el archivo indicado y compruébalo**: es mejor decir «lo reviso» que defender algo que no entiendes.

> Regla de oro: **separa lo que decidiste y por qué, de lo que no sabes o no hiciste.** La honestidad sobre las limitaciones (apartado final) suma más que esconderlas.

---

## A. Producto y alcance

**1. ¿Qué problema resuelve y para quién?**
Un portal de juegos educativos para las PCs de una primaria, de 1.º a 6.º, **sin internet y con doble clic**. Los criterios que lo moldean: poco equipo (PCs viejas), cero instalación, niños pequeños (sin castigo, con pista), y un docente que quiere ver el progreso.

**2. ¿Por qué 5 juegos y por qué estos?**
Cubren cuatro áreas con **un juego por tipo de mecánica** (canvas con acción, memoria, caída de palabras, reloj interactivo, figuras): así la arquitectura se prueba con formatos distintos, no cinco copias. Desventaja: ninguno cubre ciencias (el contrato `Juego` lo permite; `AREAS` ya la prevé).

**3. ¿Cómo sabes que el contenido es adecuado para cada grado?**
Honestamente: **lo diseñé con el currículo en mente, pero no lo ha validado un docente**. Cada auditoría (`docs/AUDITORIA-FASE-N.md`) señala qué rangos revisar («Cómo revisar»). Propuesta: piloto con un grupo y ajuste con la maestra.

---

## B. Decisiones técnicas

**4. ¿Por qué JavaScript puro y no React?** (`docs/PLAN.md`, «Decisión: ¿framework?»)
- Los juegos viven en `<canvas>`/SVG, donde React no aporta; el portal tiene pocas pantallas.
- **Menos dependencias = menos riesgo** y más fácil de auditar en equipos viejos y sin internet.
- Desventaja: tuve que escribir cosas que un framework da (p. ej. `h()` en `src/ui/dom.js` para construir DOM). Si el proyecto creciera a cuentas de usuario o muchas pantallas, lo reconsideraría.

**4b. ¿Por qué se empaqueta como script clásico (IIFE) si escribes módulos ES?**
Porque `<script type="module">` **no carga por `file://`** (doble clic) en Chrome. Escribo módulos para poder probar con Node y empaqueto con esbuild a un script clásico (`scripts/build.mjs`).

**5. ¿Por qué pnpm? ¿Qué medidas de seguridad tomaste?** (`docs/SEGURIDAD-DEPENDENCIAS.md`)
Scripts de instalación bloqueados (`onlyBuiltDependencies: []`), versiones con al menos 3 días de antigüedad (`minimumReleaseAge`), sin dependencias desde git, lockfile con integridad y versiones exactas. Solo **4 dependencias de desarrollo**; **ninguna corre en el navegador del niño**.

**6. ¿Por qué un «contrato» `Juego` con método plantilla?** (`src/core/juego.js`)
El portal solo conoce `montar / pausar / reanudar / destruir` y un evento de fin. Agregar un juego **no obliga a tocar el portal ni a los demás** (abierto/cerrado). El método plantilla garantiza que ningún juego olvide cambiar de estado o liberar recursos. Prueba: `tests/juego.test.js` y el `Tren de Fracciones` se añadió sin modificar el portal más que registrándolo en `main.js`.

**7. ¿Por qué el controlador `Portal` no toca el DOM?**
Para **probarlo sin navegador** (vista falsa en `tests/auxiliares/vistaFalsa.js`) y poder cambiar la vista sin tocar las reglas. Es inyección de dependencias: `main.js` arma las piezas.

**8. ¿Qué es el bucle de paso fijo y por qué?** (`src/core/bucle.js`)
La lógica se actualiza en pasos de **1/60 s** acumulando el tiempo real; así el juego **no depende de la velocidad de la PC** (en una PC lenta no «va en cámara lenta» ni en una rápida «va rápido») y es reproducible. Hay un tope (`maxDelta`) para que, tras congelarse la pestaña, no haya una «avalancha» de actualizaciones.

**9. ¿Por qué hay un `Planificador` propio en lugar de `setTimeout`?**
`setTimeout` sigue corriendo **durante la pausa**. El planificador cuenta **tiempo de juego** (el que avanza el bucle): pausar congela también las esperas. Verificado en navegador y en pruebas.

**10. ¿Cómo guardas el progreso y qué pasa si los datos están corruptos?** (`src/core/storage.js`)
`localStorage`, con **esquema versionado y migraciones**, validación al leer (lo guardado **no es de fiar**: puede estar manipulado o corrupto) y recuperación ante datos inválidos. Límite: es **por navegador y por computadora**; no hay servidor. Alternativa: un backend con cuentas (descartado: requiere internet y datos personales de menores).

**11. ¿Por qué `h()` y nodos de texto en lugar de `innerHTML`?** (`src/ui/dom.js`)
Seguridad (XSS): el apodo lo escribe un niño. Con nodos de texto, `<img onerror=...>` es solo texto. Además el almacenamiento elimina `<` y `>` (**defensa en profundidad**). Hay una prueba de navegador que lo comprueba.

**12. ¿Por qué el CSV neutraliza `=`, `+`, `-`, `@`?** (`src/portal/csv.js`)
*CSV injection*: un apodo `=HYPERLINK(...)` abierto en Excel se ejecutaría como fórmula. Se antepone una comilla simple. Los números no se tocan.

---

## C. Pedagogía y «adaptativo»

**13. ¿Qué tan «inteligente» es la adaptación? ¿Es IA?**
No: es una **heurística simple y explicable** (`src/adaptativo/motor.js`): ventana de **8** intentos, mínimo **5** para decidir, **≥ 85 %** sube de nivel, **< 50 %** baja, **< 70 %** = «a reforzar». La elegí **porque se puede justificar y auditar**; un modelo opaco no se podría defender ante un docente. Límites: con pocos intentos es ruidosa y no distingue *por qué* falló el niño.

**14. ¿Por qué no hay vidas ni «game over»?**
En niños pequeños el castigo (perder, acelerar) genera **ansiedad y abandono**, y mezcla la dificultad del contenido con la presión del tiempo. Aquí el error da **pista y reintento**; acertar tras equivocarse da la mitad de puntos (se premia insistir). Sin cronómetro en los juegos de preguntas.

**15. ¿Por qué los distractores son «errores típicos»?**
Porque un distractor al azar no enseña nada: uno que **refleja un error real** (1/2 + 1/3 = 2/5; leer el reloj al revés: 3:30 → 6:15) hace que el niño **se encuentre con su propio error** y la pista/explicación lo corrija. Se prueba que existan y que **ningún distractor sea también correcto**.

**16. ¿Cómo calculas las estrellas?** (`src/core/resultado.js`)
Por precisión de aciertos a la primera: ≥ 90 % → 3; ≥ 70 % → 2; cualquier otro caso con algún acierto → 1. Decisión: **terminar siempre da algo** (no se premia solo la perfección).

---

## D. Matemática y calidad

**17. ¿Por qué las fracciones se calculan con enteros?** (`src/core/fracciones.js`)
`0.1 + 0.2 = 0.30000000000000004` en JavaScript. Con **multiplicación cruzada** (`a/b < c/d ⇔ a·d < c·b`, válida porque los denominadores son positivos) y **mcm** no hay error de redondeo. Los decimales se manejan como **centésimas enteras**. Si te preguntan *por qué el mcm y no cualquier común múltiplo*: el mcm da el resultado **más pequeño** y la fracción más fácil de simplificar.

**18. ¿Cómo sabes que las respuestas del juego son correctas?**
Las pruebas **recalculan la respuesta por su cuenta** (sin usar el código que prueban) a partir de lo que ve el niño, y comprueban que ningún error ofrecido valga lo mismo. Además se generaron **1.68 millones de preguntas** del Tren de Fracciones sin una sola mal formada. *Excepción deliberada:* en «simplificar», 6/8 **sí** puede ser un error (equivalente pero no reducido).

**19. ¿Qué son las «mutaciones» que mencionas?**
Rompo el código **a propósito** (invertir una comparación, quitar un filtro) y compruebo que **alguna prueba falle**. Si sobrevive, la prueba es débil o falta. Ejemplo: sobrevivió el error «fracciones propias con n = d» → añadí una prueba. No todo sobreviviente es una falta: algunos son *mutantes equivalentes* (el cambio no altera nada observable).

**20. ¿Por qué pruebas unitarias *y* de navegador?**
Porque en la Fase 6 un `append(arreglo)` dejó **sin botones** el Reloj y **341 pruebas no lo vieron**. Las e2e (`tests-e2e/`) abren `dist/index.html` por `file://` en Chromium, juegan una partida completa y vigilan 0 errores de consola y 0 peticiones a internet. Probé que ese mismo error **ahora sí se detecta**. Detalle: `docs/PRUEBAS.md`.

**21. ¿Cómo garantizas accesibilidad?**
Teclado en todo (incluido pintar fracciones y las manecillas del reloj como `slider`), `aria-label`, foco visible, contraste **calculado con la fórmula WCAG** sobre los colores reales (encontró un defecto: el foco tenía 2.1:1, ahora ≥ 3:1), lectura en voz alta opcional. **Limitación:** las figuras de «leer el reloj / identificar fracción» **no** son accesibles a lectores de pantalla (anunciarlas regalaría la respuesta) y **no** probé con NVDA/JAWS.

---

## E. Preguntas incómodas (y cómo responderlas)

| Pregunta | Respuesta honesta |
|---|---|
| «¿Probaste con niños?» | No. Las pruebas son técnicas. El siguiente paso es un piloto con un grupo y una maestra. |
| «¿Funciona en las PCs de la escuela?» | Probado en Chromium reciente; el código apunta a ES2018/Chrome 70. **Falta probar en una PC real** (está en el checklist del guion de demo). |
| «¿Y si borran el historial del navegador?» | Se pierde el progreso (por diseño es local). Mitigación: exportar CSV desde el modo maestro. |
| «El PIN `2468` está en el código» | Es un **disuasivo** para que los niños no borren datos, no seguridad fuerte, y está documentado así. Se cambia al instalar. |
| «¿Usaste IA para hacerlo?» | Responde con la verdad y con lo que **sí puedes explicar**: la arquitectura, las decisiones y las pruebas están documentadas en `docs/`, y esta guía existe para que **entiendas y defiendas cada decisión**. Revisa cada auditoría antes de presentar. |
| «¿Por qué no un backend?» | Requiere internet, mantenimiento y manejo de datos de menores; el proyecto prioriza cero instalación y privacidad. Es la mayor limitación para un uso institucional (reportes centralizados). |
| «¿Qué cambiarías?» | Validación docente del contenido, piloto, un juego de ciencias, exportar/importar progreso entre computadoras y pruebas con lector de pantalla real. |

---

## F. Limitaciones (resumen para decirlas tú primero)

1. **Contenido sin validación docente** (rangos por grado, vocabulario).
2. **Sin pruebas con niños ni en las PCs reales.**
3. **Progreso local** por navegador/computadora; sin reportes centralizados.
4. **Voz** sin probar con voces reales de Windows; depende de que haya una voz en español.
5. **Accesibilidad parcial** (figuras visuales) y sin prueba con lector de pantalla real.
6. **Sin ciencias ni multiplicación/división de fracciones**, ni decimales entre sí.
7. **PIN** como disuasivo, no como seguridad.

## G. Para estudiar (orden sugerido)

1. `docs/ARQUITECTURA.md` (el mapa) → `src/core/juego.js` y `src/portal/portal.js`.
2. `src/core/fracciones.js` + `tests/fracciones.test.js` (la matemática y cómo se prueba).
3. `src/adaptativo/motor.js` (la heurística).
4. `src/core/storage.js` (validación y migración).
5. Una auditoría completa (por ejemplo la 7) y `docs/PRUEBAS.md`.
6. Prepara **una demostración que puedas hacer sin mirar el guion** (`docs/GUION-DEMO.md`).
