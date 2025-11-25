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
        ANCHO: 90,
        ALTO: 120,
        POSICION_Y: 500,
        VELOCIDAD_LASER: 8,
        IMAGEN_URL: 'img/nave.png'
    },

    // Configuración de puntuación
    PUNTUACION: {
        ACIERTO: 10,
        COMBO: 5,
        ITEM_ESPECIAL: 50
    },

    // Configuración de vidas
    VIDAS: {
        INICIAL: 5,
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

    // Nueva Paleta de Colores
    COLORES: {
        PRIMARY: '#5046e5',
        PRIMARY_DARK: '#3d35b8',
        PRIMARY_LIGHT: '#6b5ff7',
        BACKGROUND: '#f5f7fa',
        SURFACE: '#ffffff',
        TEXT_PRIMARY: '#2d3748',
        TEXT_SECONDARY: '#718096',
        TEXT_LIGHT: '#a0aec0',
        BORDER: '#e2e8f0',
        SUCCESS: '#48bb78',
        WARNING: '#ed8936',
        ERROR: '#f56565',

        // Colores específicos del juego
        NAVE: '#5046e5',
        LASER: '#6b5ff7',
        ASTEROIDE: '#ed8936',
        CORRECTO: '#48bb78',
        INCORRECTO: '#f56565',
        PARTICULA: '#6b5ff7',
        ESTRELLAS: '#ffffff',
        CANVAS_BG: '#1a1d2e',
        CANVAS_BG_DARK: '#0f111a',

        ITEMS: {
            escudo: '#5046e5',
            ralentizar: '#6b5ff7',
            doblePuntos: '#ed8936',
            vidaExtra: '#f56565'
        }
    },

    // Audio
    AUDIO: {
        VOLUMEN_MUSICA: 0.3,
        VOLUMEN_EFECTOS: 0.5
    },

    // Configuración de IA Adaptativa
    IA: {
        // Intervalos de evaluación
        INTERVALO_EVALUACION: 5, // Evaluar cada 5 respuestas

        // Umbrales de precisión para ajustar dificultad
        PRECISION_ALTA: 0.85, // 85% de aciertos
        PRECISION_BAJA: 0.50, // 50% de aciertos

        // Umbrales de tiempo de respuesta (en ms)
        TIEMPO_RAPIDO: 2000,  // Menos de 2 segundos
        TIEMPO_LENTO: 5000,   // Más de 5 segundos

        // Factores de ajuste
        AJUSTE_VELOCIDAD_FACIL: 0.7,
        AJUSTE_VELOCIDAD_DIFICIL: 1.3,
        AJUSTE_ASTEROIDES_FACIL: -1,
        AJUSTE_ASTEROIDES_DIFICIL: 1,

        // Patrones de error
        UMBRAL_OPERACION_DIFICIL: 3, // Si falla 3 veces el mismo tipo

        // Recomendaciones
        MOSTRAR_AYUDA_TRAS_FALLOS: 3,
        MOSTRAR_MOTIVACION_TRAS_ACIERTOS: 5
    }
};

// Hacer la configuración inmutable
Object.freeze(CONFIG);