export class Emoji {
    character: string;
    alias: string;
    price: number;

    constructor(character: string, alias: string, price: number) {
        this.character = character;
        this.alias = alias;
        this.price = price;
    }
}