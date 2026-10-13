/**
 * Matemática del tiempo y del reloj (funciones puras, sin DOM).
 *
 * Convenciones:
 *  - Hora de 12 h: h = 1..12 (las 12 en el reloj; 0 se normaliza a 12) y minutos m = 0..59.
 *  - Hora de 24 h: h24 = 0..23.
 *  - "Minutos del día": t = h24 * 60 + m (0..1439), útil para sumar duraciones sin errores de acarreo.
 *  - Ángulos en grados, 0° = las 12 (arriba) y crecen en sentido de las manecillas del reloj.
 */

const NOMBRES_HORA = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once'];
const MINUTOS_EN_PALABRAS = { 5: 'cinco', 10: 'diez', 20: 'veinte', 25: 'veinticinco' };

/** 0 y 12 → 12; 13 → 1; etc. */
export const normalizarHora12 = (h) => (h % 12) || 12;

/** Número único para una hora de reloj de 12 h (se usa para comparar "el niño puso exactamente esta hora"). */
export const codigoHora = (h, m) => (h % 12) * 60 + m;

// ---------- Ángulos de las manecillas ----------

/** El minutero avanza 6° por minuto. */
export const anguloMinutero = (m) => (m % 60) * 6;

/** El horario avanza 30° por hora Y 0.5° por minuto (por eso a las 3:30 está a mitad de camino entre el 3 y el 4). */
export const anguloHorario = (h, m) => ((h % 12) * 30 + (m % 60) * 0.5) % 360;

/** Ángulo (0–360, desde las 12, en sentido horario) de un punto relativo al centro. dy crece hacia ABAJO (pantalla). */
export function anguloDesdeCentro(dx, dy) {
    const grados = (Math.atan2(dx, -dy) * 180) / Math.PI;
    return grados < 0 ? grados + 360 : grados;
}

/** Minutos (0–59) más cercanos a un ángulo, redondeando al `paso` indicado (1, 5, 15, 30). */
export function minutosDesdeAngulo(angulo, paso = 1) {
    const bruto = Math.round(angulo / 6 / paso) * paso;
    return ((bruto % 60) + 60) % 60;
}

/** Hora (1–12) más cercana a un ángulo del horario. */
export function horaDesdeAngulo(angulo) {
    return normalizarHora12(Math.round(angulo / 30));
}

/** Diferencia más corta entre dos ángulos (0–180). */
export function diferenciaAngular(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
}

/**
 * ¿Qué manecilla quiso tomar el niño al tocar? Lejos del centro solo puede ser el minutero (es más largo);
 * cerca del centro, la que esté angularmente más cerca del toque (y el horario si hay empate: queda debajo del minutero).
 */
export function elegirMano({ angulo, radio, anguloHorario: ah, anguloMinutero: am, largoHorario, margen = 14 }) {
    if (radio > largoHorario + margen) return 'minuto';
    return diferenciaAngular(angulo, am) < diferenciaAngular(angulo, ah) ? 'minuto' : 'hora';
}

// ---------- Formatos ----------

const dosDigitos = (n) => String(n).padStart(2, '0');

/** "3:05" (reloj de 12 h, sin cero inicial en la hora). */
export const formatoDigital = (h, m) => `${normalizarHora12(h)}:${dosDigitos(m)}`;

/** "15:05" (reloj de 24 h, con dos dígitos). */
export const formato24 = (h24, m) => `${dosDigitos(h24)}:${dosDigitos(m)}`;

/** "3:05 p. m." */
export const formato12ConPeriodo = (h24, m) => `${formatoDigital(h24, m)} ${h24 >= 12 ? 'p. m.' : 'a. m.'}`;

/** Parte del día en palabras, para los enunciados ("de la tarde"). */
export function periodoDelDia(h24) {
    if (h24 < 6) return 'de la madrugada';
    if (h24 < 12) return 'de la mañana';
    if (h24 < 19) return 'de la tarde';
    return 'de la noche';
}

/** De una hora de 12 h con a. m./p. m. a las 24 h. 12 a. m. = 0 y 12 p. m. = 12. */
export const a24 = (h12, pm) => (h12 % 12) + (pm ? 12 : 0);

/** De 24 h a { h (1–12), pm }. */
export const a12 = (h24) => ({ h: normalizarHora12(h24), pm: h24 >= 12 });

// ---------- Minutos del día y duraciones ----------

export const MINUTOS_POR_DIA = 1440;
export const minutosDelDia = (h24, m) => h24 * 60 + m;
export const desdeMinutosDelDia = (t) => {
    const n = ((t % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
    return { h24: Math.floor(n / 60), m: n % 60 };
};

/** "25 minutos", "1 hora", "1 hora y 15 minutos", "2 horas y 30 minutos". */
export function formatoDuracion(minutos) {
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    const h = horas === 1 ? '1 hora' : `${horas} horas`;
    const m = resto === 1 ? '1 minuto' : `${resto} minutos`;
    if (horas === 0) return m;
    return resto === 0 ? h : `${h} y ${m}`;
}

// ---------- La hora dicha con palabras ----------

function nombreDeHora(h) {
    const n = normalizarHora12(h);
    return `${n === 1 ? 'la' : 'las'} ${NOMBRES_HORA[n % 12]}`;
}

/**
 * "las tres y media", "la una en punto", "las cuatro menos cuarto".
 * Solo para minutos múltiplos de 5 (así se dice la hora en la escuela); con otros minutos se lanza un error.
 */
export function textoEnPalabras(h, m) {
    if (m % 5 !== 0) throw new Error(`textoEnPalabras solo admite minutos múltiplos de 5 (recibió ${m})`);
    if (m === 0) return `${nombreDeHora(h)} en punto`;
    if (m === 15) return `${nombreDeHora(h)} y cuarto`;
    if (m === 30) return `${nombreDeHora(h)} y media`;
    if (m < 30) return `${nombreDeHora(h)} y ${MINUTOS_EN_PALABRAS[m]}`;
    // De 35 a 55 se dice "menos": las 3:45 son "las cuatro menos cuarto"
    const falta = 60 - m;
    return `${nombreDeHora(h + 1)} menos ${falta === 15 ? 'cuarto' : MINUTOS_EN_PALABRAS[falta]}`;
}
