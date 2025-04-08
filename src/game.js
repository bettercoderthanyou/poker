import { Deck } from './deck.js';
import { Player } from './player.js';
import { Table } from './table.js';
import { evaluateHand } from './hand.js';

export class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [];
        this.table = new Table();
        this.currentPlayerIndex = 0;
        this.dealerIndex = 0;
        this.gameState = 'waiting'; // waiting, preflop, flop, turn, river, showdown
        this.humanPlayerIndex = 0; // Player 1 is the human player
        this.bettingRoundComplete = false;
    }

    addPlayer(name, chips, isHuman = false) {
        const player = new Player(name, chips, isHuman);
        this.players.push(player);
        if (isHuman) {
            this.humanPlayerIndex = this.players.length - 1;
        }
        return player;
    }

    startNewHand() {
        this.deck = new Deck();
        this.deck.shuffle();
        this.table.reset();
        this.gameState = 'preflop';
        this.bettingRoundComplete = false;
        
        // Reset all players for new hand
        this.players.forEach(player => {
            player.resetForNewHand();
        });

        // Clear any winner displays from previous hand
        document.dispatchEvent(new CustomEvent('newHandStarted'));

        // Post blinds
        if (this.players.length >= 2) {
            const smallBlindIndex = (this.dealerIndex + 1) % this.players.length;
            const bigBlindIndex = (this.dealerIndex + 2) % this.players.length;
            
            // Small blind - use postBlind instead of placeBet
            const smallBlindAmount = this.table.smallBlind;
            this.players[smallBlindIndex].postBlind(smallBlindAmount);
            this.table.addToPot(smallBlindAmount);
            
            // Big blind - use postBlind instead of placeBet
            const bigBlindAmount = this.table.bigBlind;
            this.players[bigBlindIndex].postBlind(bigBlindAmount);
            this.table.addToPot(bigBlindAmount);
            
            // Set current player to UTG (Under the Gun) - first to act
            this.currentPlayerIndex = (bigBlindIndex + 1) % this.players.length;
            this.table.setCurrentBet(bigBlindAmount);
            
            console.log(`Blinds posted: SB ${this.players[smallBlindIndex].name}, BB ${this.players[bigBlindIndex].name}`);
            console.log(`First to act (UTG): ${this.players[this.currentPlayerIndex].name}`);
        }
        
        // Deal cards to players
        this.players.forEach(player => {
            player.hand = [this.deck.drawCard(), this.deck.drawCard()];
        });
        
        console.log("New hand started, gameState:", this.gameState);
    }

    dealFlop() {
        if (this.gameState === 'preflop') {
            this.table.addCommunityCards(this.deck.drawCard(), this.deck.drawCard(), this.deck.drawCard());
            this.gameState = 'flop';
            this.resetBettingRound();
            console.log("Flop dealt, gameState:", this.gameState);
        }
    }

    dealTurn() {
        if (this.gameState === 'flop') {
            this.table.addCommunityCard(this.deck.drawCard());
            this.gameState = 'turn';
            this.resetBettingRound();
            console.log("Turn dealt, gameState:", this.gameState);
        }
    }

    dealRiver() {
        if (this.gameState === 'turn') {
            this.table.addCommunityCard(this.deck.drawCard());
            this.gameState = 'river';
            this.resetBettingRound();
            console.log("River dealt, gameState:", this.gameState);
        }
    }

    resetBettingRound() {
        console.log("Resetting betting round");
        // Reset current bets for all players
        this.players.forEach(player => {
            player.resetForNewRound();
        });
        
        // Start betting from first active player after dealer
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        
        // Skip inactive players
        let loopCounter = 0;
        while (loopCounter < this.players.length && !this.players[this.currentPlayerIndex].isActive) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            loopCounter++;
        }
        
        this.table.setCurrentBet(0);
        this.bettingRoundComplete = false;
        
        console.log("Betting round reset, starting player:", this.players[this.currentPlayerIndex].name);
    }

    evaluateHands() {
        return this.players.map(player => ({
            player,
            handRank: evaluateHand([...player.hand, ...this.table.communityCards])
        }));
    }
    
    determineWinners() {
        const activePlayerHandRanks = this.evaluateHands()
            .filter(ph => ph.player.isActive);
        
        if (activePlayerHandRanks.length === 0) return [];
        
        // Find the highest rank value (numeric comparison)
        const bestRankValue = activePlayerHandRanks.reduce((best, current) => {
            return current.handRank.value > best ? current.handRank.value : best;
        }, activePlayerHandRanks[0].handRank.value);
        
        // Return all players with the best hand
        const winners = activePlayerHandRanks
            .filter(ph => ph.handRank.value === bestRankValue)
            .map(ph => ph.player);
        
        console.log("Hand results:", activePlayerHandRanks.map(ph => 
            `${ph.player.name}: ${ph.handRank.name} (value: ${ph.handRank.value})`));
        console.log("Winners:", winners.map(w => w.name));
            
        // Award pot to winners
        const potPerWinner = Math.floor(this.table.pot / winners.length);
        winners.forEach(winner => {
            winner.winPot(potPerWinner);
        });
        
        this.table.clearPot();
        return winners;
    }

    nextHand() {
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        this.startNewHand();
    }
    
    handleAITurn() {
        const player = this.players[this.currentPlayerIndex];
        
        // Skip if this is the human player
        if (player.isHuman) {
            console.log("This is the human player's turn - skipping AI logic");
            return false;
        }
        
        console.log("AI player's turn:", player.name);
        
        // Simple AI logic
        const callAmount = this.table.currentBet - player.currentBet;
        const randomChoice = Math.random();
        let aiAction = "";
        
        if (callAmount === 0) {
            // Check or small bet if no current bet
            if (randomChoice < 0.7) {
                // Check
                console.log("AI decided to check");
                player.hasActed = true;
                aiAction = "checks";
            } else {
                // Bet
                const betAmount = Math.floor(Math.random() * 3 + 1) * this.table.bigBlind;
                if (betAmount <= player.chips) {
                    console.log(`AI decided to bet ${betAmount}`);
                    player.placeBet(betAmount);
                    this.table.addToPot(betAmount);
                    this.table.setCurrentBet(betAmount);
                    aiAction = `bets $${betAmount}`;
                } else {
                    console.log("AI would bet but doesn't have enough chips - checking instead");
                    player.hasActed = true;
                    aiAction = "checks (not enough chips to bet)";
                }
            }
        } else {
            // Facing a bet
            if (randomChoice < 0.4) {
                // Fold
                console.log("AI decided to fold");
                player.fold();
                aiAction = "folds";
            } else if (randomChoice < 0.8) {
                // Call
                if (callAmount <= player.chips) {
                    console.log(`AI decided to call ${callAmount}`);
                    player.placeBet(callAmount);
                    this.table.addToPot(callAmount);
                    aiAction = `calls $${callAmount}`;
                } else {
                    console.log("AI would call but doesn't have enough chips - folding instead");
                    player.fold();
                    aiAction = "folds (not enough chips to call)";
                }
            } else {
                // Raise
                const raiseAmount = callAmount + Math.floor(Math.random() * 2 + 1) * this.table.bigBlind;
                if (raiseAmount <= player.chips) {
                    console.log(`AI decided to raise by ${raiseAmount - callAmount}`);
                    player.placeBet(raiseAmount);
                    this.table.addToPot(raiseAmount);
                    this.table.setCurrentBet(player.currentBet);
                    aiAction = `raises to $${player.currentBet}`;
                } else if (callAmount <= player.chips) {
                    console.log("AI would raise but doesn't have enough chips - calling instead");
                    player.placeBet(callAmount);
                    this.table.addToPot(callAmount);
                    aiAction = `calls $${callAmount} (not enough chips to raise)`;
                } else {
                    console.log("AI doesn't have enough chips for call or raise - folding");
                    player.fold();
                    aiAction = "folds (not enough chips)";
                }
            }
        }
        
        // Trigger UI update with AI action
        document.dispatchEvent(new CustomEvent('aiAction', { 
            detail: { playerName: player.name, action: aiAction }
        }));
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        return true;
    }
    
    proceedToNextStreet() {
        console.log("Proceeding to next street from", this.gameState);
        
        if (this.gameState === 'preflop') {
            this.dealFlop();
            // Make sure betting round is not considered complete
            this.bettingRoundComplete = false;
        } else if (this.gameState === 'flop') {
            this.dealTurn();
            // Make sure betting round is not considered complete
            this.bettingRoundComplete = false;
        } else if (this.gameState === 'turn') {
            this.dealRiver();
            // Make sure betting round is not considered complete
            this.bettingRoundComplete = false;
        } else if (this.gameState === 'river') {
            this.gameState = 'showdown';
            this.determineWinners();
            console.log("Showdown reached");
        }
        
        // Make sure we have the proper starting player for the new betting round
        // Start with player after dealer
        if (this.gameState !== 'showdown') {
            this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
            
            // Skip inactive players
            let loopCounter = 0;
            while (loopCounter < this.players.length && !this.players[this.currentPlayerIndex].isActive) {
                this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
                loopCounter++;
            }
            
            // Log who will go first
            console.log(`New betting round starting with player ${this.currentPlayerIndex}`);
        }
    }
    
    // Check if betting round is complete (all active players have equalized bets)
    isBettingRoundComplete() {
        // Quick exit for showdown
        if (this.gameState === 'showdown') return true;
        
        // Use cached result if available
        if (this.bettingRoundComplete) return true;
        
        // Check if only one player remains active
        const activePlayers = this.players.filter(player => player.isActive);
        if (activePlayers.length <= 1) {
            this.bettingRoundComplete = true;
            
            // If there's exactly one player left, they win by default
            if (activePlayers.length === 1) {
                console.log(`${activePlayers[0].name} wins by default - everyone else folded`);
                
                // End the hand and award pot to the last player standing
                activePlayers[0].winPot(this.table.pot);
                this.table.clearPot();
                this.gameState = 'showdown';
                
                // Dispatch an event to notify the UI
                document.dispatchEvent(new CustomEvent('lastPlayerStanding', { 
                    detail: { playerName: activePlayers[0].name }
                }));
            }
            
            return true;
        }
        
        // Special handling for preflop - make sure big blind gets to act
        if (this.gameState === 'preflop') {
            // Identify big blind position
            const bigBlindIndex = (this.dealerIndex + 2) % this.players.length;
            const bigBlindPlayer = this.players[bigBlindIndex];
            
            // If big blind is active but hasn't acted yet, betting round isn't complete
            // unless everyone has called/folded and it's back to the big blind
            if (bigBlindPlayer.isActive && !bigBlindPlayer.hasActed) {
                // Check if we've gone around the table and returned to the big blind
                const lastPlayerIndex = (this.currentPlayerIndex === 0) 
                    ? this.players.length - 1 
                    : this.currentPlayerIndex - 1;
                
                if (lastPlayerIndex !== bigBlindIndex) {
                    console.log("Preflop betting round not complete - big blind hasn't acted yet");
                    return false;
                }
            }
        }
        
        // Check if all active players have acted at least once
        const allPlayersHaveActed = activePlayers.every(player => player.hasActed);
        
        // Check if all bets are equal
        const betsEqualized = activePlayers.every(player => player.currentBet === this.table.currentBet);
        
        // Round is complete only when all have acted AND bets are equalized
        this.bettingRoundComplete = allPlayersHaveActed && betsEqualized;
        
        if (this.bettingRoundComplete) {
            console.log("Betting round is complete. All players acted:", allPlayersHaveActed, 
                "Bets equalized:", betsEqualized, 
                "Current bets:", activePlayers.map(p => `${p.name}: ${p.currentBet}`));
        }
        
        return this.bettingRoundComplete;
    }

    buyBackIn(amount = 100) {
        if (this.humanPlayerIndex !== -1) {
            const player = this.players[this.humanPlayerIndex];
            player.chips += amount;
            console.log(`Human player bought in for $${amount}, now has $${player.chips}`);
            return true;
        }
        return false;
    }
} 