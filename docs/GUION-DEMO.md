# Guion de la demostración (≈ 10–12 minutos)

Pensado para presentar el portal frente a un jurado o a docentes. Los tiempos son orientativos.

## Antes de empezar (checklist de 5 minutos)

- [ ] Abrir `index.html` **en la computadora de la presentación** y comprobar que carga (sin internet: desconecta el Wi-Fi para demostrarlo).
- [ ] Probar en el **mismo navegador** que usarás. Tener un segundo navegador a la mano.
- [ ] **Borrar el progreso de prueba** (Modo maestro → Borrar todo) o preparar a propósito 2–3 jugadores de ejemplo (un niño de 2.º y uno de 5.º).
- [ ] **Cambiar el PIN** si es necesario (por defecto `2468`).
- [ ] Volumen al 50 %. Comprobar si hay voz en español (¿aparece «Escuchar»?).
- [ ] Tener abierta en otra pestaña la guía de defensa (`docs/GUIA-DEFENSA.md`) y el código del juego que explicarás.
- [ ] Plan B: el ZIP en una USB y una captura de pantalla de cada juego.

## Guion

### 1. Contexto (1 min)
«Partí de un juego, *Asteroides Matemáticos*, y lo convertí en un **portal de 5 juegos educativos para 1.º–6.º**, pensado para las PCs de una primaria: **funciona sin internet y con doble clic**.»

### 2. El portal (2 min)
1. Pantalla de bienvenida → crear un jugador de **2.º**: apodo, avatar, grado. Mostrar que un apodo con HTML no rompe nada (opcional: `<b>hola</b>`).
2. La galería muestra **solo los juegos de su grado**. «Cada niño ve lo que le toca».
3. Volver a «¿Quién juega?»: «varios niños comparten la computadora».

### 3. Un juego de lectura/lógica con decisión pedagógica (2 min) — *Reloj Aventurero (2.º)*
1. Leer una hora → equivocarse **a propósito** → mostrar la **pista** y que **no se castiga**.
2. Acertar → mostrar la **explicación**.
3. «Poner la hora»: arrastrar las manecillas (ratón; si hay pantalla táctil, con el dedo). Resaltar el *snap*: el minutero «salta» para no depender de la puntería.

### 4. La parte técnica visible (2 min) — *Tren de Fracciones (5.º o 6.º)*
1. Una suma de fracciones con distinto denominador: «el error clásico, **1/2 + 1/3 = 2/5**, aparece como opción engañosa a propósito».
2. Mostrar la **explicación con el mcm**.
3. En 3.º (otro jugador o cambiando de perfil): **pintar** una fracción tocando partes; el teclado también funciona (Tab, Espacio).

### 5. Adaptación y progreso (2 min)
1. Entrar al **Modo maestro** (PIN): tabla de **habilidades y dominio reciente**.
2. Descargar el **CSV** y abrirlo en Excel (el apodo `=1+1` se neutraliza: seguridad).
3. «El sistema ajusta el nivel **por habilidad**, con una heurística simple y explicable (umbrales 85 % / 50 % sobre los últimos 8 intentos), no con un modelo opaco».

### 6. Calidad e ingeniería (1–2 min)
- «**421 pruebas unitarias** y **28 pruebas en un navegador real**; las pruebas de las respuestas **recalculan** el resultado por su cuenta.»
- «Además de las pruebas, **rompí el código a propósito** (mutaciones) para comprobar que las pruebas lo detectan.»
- «Dependencias mínimas (4, de desarrollo) con **pnpm configurado por seguridad**; en el navegador del niño **no corre código de terceros**.»
- Mostrar `docs/` y una `AUDITORIA-FASE-N.md`: «cada fase terminó con una auditoría: decisiones, **errores que encontré en mi propio trabajo** y limitaciones».

### 7. Cierre (30 s)
«Limitaciones honestas: falta validación de **contenido por docentes** y una **prueba en las PCs reales**; el progreso vive en el navegador de cada computadora. Siguiente paso: piloto con un grupo.»

## Si algo sale mal

| Situación | Respuesta |
|---|---|
| El navegador no abre el portal | Abrir con otro navegador; si no, mostrar las capturas y el ZIP. |
| Sin sonido | «Funciona sin sonido por diseño; el audio es un refuerzo.» |
| Una pregunta se ve rara | Es una buena ocasión para mostrar el modo maestro o decir «lo anoto para la revisión docente». No improvises una explicación que no puedas defender. |
| Pregunta técnica que no sabes | «Eso lo decidí por X; la alternativa Y tiene Z desventaja»; si no es cierto, di que lo revisarás. Ver `GUIA-DEFENSA.md`. |
