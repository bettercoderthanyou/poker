export class Table {
    constructor() {
        this.reset();
    }

    reset() {
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.smallBlind = 10;
        this.bigBlind = 20;
    }

    addCommunityCard(card) {
        if (this.communityCards.length >= 5) {
            throw new Error('Cannot add more than 5 community cards');
        }
        this.communityCards.push(card);
    }

    addCommunityCards(card1, card2, card3) {
        this.addCommunityCard(card1);
        this.addCommunityCard(card2);
        this.addCommunityCard(card3);
    }

    addToPot(amount) {
        this.pot += amount;
    }

    clearPot() {
        const amount = this.pot;
        this.pot = 0;
        return amount;
    }

    setCurrentBet(amount) {
        this.currentBet = amount;
    }
} 