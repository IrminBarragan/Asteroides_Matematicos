import { CONFIG } from './configuracion.js';
import { Utilidades } from '../../core/utilidades.js';

/**
 * Clase para gestionar operaciones matemáticas
 * Principio SOLID: Single Responsibility - Solo maneja lógica matemática
 */

export class OperacionMatematica {
    constructor(nivel = 1) {
        this.nivel = nivel;
        this.operando1 = 0;
        this.operando2 = 0;
        this.operador = '';
        this.resultado = 0;
        this.generar();
    }

    /**
     * Genera una nueva operación basada en el nivel
     */
    generar() {
        const operadores = this.obtenerOperadoresDisponibles();
        this.operador = operadores[Utilidades.numeroAleatorio(0, operadores.length - 1)];
        
        const rango = this.obtenerRango();
        
        switch(this.operador) {
            case CONFIG.OPERACIONES.SUMA:
                this.generarSuma(rango);
                break;
            case CONFIG.OPERACIONES.RESTA:
                this.generarResta(rango);
                break;
            case CONFIG.OPERACIONES.MULTIPLICACION:
                this.generarMultiplicacion(rango);
                break;
            case CONFIG.OPERACIONES.DIVISION:
                this.generarDivision(rango);
                break;
        }
    }

    /**
     * Obtiene operadores disponibles según el nivel
     */
    obtenerOperadoresDisponibles() {
        const operadores = [CONFIG.OPERACIONES.SUMA];
        
        if (this.nivel >= 2) {
            operadores.push(CONFIG.OPERACIONES.RESTA);
        }
        if (this.nivel >= 3) {
            operadores.push(CONFIG.OPERACIONES.MULTIPLICACION);
        }
        if (this.nivel >= 5) {
            operadores.push(CONFIG.OPERACIONES.DIVISION);
        }
        
        return operadores;
    }

    /**
     * Obtiene el rango numérico según el nivel
     */
    obtenerRango() {
        const nivelClave = Math.min(this.nivel, 5);
        return CONFIG.RANGOS_NUMERICOS[nivelClave] || CONFIG.RANGOS_NUMERICOS[5];
    }

    /**
     * Genera operación de suma
     */
    generarSuma(rango) {
        this.operando1 = Utilidades.numeroAleatorio(rango.min, rango.max);
        this.operando2 = Utilidades.numeroAleatorio(rango.min, rango.max);
        this.resultado = this.operando1 + this.operando2;
    }

    /**
     * Genera operación de resta
     */
    generarResta(rango) {
        this.operando1 = Utilidades.numeroAleatorio(rango.min, rango.max);
        this.operando2 = Utilidades.numeroAleatorio(rango.min, this.operando1);
        this.resultado = this.operando1 - this.operando2;
    }

    /**
     * Genera operación de multiplicación
     */
    generarMultiplicacion(rango) {
        const maxMult = Math.min(rango.max, 12);
        this.operando1 = Utilidades.numeroAleatorio(2, maxMult);
        this.operando2 = Utilidades.numeroAleatorio(2, maxMult);
        this.resultado = this.operando1 * this.operando2;
    }

    /**
     * Genera operación de división exacta
     */
    generarDivision(rango) {
        const maxDiv = Math.min(rango.max, 12);
        this.operando2 = Utilidades.numeroAleatorio(2, maxDiv);
        this.resultado = Utilidades.numeroAleatorio(2, maxDiv);
        this.operando1 = this.operando2 * this.resultado;
    }

    /**
     * Obtiene el símbolo del operador
     */
    obtenerSimboloOperador() {
        const simbolos = {
            [CONFIG.OPERACIONES.SUMA]: '+',
            [CONFIG.OPERACIONES.RESTA]: '-',
            [CONFIG.OPERACIONES.MULTIPLICACION]: '×',
            [CONFIG.OPERACIONES.DIVISION]: '÷'
        };
        return simbolos[this.operador] || '+';
    }

    /**
     * Obtiene la representación en texto de la operación
     */
    obtenerTexto() {
        return `${this.operando1} ${this.obtenerSimboloOperador()} ${this.operando2} = ?`;
    }

    /**
     * Verifica si un número es la respuesta correcta
     */
    esRespuestaCorrecta(numero) {
        return numero === this.resultado;
    }

    /**
     * Genera números incorrectos para los asteroides
     */
    generarRespuestasIncorrectas(cantidad = 3) {
        const incorrectas = new Set();
        const rango = Math.max(5, Math.abs(this.resultado) * 0.3);
        let intentos = 0;
        const maxIntentos = 100;
        
        while (incorrectas.size < cantidad && intentos < maxIntentos) {
            intentos++;
            let numero;
            
            // Generar números cercanos al resultado para aumentar dificultad
            if (Math.random() < 0.7) {
                // Números cercanos (más difícil)
                const delta = Utilidades.numeroAleatorio(-Math.ceil(rango), Math.ceil(rango));
                numero = this.resultado + delta;
            } else {
                // Números más aleatorios
                const rangoAmplio = Math.max(this.resultado * 2, 20);
                numero = Utilidades.numeroAleatorio(
                    Math.max(0, this.resultado - rangoAmplio),
                    this.resultado + rangoAmplio
                );
            }
            
            // Asegurar que el número sea diferente del resultado y sea válido
            if (numero !== this.resultado && numero >= 0 && !incorrectas.has(numero)) {
                incorrectas.add(numero);
            }
        }
        
        // Si no se pudieron generar suficientes respuestas incorrectas, generar algunas básicas
        while (incorrectas.size < cantidad) {
            const numeroAleatorio = this.resultado + Utilidades.numeroAleatorio(1, 10);
            if (numeroAleatorio !== this.resultado) {
                incorrectas.add(numeroAleatorio);
            }
        }
        
        const respuestasArray = Array.from(incorrectas);
        return respuestasArray;
    }
}
