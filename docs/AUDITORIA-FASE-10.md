# Auditoría — Fase 10: Rescate

Verificación: `pnpm test` (493 pruebas unitarias), `pnpm test:e2e` (pruebas en Chromium real) y `pnpm build`. Plan: [`PLAN-V2.md`](PLAN-V2.md).

## El problema que resuelve

En la primera prueba con niños de 6.º casi ninguno ganó estrellas y no tenían dónde empezar. Había **tres causas mías** (ver PLAN-V2 §1); esta fase ataca dos y deja la tercera (enseñar) para la Fase 11:

| Causa | Qué se cambió |
|---|---|
| Las estrellas solo premiaban acertar **a la primera** | Nueva regla: esforzarse y recuperarse también cuenta |
| El contenido dependía del **grado escolar**, sin escalón por debajo | **El sistema decide solo el grado de contenido** de cada niño y juego (misión de inicio + ajuste) |

## Qué se hizo

### 1. Estrellas nuevas (`src/core/resultado.js`)
Cada pregunta cuenta una vez: *acierto* (a la primera) o *fallo*. Una pregunta fallada que el niño luego resolvió es **recuperada** (subconjunto de los fallos).
`crédito = (aciertos + ½·recuperadas) / (aciertos + fallos)`

| Estrellas | Cuándo |
|---|---|
| ★★★ | crédito ≥ 90 % |
| ★★ | crédito ≥ 60 % (antes: 70 % de aciertos a la primera) |
| ★ | resolvió **al menos una** pregunta (terminar y esforzarse ya cuenta) |
| — | no resolvió ninguna (p. ej. dejó escapar todo sin intentar) |

La exactitud real no se pierde: el modo maestro sigue mostrando el dominio por habilidad (aciertos a la primera).

### 2. Misión de inicio (`src/adaptativo/colocacion.js`, `PartidaPreguntas`)
La **primera vez** que un niño juega un juego de preguntas, hace una partida de **8 preguntas** que **sube y baja de grado de contenido** (escalera):
- Empieza **dos grados por debajo** del tope (el primer contacto debe ser un éxito; si sabe más, sube).
- **2 aciertos seguidos** → sube un grado. **Un error** → baja uno; el **segundo error seguido** → baja **dos** (encuentra el piso sin pasar muchas preguntas seguidas fallando).
- Usa el nivel intermedio (2) de cada grado y **no toca los niveles guardados** (solo mide).
- Se presenta como aventura («¡Misión de inicio!») y **nunca le dice al niño en qué nivel está**.
- Aplica a Asteroides, Atrapa la Ortografía, Reloj y Tren de Fracciones (`static admiteColocacion`). El Memorama no usa preguntas por grado y queda igual.

### 3. Ajuste después de cada partida (`ajustarGradoContenido`)
Mueve **un** grado como máximo, nunca fuera de `[mínimo del juego, grado del niño]`:
- **Baja** si crédito < 40 % **y** las habilidades ya están en el nivel más fácil (el motor tuvo su oportunidad de bajar de nivel dentro del grado y sigue sin poder).
- **Sube** si crédito ≥ 90 % **y** domina el nivel más difícil de las habilidades (no se salta contenido).
- Al cambiar de grado se **reinician los niveles por habilidad** de ese juego (eran del grado anterior).

### 4. Alivio y «modo tranquilo»
Tras **2 preguntas falladas seguidas**, la siguiente baja un nivel (mínimo 1) y, en Asteroides, los asteroides van al **60 % de velocidad** y uno menos (mínimo 3). Se quita al **acertar a la primera** (recuperar una pregunta no lo quita).

### 5. Escalón nuevo por debajo
Asteroides, 1.º nivel 1: **sumas y restas hasta 5** (antes hasta 10). Con la escalera, un niño de 6.º con base muy débil puede llegar a ese piso.

### 6. Modo maestro
Nueva columna **«Contenido que le toca»** por juego, columna `grado_contenido` en el CSV de progreso y botón **«Repetir misión»** por niño (conserva sus estrellas).

### 7. Almacenamiento: migración 1 → 2
`perfil.contenido = { juegoId: grado }`. Es la **primera migración real** del esquema versionado: los perfiles guardados con la v0.1 se conservan (nombre, estrellas, habilidades, ajustes) y ganan `contenido: {}`; un grado inválido se trata como dato dañado (no se confía en `localStorage`).

## Decisiones de diseño (y por qué)

1. **El sistema decide, no la maestra** (petición de la maestra). El ajuste manual no es requisito; solo se puede *repetir* la misión.
2. **Grado de contenido ≠ grado escolar**, y es invisible para el niño: un niño de 6.º que repasa contenido de 3.º no ve «3.º» en ninguna parte (principio 7 del plan: respetar la edad).
3. **La misión no se mezcla con el motor.** Mide *dónde* empezar; el motor adaptativo sigue decidiendo el *nivel dentro* del grado. Dos mecanismos, cada uno con una sola responsabilidad.
4. **Heurísticas simples y explicables** (umbrales 40 % / 90 %, 2 aciertos para subir): se pueden defender ante un docente; un modelo opaco no.
5. **Esforzarse da estrella, pero no es «regalo»:** no resolver nada sigue dando 0; las recuperadas valen la mitad; las 3 estrellas siguen exigiendo ≥ 90 %.
6. **Bajar es más difícil que subir** (condición doble) para no hundir a un niño por una mala tarde.

## Defectos encontrados (en mi propio trabajo) y cómo

1. **El defecto original de las estrellas** (premiar solo el primer intento) es mío de la v1. Hay una prueba con el nombre del defecto.
2. **Expectativas de mis pruebas mal calculadas** al escribir los casos del portal: un caso «mala partida» (1 acierto, 6 recuperadas de 9 fallos) tenía crédito de **40 % exacto**, que no está *por debajo* del umbral. La regla era correcta; el caso, no.
3. Una prueba del **«no premiar no hacer nada»** reveló que mi primera idea («terminar = 1 estrella») habría dado estrella a quien deja escapar todas las preguntas sin tocar nada: se exige haber **resuelto** al menos una.
4. Las preguntas de **arrastrar/pintar no tienen opciones**: mi prueba de la misión asumía botones y falló en Reloj y Fracciones (no en el código).
5. Se evitó un emoji en el aviso de la misión (no se ve a color en equipos viejos).

## Cómo se verificó

- **493 pruebas unitarias** (+72 respecto a la v1 de la fase 9): estrellas (umbrales exactos, monotonía, recuperadas), escalera de la misión (subir, bajar, doble error, límites, converge cerca del nivel real del niño), ajuste de grado, `PartidaPreguntas` (recuperadas, alivio, misión), almacenamiento (migración, validación), portal (primera vez, guardado, sube/baja/mantiene, rangos, modo maestro, CSV) y **las 4 partidas reales** con 60 patrones de respuestas al azar cada una (la misión genera preguntas válidas en todos los peldaños y termina dentro del rango).
- **Mutaciones (10 cambios deliberados, 10 detectados):** umbral de 2 estrellas, recuperadas con peso 1, subir con 1 acierto, bajar siempre 1, bajar sin mirar niveles, alivio que no se quita, tope del rango, no reiniciar habilidades, no contar recuperadas, migración que no agrega `contenido`.
- **Navegador real (Chromium, `file://`):** un perfil nuevo ve el aviso de la misión, juega **8 preguntas «a lo bruto»** (probando botones hasta acertar, el patrón que daba 0 estrellas), ve «¡Misión cumplida!» y **≥ 1 estrella**; la partida siguiente es la normal de **10 preguntas**; 0 errores de consola, 0 peticiones a internet.

## Conceptos que deberías poder explicar

- Por qué se separa *grado escolar* de *grado de contenido*, y por qué el segundo no se le muestra al niño.
- Qué es una **escalera adaptativa** (staircase) y por qué converge cerca del nivel donde el niño empieza a fallar.
- Por qué el ajuste exige **dos condiciones** (crédito y nivel de habilidades) para bajar o subir.
- Por qué las «recuperadas» valen ½ y qué pasaría si valieran 1 (mutante M2).
- Qué hace una **migración de esquema** y por qué la primera es la que más hay que probar.
- Limitaciones estadísticas de decidir un nivel con 8 preguntas.

## Cómo revisar (orden sugerido)

1. `src/core/resultado.js` y `tests/resultado.test.js` (la regla de estrellas).
2. `src/adaptativo/colocacion.js` y `tests/colocacion.test.js` (toda la lógica de decisión, pura).
3. `src/core/partidaPreguntas.js` (misión, alivio, recuperadas) y `tests/partida-v2.test.js`.
4. `src/portal/portal.js` (`nivelDeInicio`, `actualizarGradoContenido`) y los tests «contenido:» de `tests/portal.test.js`.
5. `src/core/storage.js` (migración) y sus pruebas.

## Limitaciones conocidas (y qué validar en la segunda prueba)

- **8 preguntas son pocas para decidir un nivel** (ruido de muestreo: un niño que adivina bien puede subir de más; uno nervioso puede bajar de más). Se corrige con el **ajuste después de cada partida**, pero conviene medirlo.
- **Los umbrales (40 %, 90 %, 2 aciertos, dos grados por debajo) son hipótesis**, no están validados con niños. Observar en la próxima prueba: ¿cuántos terminan la misión en el piso del juego? ¿cuántos suben después?
- La misión elige **habilidades al azar** del grado: un niño que suma bien pero no multiplica puede obtener un resultado ambiguo (la escalera es global por juego, no por habilidad).
- **Subir no avisa de por qué** y bajar es invisible: es deliberado, pero la maestra solo lo ve en el modo maestro.
- **Esta fase no enseña** (la queja principal): solo ajusta dónde empezar. **La Fase 11 agrega las lecciones.** Con un piso mejor y estrellas alcanzables, el niño al menos juega algo a su medida.
- El **«modo tranquilo»** solo cambia la velocidad en Asteroides; el aviso al niño («vamos más despacio») y la «pista más visual» del plan (10.5) **no están**: quedan para la Fase 11 (lecciones).
- La **galería sigue filtrando por grado escolar**: un niño de 6.º no ve el Reloj (1.º–4.º) ni el Memorama (1.º–3.º), aunque su contenido real podría ser ese. Se evalúa en la Fase 11/13.
- Las estrellas son más fáciles de conseguir que en la v1 (60 % en vez de 70 % para 2★, y 1★ por esforzarse). Si pierden valor, se ajustará con datos.
- Con las preguntas de **arrastrar/pintar** (Reloj, Fracciones) la respuesta «equivocada» en la misión es un valor imposible en los tests; en el juego real el niño sí puede equivocarse de verdad: verificado en Chromium (Fracciones).
