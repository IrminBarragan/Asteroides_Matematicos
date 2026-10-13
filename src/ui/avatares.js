/**
 * Avatares de animales como SVG propios (los emojis no se ven bien en Windows 7/10 antiguos).
 * Todo el contenido es constante del código, por eso es seguro usarlo con svgDesdeMarkup.
 */
import { svgDesdeMarkup } from './dom.js';

const ojos = (x1, x2, y) =>
    `<circle cx="${x1}" cy="${y}" r="3" fill="#1f2937"/><circle cx="${x2}" cy="${y}" r="3" fill="#1f2937"/>`;

const CUERPOS = {
    gato: `<circle cx="32" cy="32" r="32" fill="#fef3c7"/>
        <path d="M13 28 L17 7 L31 18 Z" fill="#f59e0b"/><path d="M51 28 L47 7 L33 18 Z" fill="#f59e0b"/>
        <path d="M17 22 L19 13 L25 18 Z" fill="#fbcfe8"/><path d="M47 22 L45 13 L39 18 Z" fill="#fbcfe8"/>
        <circle cx="32" cy="37" r="19" fill="#f59e0b"/>${ojos(25, 39, 34)}
        <path d="M29 41 L35 41 L32 45 Z" fill="#be185d"/>
        <path d="M32 45 Q28 49 24 47 M32 45 Q36 49 40 47" stroke="#1f2937" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    perro: `<circle cx="32" cy="32" r="32" fill="#dbeafe"/>
        <ellipse cx="13" cy="33" rx="7" ry="14" fill="#92400e" transform="rotate(10 13 33)"/>
        <ellipse cx="51" cy="33" rx="7" ry="14" fill="#92400e" transform="rotate(-10 51 33)"/>
        <circle cx="32" cy="35" r="19" fill="#d6a56b"/>
        <ellipse cx="32" cy="43" rx="10" ry="8" fill="#f5deb3"/>${ojos(25, 39, 31)}
        <ellipse cx="32" cy="40" rx="4.5" ry="3.2" fill="#1f2937"/>
        <path d="M32 43 L32 47 M27 47 Q32 51 37 47" stroke="#1f2937" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    conejo: `<circle cx="32" cy="32" r="32" fill="#fce7f3"/>
        <ellipse cx="23" cy="14" rx="6" ry="15" fill="#e5e7eb"/><ellipse cx="41" cy="14" rx="6" ry="15" fill="#e5e7eb"/>
        <ellipse cx="23" cy="15" rx="3" ry="11" fill="#f9a8d4"/><ellipse cx="41" cy="15" rx="3" ry="11" fill="#f9a8d4"/>
        <circle cx="32" cy="39" r="18" fill="#f3f4f6"/>${ojos(25, 39, 36)}
        <path d="M30 42 L34 42 L32 45 Z" fill="#ec4899"/>
        <path d="M32 45 Q29 49 26 47 M32 45 Q35 49 38 47" stroke="#1f2937" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    zorro: `<circle cx="32" cy="32" r="32" fill="#ffedd5"/>
        <path d="M9 23 L21 9 L32 20 L43 9 L55 23 L47 47 Q32 60 17 47 Z" fill="#ea580c"/>
        <path d="M19 38 Q32 58 45 38 Q32 46 19 38 Z" fill="#fff"/>${ojos(25, 39, 33)}
        <circle cx="32" cy="46" r="3" fill="#1f2937"/>`,
    panda: `<circle cx="32" cy="32" r="32" fill="#dcfce7"/>
        <circle cx="16" cy="16" r="8" fill="#1f2937"/><circle cx="48" cy="16" r="8" fill="#1f2937"/>
        <circle cx="32" cy="36" r="21" fill="#fff"/>
        <ellipse cx="24" cy="33" rx="5" ry="6.5" fill="#1f2937" transform="rotate(-20 24 33)"/>
        <ellipse cx="40" cy="33" rx="5" ry="6.5" fill="#1f2937" transform="rotate(20 40 33)"/>
        <circle cx="24.5" cy="33" r="1.8" fill="#fff"/><circle cx="39.5" cy="33" r="1.8" fill="#fff"/>
        <ellipse cx="32" cy="43" rx="3.5" ry="2.6" fill="#1f2937"/>
        <path d="M32 45 Q28 49 25 47 M32 45 Q36 49 39 47" stroke="#1f2937" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    leon: `<circle cx="32" cy="32" r="32" fill="#fef9c3"/>
        <circle cx="32" cy="34" r="27" fill="#b45309"/>
        <circle cx="32" cy="35" r="18" fill="#fbbf24"/>${ojos(26, 38, 32)}
        <ellipse cx="32" cy="40" rx="4" ry="3" fill="#7c2d12"/>
        <path d="M32 43 L32 46 M27 46 Q32 50 37 46" stroke="#7c2d12" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    rana: `<circle cx="32" cy="32" r="32" fill="#dcfce7"/>
        <ellipse cx="32" cy="40" rx="25" ry="18" fill="#22c55e"/>
        <circle cx="19" cy="22" r="9" fill="#22c55e"/><circle cx="45" cy="22" r="9" fill="#22c55e"/>
        <circle cx="19" cy="22" r="5.5" fill="#fff"/><circle cx="45" cy="22" r="5.5" fill="#fff"/>
        <circle cx="19" cy="22" r="2.6" fill="#1f2937"/><circle cx="45" cy="22" r="2.6" fill="#1f2937"/>
        <path d="M17 42 Q32 54 47 42" stroke="#166534" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <circle cx="28" cy="36" r="1.3" fill="#166534"/><circle cx="36" cy="36" r="1.3" fill="#166534"/>`,
    pulpo: `<circle cx="32" cy="32" r="32" fill="#fce7f3"/>
        <circle cx="32" cy="26" r="19" fill="#a855f7"/>
        <path d="M14 38 Q12 52 18 54 Q21 46 22 40 Z M24 40 Q22 56 29 56 Q31 48 30 41 Z M34 41 Q33 56 39 56 Q41 48 40 40 Z M42 40 Q44 48 47 54 Q53 52 50 38 Z" fill="#a855f7"/>
        <circle cx="25" cy="26" r="4.5" fill="#fff"/><circle cx="39" cy="26" r="4.5" fill="#fff"/>
        <circle cx="25.5" cy="27" r="2.2" fill="#1f2937"/><circle cx="38.5" cy="27" r="2.2" fill="#1f2937"/>
        <path d="M27 35 Q32 39 37 35" stroke="#581c87" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
};

export const IDS_AVATARES = Object.keys(CUERPOS);

export const NOMBRES_AVATAR = {
    gato: 'Gato', perro: 'Perro', conejo: 'Conejo', zorro: 'Zorro',
    panda: 'Panda', leon: 'León', rana: 'Rana', pulpo: 'Pulpo'
};

/** Devuelve un <svg> decorativo (aria-hidden). Quien lo use debe poner el nombre en texto. */
export function avatar(id, clase = 'avatar') {
    const cuerpo = CUERPOS[id] || CUERPOS.gato;
    const svg = svgDesdeMarkup(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${cuerpo}</svg>`);
    svg.setAttribute('class', clase);
    return svg;
}
