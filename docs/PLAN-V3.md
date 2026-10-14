# Plan v3: aprender jugando (un camino, no un catálogo de juegos)

> Nace de una pregunta: **¿cómo hacer que los niños aprendan jugando, al estilo Duolingo, en vez de que el portal se sienta como una evaluación?**
> Este documento es el plan vivo de la versión 0.3. Se actualiza al cerrar cada fase (igual que [`PLAN.md`](PLAN.md) y [`PLAN-V2.md`](PLAN-V2.md)).

## 1. Diagnóstico: qué ya está bien y qué falta

La v0.2 ya respondió a «no se enseña, solo se evalúa» **dentro de cada juego**: «Ver cómo se hace», introducciones, material
que se manipula, ayuda que se retira, estrellas que premian el esfuerzo. Eso **se conserva**: son las piezas con las que se construye la v0.3.

Lo que sigue haciendo que el portal se sienta como un examen **no está dentro de los juegos, sino en cómo se organizan**:

| # | Causa | Dónde está | Por qué se siente como evaluación |
|---|---|---|---|
| 1 | **La unidad de organización es el juego, no lo que se aprende.** La pantalla de inicio es un catálogo de 8 juegos filtrado por grado. | `portal.js` → `datosInicio()`, `RegistroJuegos.porGrado()` | El niño elige «a qué juego», no «qué sigo aprendiendo». No hay un **siguiente paso** claro ni sensación de avance. La cadena de prerrequisitos (contar → sumar/restar → valor posicional → multiplicar → dividir) existe solo en `PLAN-V2.md`, **no en el producto**. |
| 2 | **Cada juego mide sus habilidades por separado.** | `storage.js`: `perfil.habilidades[juegoId]`, `perfil.contenido[juegoId]` | «Sumar» en Asteroides y «sumar» en Taller de Cálculo son dos mediciones sin relación. No existe un **modelo único del niño** («domina sumar hasta 20, le falta la llevada»). |
| 3 | **Una misión de inicio por juego.** | `adaptativo/colocacion.js` (`PREGUNTAS_COLOCACION = 8`) | Con 8 juegos son hasta **64 preguntas de colocación**. Aunque se presenten como aventura, cada juego nuevo empieza **midiendo**. |
| 4 | **No hay memoria en el tiempo.** Los intentos no guardan fecha; el dominio es la proporción de aciertos de los **últimos 8** intentos. | `adaptativo/motor.js` (`ventana: 8`) | Lo que se domina hoy se da por dominado para siempre: **no hay repaso**. Lo que más distingue a Duolingo (repetición espaciada: volver a lo aprendido justo antes de olvidarlo) no existe. |
| 5 | **La sesión es una partida de 10 preguntas.** La enseñanza llega como reacción (tras un error) o una sola vez (introducción). | `core/partidaPreguntas.js`, `lecciones/` | La estructura es «pregunta → calificación» repetida. Falta la secuencia de una **lección**: ver → hacer con ayuda → hacer solo → repasar. (El modo «Aprende» del plan v2 se omitió en la Fase 13.) |
| 6 | **La motivación es por partida, no por avance.** Estrellas y pegatinas por partida terminada; la «racha» es de aciertos dentro de una partida. | `core/resultado.js`, `core/pegatinas.js`, `partidaPreguntas.js` | Premia **resultados**, no **progreso**. No hay un camino que se ilumina, ni metas de sesión, ni razón para volver «a seguir». |

**Conclusión:** el problema de la v0.3 es de **arquitectura**, no de contenido. Los juegos ya saben **cómo** practicar;
falta una capa que decida **qué** practicar, **cuándo** y **en qué orden**, y que lo muestre como un camino.

## 2. Qué copiar de Duolingo y qué no (y por qué)

Duolingo mezcla dos cosas distintas: **pedagogía** (lo que hace que se aprenda) y **mecánicas de enganche** (lo que hace que se vuelva).
La primera se copia; la segunda se adapta con cuidado, porque varias mecánicas funcionan **castigando**, y eso ya nos falló en la v1.

| De Duolingo | ¿Se copia? | Por qué |
|---|---|---|
| **Camino de unidades** con orden de prerrequisitos | **Sí** | Da un «qué sigue» sin que el niño tenga que decidirlo, y hace visible el avance. Es el cambio central. |
| **Lecciones cortas** (3–5 min) | **Sí** | Caben en una clase de cómputo y terminan con éxito. |
| **Retroalimentación inmediata** | Ya existe | Se conserva. |
| **Repetición espaciada** (repasar antes de olvidar) | **Sí** | Es lo que convierte «lo hice bien hoy» en «lo sé». Base: la **curva del olvido** (Ebbinghaus): recordar en el momento justo alarga cada vez el tiempo hasta el siguiente olvido. |
| **Práctica intercalada** (mezclar habilidades) | **Sí** | Obliga a **elegir** la estrategia («¿esto es suma o resta?»), no solo a ejecutarla. Hay evidencia sólida de que mejora la retención en matemáticas. |
| **Habilidades que «se agrietan»** cuando toca repasar | **Sí** | Convierte el repaso en algo visible y natural, no en un castigo. |
| **Vidas / corazones** | **No** | Castigan el error, justo a quien más necesita practicar. Es el mismo defecto de las estrellas de la v1. El portal ya tiene el principio «sin vidas ni *game over*». |
| **Ligas y clasificaciones** | **No** | En un aula, exponen públicamente a los niños más atrasados. |
| **Racha diaria estricta** | **Adaptada** | En la escuela no se juega todos los días (depende del horario de cómputo). Una racha diaria se perdería sin culpa del niño. Se usa **racha semanal** con protección automática (ver Fase 21). |
| **XP / puntos** | **Adaptado** | Se mide progreso en el camino (nodos aprendidos y repasados), no puntos acumulables que invitan a «farmear» lo fácil. |

## 3. Principios del rediseño

1. **Separar «qué practicar» de «cómo practicarlo».** Un **planificador** (lógica pura) decide la habilidad, el nivel y la cantidad;
   los **juegos** se vuelven **actividades** que reciben esa orden y la ejecutan con su material. Es el mismo principio que separar
   una capa de servicio de su interfaz: el currículo no debe saber de pantallas y los juegos no deben saber del currículo.
2. **Un solo modelo del niño, por habilidad canónica**, no por juego. Varios juegos pueden practicar la misma habilidad y todos alimentan la misma medición.
3. **El currículo es datos.** El mapa de habilidades (qué requiere qué) es una lista validada, como ya lo son las lecciones. Añadir una habilidad no es escribir código.
4. **Dominar antes de avanzar** (*mastery learning*), con una regla explicable, y **repasar después de dominar**.
5. **Nada castiga.** Lo que «se agrieta» invita a repasar; no quita nada. Lo que no se usa no se pierde.
6. **Se conserva todo lo de la v0.2:** sin internet, doble clic, PCs viejas, accesibilidad, pruebas por fase, migraciones sin perder progreso. Los juegos siguen disponibles como **«juego libre»**.

## 4. Fases

| Fase | Nombre | Contenido | Entrega |
|---|---|---|---|
| **17** | **Mapa de habilidades** | Grafo de habilidades canónicas con prerrequisitos y qué actividades las practican. Solo datos + validación | Currículo en código, probado |
| **18** | **Modelo único del niño y repaso espaciado** | Esquema v6: estado por habilidad canónica con fechas; cajas de Leitner; migración desde v5 | Base de todo lo demás |
| **19** | **Actividades a pedido** | Contrato de juego extendido: el juego acepta «practica X, nivel N, K preguntas, con tal apoyo» y reporta por habilidad canónica | Juegos reutilizables por el camino |
| **20** | **El Camino** | Nueva pantalla de inicio: unidades y nodos. Lección de 5 min = calentamiento de repaso + aprende + práctica guiada + práctica sola | **v0.3-alfa** — responde la petición |
| **21** | **Repaso, intercalado y motivación de hábito** | Nodos que se agrietan, sesión «Repaso», meta de sesión, racha semanal, pegatina por unidad | v0.3-beta |
| **22** | **Modo maestro del camino y colocación por área** | Una sola misión de inicio por área; vista del camino por niño y grupo | Para la maestra |
| **23** | **Pulido y tercera prueba** | Auditorías, manual, métricas de **retención** (no solo de juego) | **v0.3.0** |

Cada fase termina como hasta ahora: commits separados, pruebas en verde (unitarias y de navegador) y su `docs/AUDITORIA-FASE-N.md`.

### Fase 17 — Mapa de habilidades

**Qué es:** un **grafo dirigido acíclico** (DAG): cada nodo es una habilidad canónica y cada arista dice «para aprender B hay que dominar A».
Los nodos se agrupan en **unidades** (las secciones del camino).

```js
// src/curriculo/mapa.js (ejemplo de forma; los valores exactos se definen en la fase)
{
    id: 'suma-20-pasando',
    nombre: 'Sumar hasta 20 pasando la decena',
    unidad: 'sumar-y-restar',
    requiere: ['suma-10', 'hacer-10'],
    leccion: 'hacer-10',                       // lección de lecciones/ que la enseña
    actividades: [                             // qué juegos la practican y con qué configuración
        { juego: 'taller-calculo', habilidad: 'suma', grado: 1, nivel: 3 },
        { juego: 'asteroides', habilidad: 'suma', grado: 1, nivel: 2, modo: 'tranquilo' }
    ]
}
```

- **Por qué un DAG y no una lista:** una lista obliga a un solo orden; el grafo permite que, al dominar «sumar hasta 10», se abran **varias** opciones (restar, hacer 10) y que el camino tenga ramas cortas.
- **Validación (pruebas):** ids únicos; todo `requiere` existe; **no hay ciclos** (se comprueba con un **orden topológico**: si no se pueden ordenar todos los nodos, hay un ciclo); cada nodo tiene al menos una actividad; cada actividad apunta a un juego, habilidad y nivel que **existen**.
- **Primer alcance:** solo **matemáticas** (5 juegos con la cadena de prerrequisitos ya descrita en `PLAN-V2.md`). Español y medición quedan como «juego libre» hasta decidir (ver §7).
- **Riesgo a verificar al empezar:** cómo se corresponden `grado de contenido + nivel` de cada juego con un nodo. Hay que leer los generadores juego por juego; si dos juegos llaman igual a cosas distintas, el mapa lo hace explícito.

### Fase 18 — Modelo único del niño y repaso espaciado

**Estado por habilidad canónica** (esquema **v6**, con migración desde v5):

```js
perfil.camino = {
    'suma-20-pasando': {
        estado: 'aprendiendo',   // bloqueado | disponible | aprendiendo | dominado
        caja: 2,                 // caja de Leitner (0 = nueva … 5 = muy sabida)
        proximoRepaso: 1760000000000,
        intentos: [{ ok: true, en: 1759900000000 }]   // ahora CON fecha
    }
}
```

- **Sistema de Leitner** (cajas): cada habilidad está en una caja; acertar en un repaso la sube de caja, fallar la regresa a la caja 1.
  Cada caja tiene un intervalo (p. ej. 1, 2, 4, 8, 16 días). Cuando vence, la habilidad «se agrieta» y entra al repaso.
  - *Por qué Leitner y no el algoritmo de Duolingo (Half-Life Regression) o SM-2 (Anki):* esos estiman la probabilidad de recordar con un modelo
    entrenado o con fórmulas por ítem; requieren muchos datos y son difíciles de **explicar en una defensa**. Leitner es una regla de 5 cajas,
    se prueba con números y sigue la misma filosofía del motor actual (heurísticas explicables, no modelos opacos). *Costo:* es menos preciso.
- **Dominado** = la habilidad llegó a la caja 3 **y** la última práctica sin ayuda tuvo ≥ 80 % a la primera. Un nodo dominado **desbloquea** a los que lo requieren.
- **El `MotorAdaptativo` se conserva** para el ajuste fino **dentro** de una actividad; el modelo nuevo decide **entre** sesiones. Son dos escalas de tiempo distintas.
- **Migración v5 → v6:** se deriva un estado inicial de los datos por juego que ya existen (`habilidades`, `contenido`): lo que el niño ya dominaba en algún juego entra como `dominado` en caja 2, para que lo repase pronto en vez de dárselo por sabido.
- **El reloj se inyecta** (`ahora`, como ya hace `Progreso`) para probar vencimientos sin esperar días.

### Fase 19 — Actividades a pedido

Hoy cada juego decide solo qué preguntar (con su motor y su grado de contenido). Para el camino, el juego debe poder **recibir una orden**:

```js
juego.iniciar({ habilidad: 'suma', grado: 1, nivel: 3, preguntas: 4, apoyo: 'completo', nodo: 'suma-20-pasando' });
// …y al terminar reporta, además del Resultado de siempre, los intentos por nodo
```

- Se implementa **una vez** en `PartidaPreguntas` / `partidaConApoyo.js` / `juegoConMaterial.js`, y cada juego solo traduce su configuración.
- Si no recibe orden, el juego se comporta como hoy (**juego libre**). Así no se rompe nada y se puede migrar juego por juego.
- Orden sugerido: Taller de Cálculo → Bloques de Valor → Cajas y Reparto (ya tienen apoyo que se retira) → Asteroides (en modo tranquilo dentro del camino: la presión de tiempo no ayuda a aprender algo nuevo) → Fracciones.

### Fase 20 — El Camino

**Nueva pantalla de inicio:** unidades como secciones y nodos como círculos en un sendero vertical. Cada nodo muestra su estado
(bloqueado, disponible, en curso, dominado, agrietado). Un botón grande **«Seguir»** elige el siguiente nodo: el niño no tiene que decidir.
Los juegos sueltos pasan a una sección secundaria **«Juego libre»**.

**Una lección (~5 minutos, ~10 ejercicios, igual que una partida de hoy):**

| Paso | Qué hace | ¿Cuenta para el dominio? |
|---|---|---|
| 1. **Calentamiento** | 2 ejercicios de habilidades ya dominadas cuyo repaso venció (intercalado) | Sí (repaso) |
| 2. **Aprende** | Solo la primera vez del nodo: la lección con material que ya existe en `lecciones/` | No |
| 3. **Práctica guiada** | 4–5 ejercicios con apoyo que se retira (`apoyo.js`) | Poco |
| 4. **Práctica sola** | 3–4 ejercicios sin ayuda | Sí |
| 5. **Cierre** | Mascota, avance del nodo en el camino, pegatina si cierra unidad | — |

- Puede usar **distintos juegos dentro de la misma lección** (p. ej. guiada en Taller de Cálculo y práctica sola en Asteroides tranquilo). Variar el formato mantiene la novedad sin cambiar la habilidad.
- **Por qué el niño no elige el nodo:** quitar la decisión reduce la carga y evita que repita siempre lo fácil. Puede tocar otros nodos **disponibles** si quiere; nunca los bloqueados.
- Criterio de aceptación: un perfil nuevo ve el camino, pulsa «Seguir», completa una lección con al menos dos actividades distintas, y el avance queda guardado y visible.

### Fase 21 — Repaso, intercalado y motivación de hábito

- **Nodos agrietados** cuando vence su repaso (Fase 18) y un botón **«Repasar»** que arma una sesión intercalada con las habilidades vencidas, de varios juegos.
- **Meta de sesión** que pone la maestra (por omisión: 2 lecciones). Se celebra al cumplirla. No hay meta que «se pierda».
- **Racha semanal:** cuenta semanas con al menos una lección. Las semanas sin clase de cómputo (vacaciones) **no la rompen** si la maestra marca el periodo, o se perdona automáticamente una semana. *Por qué:* la motivación por **pérdida** (miedo a perder la racha) funciona, pero en niños y con un horario que no controlan genera frustración sin culpa.
- **Pegatinas por unidad** (además de las de partida): ligan el premio a **aprender**, no a jugar.

### Fase 22 — Modo maestro del camino y colocación por área

- **Una misión de inicio por área** (no por juego): recorre el mapa con búsqueda binaria sobre el orden topológico y marca como dominados los nodos por debajo del punto donde el niño empieza a fallar. Reutiliza la lógica de `colocacion.js`.
- **Vista del camino por niño y por grupo:** qué nodos domina cada uno, cuáles se le agrietan, dónde se atora el grupo (junto con «Lo que más confunden»). Exportable a CSV.
- *Opcional:* la maestra puede **fijar una unidad** para el grupo (p. ej. «esta semana, fracciones»). Solo si la revisión docente lo pide.

### Fase 23 — Pulido y tercera prueba

Además de lo de siempre (auditorías, manual, ZIP), se cambia **qué se mide**: la v0.2 medía si los niños **terminan y ganan estrellas**;
la v0.3 debe medir si **aprenden y recuerdan**.

| Métrica | Cómo | Meta |
|---|---|---|
| Nodos dominados por niño en 3 sesiones | CSV del camino | Tendencia creciente |
| **Retención:** aciertos a la primera en repasos tras ≥ 7 días | Intentos con fecha (Fase 18) | ≥ 70 % |
| Niños que pulsan «Seguir» sin ayuda | Observación | ≥ 90 % |
| Niños que completan la meta de sesión | Registro local | ≥ 80 % |
| Comparación antes/después en una hoja de 10 ejercicios en papel | Maestra | Mejora en la mayoría |

## 5. Orden recomendado y por qué

1. **17 y 18 primero, aunque no se vean.** El camino es solo una vista de un modelo; si se dibuja antes de tener el modelo, se termina con lógica de currículo dentro de la interfaz, imposible de probar.
2. **19 antes que 20:** sin actividades a pedido, el camino no tiene qué lanzar.
3. **20 es la entrega que responde la petición** («aprender jugando como Duolingo»). Con 17–20 ya hay una v0.3-alfa probable con niños.
4. **21 y 22** dependen de tener datos con fecha y un camino que funcione.

*Alternativa si hay prisa:* un **camino mínimo** solo con la unidad «Sumar y restar» (Taller de Cálculo + Asteroides tranquilo), sin repaso espaciado. Prueba la idea con poco código antes de migrar todo.

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Alcance grande** (toca el modelo de datos y la pantalla principal) | Fases que no rompen lo anterior: cada juego sigue funcionando como «juego libre» hasta migrarlo |
| **Migración v5 → v6 pierde progreso** | Migración probada con datos reales de la v0.2 y copia del dato anterior, como en las migraciones previas |
| **El mapa de habilidades es pedagógicamente incorrecto** (orden o prerrequisitos) | Revisión docente del mapa **antes** de la Fase 20; el mapa es datos, se corrige sin tocar código |
| **Correspondencia ambigua juego ↔ habilidad canónica** | Se resuelve en la Fase 17 leyendo cada generador; se documenta en la auditoría |
| **El repaso aburre** («otra vez sumas») | Repaso corto (2 ejercicios en el calentamiento), intercalado y en otro juego distinto al que se usó para aprender |
| **Intervalos en días no encajan con clases semanales** | El repaso vencido espera a la siguiente sesión (no se «pierde»); se ajustan los intervalos con los datos de la prueba |
| **`app.js` supera el presupuesto de 100 KB** | El mapa y el planificador son datos y lógica pequeña; se mide en cada fase |

## 7. Preguntas abiertas (decisiones tuyas antes de la Fase 17)

1. **¿Cada cuánto usan los niños el portal?** (¿diario, 2 veces por semana, una?) Decide los intervalos de repaso y si la racha es semanal o por sesión.
2. **¿Español y medición entran en el camino** o se quedan como «juego libre» en la v0.3? (Recomendación: solo matemáticas primero; es donde está la brecha observada.)
3. **¿El camino es único por niño o la maestra fija la unidad del grupo?** Cambia el diseño del modo maestro.
4. **¿Quién revisa el mapa de habilidades** (el orden y los prerrequisitos)? Es la decisión pedagógica más importante del plan y no debería tomarla solo el código.
