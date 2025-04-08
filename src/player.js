export class Player {
    constructor(name, initialChips, isHuman = false) {
        this.name = name;
        this.chips = initialChips;
        this.hand = [];
        this.isActive = true;
        this.currentBet = 0;
        this.isHuman = isHuman;
        this.hasActed = false;
        this.totalBet = 0; // Track total bet across rounds
    }

    placeBet(amount) {
        if (amount > this.chips) {
            console.log(`${this.name} tried to bet ${amount} but only has ${this.chips} - going all-in`);
            amount = this.chips; // All-in
        }
        this.chips -= amount;
        this.currentBet += amount;
        this.totalBet += amount;
        this.hasActed = true;
        console.log(`${this.name} placed bet of ${amount}, current bet: ${this.currentBet}, total bet: ${this.totalBet}`);
        return amount;
    }

    postBlind(amount) {
        if (amount > this.chips) {
            console.log(`${this.name} tried to post blind of ${amount} but only has ${this.chips} - going all-in`);
            amount = this.chips; // All-in
        }
        this.chips -= amount;
        this.currentBet += amount;
        this.totalBet += amount;
        console.log(`${this.name} posted blind of ${amount}, current bet: ${this.currentBet}, total bet: ${this.totalBet}`);
        return amount;
    }

    fold() {
        console.log(`${this.name} folded`);
        this.isActive = false;
        this.hasActed = true;
    }

    resetForNewHand() {
        this.hand = [];
        this.isActive = true;
        this.currentBet = 0;
        this.hasActed = false;
        this.totalBet = 0;
        console.log(`${this.name} reset for new hand`);
    }

    resetForNewRound() {
        this.currentBet = 0;
        this.hasActed = false;
        console.log(`${this.name} reset for new betting round`);
    }

    winPot(amount) {
        this.chips += amount;
        console.log(`${this.name} won ${amount} chips`);
    }
} 