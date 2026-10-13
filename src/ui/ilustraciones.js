/**
 * Ilustraciones SVG propias para los juegos de lectura (los emojis no se ven en color en equipos antiguos).
 * Los animales reutilizan los avatares. Todo el contenido es constante del código (seguro con svgDesdeMarkup).
 */
import { svgDesdeMarkup } from './dom.js';
import { avatar, IDS_AVATARES } from './avatares.js';

const FONDO = (color) => `<circle cx="32" cy="32" r="32" fill="${color}"/>`;

const DIBUJOS = {
    sol: `${FONDO('#e0f2fe')}<g stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round">
        <path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g>
        <circle cx="32" cy="32" r="14" fill="#fbbf24"/><circle cx="27" cy="29" r="1.8" fill="#92400e"/><circle cx="37" cy="29" r="1.8" fill="#92400e"/>
        <path d="M26 36q6 5 12 0" stroke="#92400e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    luna: `${FONDO('#312e81')}<circle cx="30" cy="32" r="18" fill="#fde68a"/><circle cx="40" cy="26" r="15" fill="#312e81"/>
        <circle cx="46" cy="16" r="1.8" fill="#fff"/><circle cx="52" cy="34" r="1.4" fill="#fff"/><circle cx="14" cy="14" r="1.4" fill="#fff"/><circle cx="44" cy="48" r="1.6" fill="#fff"/>`,
    casa: `${FONDO('#dcfce7')}<rect x="14" y="30" width="36" height="24" fill="#fbbf24"/><path d="M10 32L32 12l22 20z" fill="#dc2626"/>
        <rect x="27" y="40" width="10" height="14" rx="1" fill="#92400e"/><rect x="17" y="35" width="8" height="8" fill="#bae6fd" stroke="#92400e" stroke-width="1.5"/>
        <rect x="39" y="35" width="8" height="8" fill="#bae6fd" stroke="#92400e" stroke-width="1.5"/>`,
    arbol: `${FONDO('#e0f2fe')}<rect x="28" y="36" width="8" height="20" fill="#92400e"/><circle cx="32" cy="24" r="15" fill="#22c55e"/>
        <circle cx="22" cy="31" r="9" fill="#16a34a"/><circle cx="42" cy="31" r="9" fill="#16a34a"/><circle cx="27" cy="22" r="2.2" fill="#ef4444"/><circle cx="38" cy="27" r="2.2" fill="#ef4444"/>`,
    flor: `${FONDO('#fef9c3')}<path d="M32 30v26" stroke="#16a34a" stroke-width="3.5"/><path d="M32 46q-10-2-12-10 9 0 12 10z" fill="#22c55e"/>
        <g fill="#f472b6"><circle cx="32" cy="14" r="7"/><circle cx="42" cy="21" r="7"/><circle cx="38" cy="32" r="7"/><circle cx="26" cy="32" r="7"/><circle cx="22" cy="21" r="7"/></g>
        <circle cx="32" cy="24" r="6" fill="#fbbf24"/>`,
    pez: `${FONDO('#cffafe')}<path d="M10 32q14-18 32 0-18 18-32 0z" fill="#fb923c"/><path d="M42 32l12-10v20z" fill="#f97316"/>
        <circle cx="21" cy="29" r="2.8" fill="#fff"/><circle cx="21" cy="29" r="1.3" fill="#1f2937"/><path d="M30 24q4 8 0 16" stroke="#ea580c" stroke-width="2" fill="none"/>
        <circle cx="48" cy="12" r="2" fill="#7dd3fc"/><circle cx="54" cy="18" r="1.4" fill="#7dd3fc"/>`,
    pelota: `${FONDO('#dcfce7')}<circle cx="32" cy="32" r="19" fill="#ef4444"/><path d="M13 32h38M32 13q-14 19 0 38M32 13q14 19 0 38" stroke="#fff" stroke-width="2.6" fill="none"/>`,
    libro: `${FONDO('#ede9fe')}<path d="M8 18l24 5v30L8 48z" fill="#3b82f6"/><path d="M56 18l-24 5v30l24-5z" fill="#60a5fa"/>
        <path d="M13 24l14 3M13 31l14 3M13 38l14 3" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M51 24l-14 3M51 31l-14 3M51 38l-14 3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
    estrella: `${FONDO('#1e1b4b')}<polygon points="32,8 38,25 56,26 42,37 47,55 32,45 17,55 22,37 8,26 26,25" fill="#fbbf24" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="27" cy="31" r="1.8" fill="#92400e"/><circle cx="37" cy="31" r="1.8" fill="#92400e"/><path d="M28 37q4 3 8 0" stroke="#92400e" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    nube: `${FONDO('#bae6fd')}<g fill="#fff"><circle cx="22" cy="34" r="11"/><circle cx="34" cy="27" r="14"/><circle cx="45" cy="35" r="10"/><rect x="18" y="34" width="32" height="11" rx="5"/></g>
        <circle cx="29" cy="36" r="1.6" fill="#475569"/><circle cx="39" cy="36" r="1.6" fill="#475569"/><path d="M31 40q3 2.5 6 0" stroke="#475569" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    manzana: `${FONDO('#f0fdf4')}<path d="M32 20c-8-6-19-1-19 12 0 12 8 22 14 22 3 0 3-1 5-1s2 1 5 1c6 0 14-10 14-22 0-13-11-18-19-12z" fill="#ef4444"/>
        <path d="M32 20q0-8 5-11" stroke="#92400e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M34 15q7-6 12-1-4 7-12 1z" fill="#22c55e"/>`,
    mesa: `${FONDO('#fef3c7')}<rect x="8" y="22" width="48" height="8" rx="2" fill="#b45309"/><rect x="12" y="30" width="6" height="26" fill="#92400e"/><rect x="46" y="30" width="6" height="26" fill="#92400e"/>`,
    silla: `${FONDO('#fce7f3')}<rect x="17" y="8" width="7" height="30" rx="2" fill="#b45309"/><rect x="17" y="8" width="24" height="5" rx="2" fill="#b45309"/><rect x="14" y="34" width="34" height="7" rx="2" fill="#d97706"/>
        <rect x="16" y="41" width="6" height="16" fill="#92400e"/><rect x="40" y="41" width="6" height="16" fill="#92400e"/>`,
    pan: `${FONDO('#fef9c3')}<path d="M10 38c0-14 10-22 22-22s22 8 22 22c0 6-4 10-10 10H20c-6 0-10-4-10-10z" fill="#d97706"/>
        <path d="M20 26l7 8M31 22l7 8M42 26l6 7" stroke="#fde68a" stroke-width="3.5" stroke-linecap="round"/>`,
    taza: `${FONDO('#e0f2fe')}<path d="M14 26h30v14c0 8-6 14-15 14s-15-6-15-14z" fill="#38bdf8"/><path d="M44 30h4a6 6 0 0 1 0 12h-5" stroke="#38bdf8" stroke-width="4" fill="none"/>
        <path d="M24 20q-3-4 0-8M32 20q-3-4 0-8M40 20q-3-4 0-8" stroke="#94a3b8" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    llave: `${FONDO('#fef9c3')}<circle cx="21" cy="24" r="11" fill="#fbbf24" stroke="#d97706" stroke-width="3"/><circle cx="21" cy="24" r="4.5" fill="#fef9c3"/>
        <path d="M29 32l22 22" stroke="#d97706" stroke-width="6" stroke-linecap="round"/><path d="M40 43l6-6M46 49l6-6" stroke="#d97706" stroke-width="5" stroke-linecap="round"/>`
};

/** Identificadores de todas las ilustraciones: los dibujos propios + los animales. */
export const IDS_ILUSTRACIONES = [...Object.keys(DIBUJOS), ...IDS_AVATARES];

/** Devuelve un <svg> decorativo (aria-hidden). Quien lo use debe dar el nombre como texto. */
export function ilustracion(id, clase = 'ilustracion') {
    if (IDS_AVATARES.includes(id)) return avatar(id, clase);
    if (!DIBUJOS[id]) throw new Error(`No existe la ilustración "${id}"`);
    const svg = svgDesdeMarkup(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${DIBUJOS[id]}</svg>`
    );
    svg.setAttribute('class', clase);
    return svg;
}
