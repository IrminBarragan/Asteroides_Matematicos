/**
 * Configuración global del juego
 * Principio SOLID: Single Responsibility - Este módulo solo maneja constantes
 */

const CONFIG = {
    // Dimensiones del canvas
    CANVAS: {
        ANCHO: 900,
        ALTO: 600
    },

    // Configuración de asteroides
    ASTEROIDE: {
        RADIO_MIN: 30,
        RADIO_MAX: 45,
        VELOCIDAD_INICIAL: 1,
        VELOCIDAD_MAX: 5,
        INCREMENTO_VELOCIDAD: 0.3,
        CANTIDAD_INICIAL: 4,
        CANTIDAD_MAXIMA: 8
    },

    // Configuración de la nave
    NAVE: {
        ANCHO: 90,  // Aumentado de 60 a 90
        ALTO: 120,  // Aumentado de 80 a 120
        POSICION_Y: 500,
        VELOCIDAD_LASER: 8,
        IMAGEN_URL: 'img/nave.png' // Ruta de la imagen de la nave (opcional)
    },

    // Configuración de puntuación
    PUNTUACION: {
        ACIERTO: 10,
        COMBO: 5,
        ITEM_ESPECIAL: 50
    },

    // Configuración de vidas
    VIDAS: {
        INICIAL: 3,
        MAXIMA: 5
    },

    // Configuración de niveles
    NIVELES: {
        PUNTOS_POR_NIVEL: 100,
        NIVEL_MAX: 10
    },

    // Tipos de operaciones matemáticas
    OPERACIONES: {
        SUMA: 'suma',
        RESTA: 'resta',
        MULTIPLICACION: 'multiplicacion',
        DIVISION: 'division'
    },

    // Rangos numéricos por nivel
    RANGOS_NUMERICOS: {
        1: { min: 1, max: 10 },
        2: { min: 1, max: 20 },
        3: { min: 5, max: 30 },
        4: { min: 10, max: 50 },
        5: { min: 10, max: 100 }
    },

    // Tipos de ítems especiales
    ITEMS: {
        ESCUDO: 'escudo',
        RALENTIZAR: 'ralentizar',
        DOBLE_PUNTOS: 'doblePuntos',
        VIDA_EXTRA: 'vidaExtra'
    },

    // Colores
    COLORES: {
        NAVE: '#4ECDC4',
        LASER: '#FFE66D',
        ASTEROIDE: '#FF6B6B',
        CORRECTO: '#4ECDC4',
        INCORRECTO: '#FF6B6B',
        PARTICULA: '#FFE66D',
        ESTRELLAS: '#FFFFFF',
        ITEMS: {
            escudo: '#4ECDC4',
            ralentizar: '#A8E6CF',
            doblePuntos: '#FFD93D',
            vidaExtra: '#FF6B9D'
        }
    },

    // Audio
    AUDIO: {
        VOLUMEN_MUSICA: 0.3,
        VOLUMEN_EFECTOS: 0.5
    }
};

// Hacer la configuración inmutable
Object.freeze(CONFIG);
