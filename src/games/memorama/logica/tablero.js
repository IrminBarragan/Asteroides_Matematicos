/**
 * Motor de un tablero de memorama (sin DOM): qué cartas están boca arriba, cuáles se encontraron,
 * y cuándo un error era "evitable".
 *
 * ERROR EVITABLE: al voltear la segunda carta, falla la pareja y la pareja de la PRIMERA carta ya se había
 * visto antes. Es decir, el niño podía haber acertado recordando. Un fallo "a ciegas" (explorar cartas
 * nuevas) es parte normal del juego y NO cuenta como error: de lo contrario ni un jugador perfecto
 * podría sacar tres estrellas.
 */
export class Tablero {
    /** @param {{id:string, parejaId:string}[]} cartas */
    constructor(cartas) {
        this.cartas = cartas.map((c) => ({ ...c, estado: 'oculta', vista: false }));
        this.porId = new Map(this.cartas.map((c) => [c.id, c]));
        this.volteadas = [];       // cartas boca arriba que aún no se resuelven (0, 1 o 2)
        this.fallo = null;         // fallo pendiente de ocultar
        this.parejasEncontradas = 0;
        this.totalParejas = cartas.length / 2;
    }

    get completo() {
        return this.parejasEncontradas === this.totalParejas;
    }

    /** Mientras hay un fallo a la vista no se aceptan más cartas (el niño debe verlo). */
    get bloqueado() {
        return this.fallo !== null;
    }

    /**
     * El niño voltea una carta.
     * @returns {{tipo:'ignorada'}|{tipo:'primera', carta:Object}
     *          |{tipo:'pareja', cartas:Object[], parejaId:string}
     *          |{tipo:'fallo', cartas:Object[], evitable:boolean}}
     */
    voltear(id) {
        const carta = this.porId.get(id);
        if (!carta || carta.estado !== 'oculta' || this.bloqueado) return { tipo: 'ignorada' };

        carta.estado = 'visible';
        this.volteadas.push(carta);
        if (this.volteadas.length === 1) {
            return { tipo: 'primera', carta };
        }

        const [primera, segunda] = this.volteadas;
        if (primera.parejaId === segunda.parejaId) {
            primera.estado = 'encontrada';
            segunda.estado = 'encontrada';
            primera.vista = segunda.vista = true;
            this.volteadas = [];
            this.parejasEncontradas++;
            return { tipo: 'pareja', cartas: [primera, segunda], parejaId: primera.parejaId };
        }

        const compañera = this.cartas.find((c) => c.parejaId === primera.parejaId && c !== primera);
        const evitable = compañera.vista; // ya se había visto la pareja de la primera
        primera.vista = segunda.vista = true;
        this.fallo = { cartas: [primera, segunda], evitable };
        return { tipo: 'fallo', cartas: [primera, segunda], evitable };
    }

    /** Voltea boca abajo las dos cartas del fallo (la vista lo llama tras mostrarlas un momento). */
    ocultarFallo() {
        if (!this.fallo) return [];
        const cartas = this.fallo.cartas;
        cartas.forEach((c) => { c.estado = 'oculta'; });
        this.fallo = null;
        this.volteadas = [];
        return cartas;
    }
}
