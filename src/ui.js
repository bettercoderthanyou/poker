// Store player preferences and purchased items
let playerPreferences = {
    cardStyle: 'blue-diamond',
    purchasedStyles: ['blue-diamond']
};

// Check if the device is mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth <= 768;
}

export function initializeUI(game) {
    // Remove all poker tables first
    const existingTables = document.querySelectorAll('#poker-table');
    existingTables.forEach(table => table.remove());

    // Create a single clean table
    const table = document.createElement('div');
    table.id = 'poker-table';
    document.body.appendChild(table);
    
    // Add device class for additional styling
    if (isMobile()) {
        document.body.classList.add('mobile-device');
    }
    
    // Add orientation class
    updateOrientationClass();
    window.addEventListener('resize', updateOrientationClass);
    
    // Add AI action listener
    document.addEventListener('aiAction', (event) => {
        const { playerName, action } = event.detail;
        showFeedback(`${playerName} ${action}`);
    });
    
    // Add listener for when a player wins by default (everyone else folded)
    document.addEventListener('lastPlayerStanding', (event) => {
        const { playerName } = event.detail;
        showWinnerByDefault(playerName);
        updateDisplay(game);
    });
    
    // Add listener for when a new hand starts to clean up UI
    document.addEventListener('newHandStarted', () => {
        // Remove any winner displays
        const existingWinnerDisplay = document.querySelector('.winner-display');
        if (existingWinnerDisplay) {
            existingWinnerDisplay.remove();
        }
    });
    
    // Initialize store functionality
    initializeStore(game);
    
    console.log("Human player index:", game.humanPlayerIndex);
    console.log("Players:", game.players.map(p => p.name + " (isHuman: " + p.isHuman + ")"));

    // Create player areas
    game.players.forEach((player, index) => {
        const playerArea = createPlayerArea(player, index, game);
        table.appendChild(playerArea);
    });

    // Create community cards area
    const communityCards = document.createElement('div');
    communityCards.id = 'community-cards';
    table.appendChild(communityCards);
    updateCommunityCards(game.table.communityCards);

    // Create pot display
    const potDisplay = document.createElement('div');
    potDisplay.id = 'pot-display';
    potDisplay.textContent = `Pot: $${game.table.pot}`;
    table.appendChild(potDisplay);

    // Create action buttons
    const actionButtons = createActionButtons(game);
    table.appendChild(actionButtons);
    
    // Create feedback area - positioned below the table
    const feedback = document.createElement('div');
    feedback.id = 'feedback';
    feedback.style.position = 'absolute';
    feedback.style.bottom = '-40px';
    feedback.style.left = '0';
    feedback.style.width = '100%';
    feedback.style.textAlign = 'center';
    feedback.style.fontSize = '16px';
    feedback.style.fontWeight = 'bold';
    feedback.style.color = '#f1c40f';
    table.appendChild(feedback);

    // Add game state display
    const gameStateDisplay = document.createElement('div');
    gameStateDisplay.id = 'game-state';
    gameStateDisplay.style.position = 'absolute';
    gameStateDisplay.style.top = '-40px';
    gameStateDisplay.style.left = '20px';
    gameStateDisplay.style.fontWeight = 'bold';
    gameStateDisplay.style.color = 'white';
    gameStateDisplay.textContent = `Stage: ${capitalizeFirstLetter(game.gameState)}`;
    table.appendChild(gameStateDisplay);

    // Add next hand button
    const nextHandButton = document.createElement('button');
    nextHandButton.textContent = 'Next Hand';
    nextHandButton.style.position = 'absolute';
    nextHandButton.style.top = '-40px';
    nextHandButton.style.right = '20px';
    nextHandButton.id = 'next-hand-button';
    nextHandButton.onclick = () => {
        game.nextHand();
        // Remove winner display when starting a new hand
        const existingWinnerDisplay = document.querySelector('.winner-display');
        if (existingWinnerDisplay) {
            existingWinnerDisplay.remove();
        }
        updateDisplay(game);
        showFeedback('New hand started!');
        
        // Delay before running AI actions to ensure UI is updated
        setTimeout(() => {
            // Check if the first player is an AI (not the human)
            if (game.currentPlayerIndex !== game.humanPlayerIndex) {
                console.log("Starting AI actions for the new hand...");
                runAIPlayersIfNeeded(game);
            } else {
                console.log("Human player is first to act in new hand");
                updateActionButtons(game);
            }
        }, 500);
    };
    table.appendChild(nextHandButton);

    // Run AI players if it's their turn
    runAIPlayersIfNeeded(game);

    // Update all displays
    updateDisplay(game);
    
    // Show initial feedback
    if (game.currentPlayerIndex === game.humanPlayerIndex) {
        showFeedback('Your turn! Make your move.');
    } else {
        showFeedback('AI players are making their decisions...');
    }
}

function initializeStore(game) {
    const storeItems = document.querySelectorAll('.card-style');
    
    storeItems.forEach(item => {
        // Update initial selection
        if (item.dataset.style === playerPreferences.cardStyle) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
        
        // Add click handler for store items
        item.addEventListener('click', () => {
            const style = item.dataset.style;
            const price = parseInt(item.dataset.price);
            
            // If already purchased, just select it
            if (playerPreferences.purchasedStyles.includes(style)) {
                playerPreferences.cardStyle = style;
                updateCardStyleSelection();
                showFeedback(`Card style changed to ${style.replace('-', ' ').toUpperCase()}`);
                // Update all cards with the new style
                updateAllCardStyles();
                return;
            }
            
            // Otherwise try to purchase
            const humanPlayer = game.players[game.humanPlayerIndex];
            if (humanPlayer.chips >= price) {
                // Confirm purchase
                if (confirm(`Purchase ${style.replace('-', ' ').toUpperCase()} style for $${price}?`)) {
                    humanPlayer.chips -= price;
                    playerPreferences.purchasedStyles.push(style);
                    playerPreferences.cardStyle = style;
                    
                    // Update chips display
                    updateDisplay(game);
                    
                    // Update selection
                    updateCardStyleSelection();
                    
                    // Update all cards with the new style
                    updateAllCardStyles();
                    
                    showFeedback(`Purchased and applied ${style.replace('-', ' ').toUpperCase()} card style!`);
                }
            } else {
                showFeedback(`Not enough chips to purchase this card style!`);
            }
        });
    });
}

function updateCardStyleSelection() {
    const storeItems = document.querySelectorAll('.card-style');
    storeItems.forEach(item => {
        if (item.dataset.style === playerPreferences.cardStyle) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function updateAllCardStyles() {
    // Update all card back elements with the new style
    const cardBacks = document.querySelectorAll('.card-back');
    cardBacks.forEach(card => {
        // Remove all style classes
        card.classList.remove('style-blue-diamond', 'style-red-diagonal', 'style-green-circuit', 'style-gold-deluxe');
        // Add the selected style class
        card.classList.add(`style-${playerPreferences.cardStyle}`);
    });
}

function createPlayerArea(player, index, game) {
    const playerArea = document.createElement('div');
    playerArea.className = 'player-area';
    playerArea.id = `player-${index}`;

    // Add position indicators
    const positionIndicators = [];
    if (index === game.dealerIndex) {
        positionIndicators.push('D');
    }
    if (index === (game.dealerIndex + 1) % game.players.length) {
        positionIndicators.push('SB');
    }
    if (index === (game.dealerIndex + 2) % game.players.length) {
        positionIndicators.push('BB');
    }

    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'player-name';
    nameDisplay.textContent = `${player.name} ${positionIndicators.length ? '(' + positionIndicators.join(', ') + ')' : ''}`;
    if (player.isHuman) {
        nameDisplay.style.color = '#2ecc71'; // Highlight the human player with a different color
    }

    const chipsDisplay = document.createElement('div');
    chipsDisplay.className = 'player-chips';
    chipsDisplay.textContent = `Chips: $${player.chips}`;

    const betDisplay = document.createElement('div');
    betDisplay.className = 'player-bet';
    betDisplay.textContent = player.currentBet > 0 ? `Bet: $${player.currentBet}` : '';

    const cardsDisplay = document.createElement('div');
    cardsDisplay.className = 'player-cards';
    
    // Display player's cards - show only the human player's cards or in showdown
    if (player.isHuman || (game.gameState === 'showdown' && player.isActive)) {
        player.hand.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.textContent = card.toString();
            cardElement.style.color = ['♥', '♦'].includes(card.suit) ? 'red' : 'black';
            cardsDisplay.appendChild(cardElement);
        });
    } else {
        // Show card backs for non-human players
        for (let i = 0; i < 2; i++) {
            if (player.isActive) {
                const cardElement = document.createElement('div');
                cardElement.className = `card card-back style-${playerPreferences.cardStyle}`;
                cardElement.textContent = ' '; // Empty space instead of question mark
                cardsDisplay.appendChild(cardElement);
            }
        }
    }

    // Add fold indicator if player folded
    if (!player.isActive && player.hand.length > 0) {
        const foldedText = document.createElement('div');
        foldedText.textContent = 'FOLDED';
        foldedText.style.color = 'red';
        foldedText.style.fontWeight = 'bold';
        foldedText.style.marginTop = '5px';
        playerArea.appendChild(foldedText);
    }

    playerArea.appendChild(nameDisplay);
    playerArea.appendChild(chipsDisplay);
    playerArea.appendChild(betDisplay);
    playerArea.appendChild(cardsDisplay);

    // Highlight current player
    if (index === game.currentPlayerIndex) {
        playerArea.style.border = '2px solid #f1c40f';
    }

    return playerArea;
}

function updateDisplay(game) {
    // Update community cards
    updateCommunityCards(game.table.communityCards);
    
    // Update pot display
    const potDisplay = document.getElementById('pot-display');
    if (potDisplay) {
        potDisplay.textContent = `Pot: $${game.table.pot}`;
    }
    
    // Update game state display
    const gameStateDisplay = document.getElementById('game-state');
    if (gameStateDisplay) {
        gameStateDisplay.textContent = `Stage: ${capitalizeFirstLetter(game.gameState)}`;
    }
    
    // Update player displays
    game.players.forEach((player, index) => {
        // Remove existing player area and create a new one
        const oldPlayerArea = document.getElementById(`player-${index}`);
        if (oldPlayerArea) {
            const newPlayerArea = createPlayerArea(player, index, game);
            oldPlayerArea.replaceWith(newPlayerArea);
        }
    });
    
    // Update action buttons
    updateActionButtons(game);
    
    // Check if betting round is complete
    if (game.isBettingRoundComplete() && game.gameState !== 'showdown') {
        const proceedButton = document.createElement('button');
        proceedButton.textContent = 'Next Stage';
        proceedButton.style.position = 'absolute';
        proceedButton.style.bottom = '70px';
        proceedButton.style.left = '75%';
        proceedButton.style.transform = 'translateX(-50%)';
        proceedButton.onclick = () => proceedToNextStage(game);
        
        // Remove any existing proceed button
        const existingProceedButton = document.querySelector('.proceed-button');
        if (existingProceedButton) {
            existingProceedButton.remove();
        }
        
        proceedButton.className = 'proceed-button';
        document.getElementById('poker-table').appendChild(proceedButton);
        
        // Also show feedback that the round is complete
        showFeedback('Betting round complete. Click "Next Stage" to continue.');
    } else {
        // Remove proceed button if betting is not complete
        const existingProceedButton = document.querySelector('.proceed-button');
        if (existingProceedButton) {
            existingProceedButton.remove();
        }
    }
    
    // Show winners if in showdown
    if (game.gameState === 'showdown') {
        // Get the actual winners from the game
        const winners = game.evaluateHands()
            .filter(ph => ph.player.isActive)
            .reduce((bestPlayers, current) => {
                if (bestPlayers.length === 0) {
                    return [current.player];
                }
                
                const firstPlayerHandValue = game.evaluateHands()
                    .find(ph => ph.player === bestPlayers[0]).handRank.value;
                    
                if (current.handRank.value > firstPlayerHandValue) {
                    return [current.player]; // Current player has better hand
                } else if (current.handRank.value === firstPlayerHandValue) {
                    return [...bestPlayers, current.player]; // Tie
                } else {
                    return bestPlayers; // Original player has better hand
                }
            }, []);
            
        if (winners.length > 0) {
            const winnerDisplay = document.createElement('div');
            winnerDisplay.className = 'winner-display';
            
            // Position above the table instead of in the middle
            winnerDisplay.style.position = 'absolute';
            winnerDisplay.style.top = '-100px';
            winnerDisplay.style.left = '50%';
            winnerDisplay.style.transform = 'translateX(-50%) translateZ(5px)';
            winnerDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            winnerDisplay.style.padding = '15px 30px';
            winnerDisplay.style.borderRadius = '0';
            winnerDisplay.style.border = '4px solid gold';
            winnerDisplay.style.color = 'gold';
            winnerDisplay.style.fontSize = '24px';
            winnerDisplay.style.fontWeight = 'bold';
            winnerDisplay.style.textAlign = 'center';
            winnerDisplay.style.textShadow = '2px 2px 0 #000';
            winnerDisplay.style.width = 'auto';
            winnerDisplay.style.whiteSpace = 'nowrap';
            winnerDisplay.style.boxShadow = '0 4px 0 #000';
            
            const winnerNames = winners.map(w => w.name).join(', ');
            
            // Also show the winning hand type if available
            const winnerHandInfo = game.evaluateHands().find(ph => ph.player === winners[0]);
            const handType = winnerHandInfo ? winnerHandInfo.handRank.name : '';
            
            winnerDisplay.textContent = `Winner${winners.length > 1 ? 's' : ''}: ${winnerNames}${handType ? ` with ${handType}` : ''}`;
            
            // Remove any existing winner display
            const existingWinnerDisplay = document.querySelector('.winner-display');
            if (existingWinnerDisplay) {
                existingWinnerDisplay.remove();
            }
            
            document.getElementById('poker-table').appendChild(winnerDisplay);
        }
    }
}

function updateCommunityCards(cards) {
    const communityCardsElement = document.getElementById('community-cards');
    if (communityCardsElement) {
        communityCardsElement.innerHTML = '';
        cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.textContent = card.toString();
            cardElement.style.color = ['♥', '♦'].includes(card.suit) ? 'red' : 'black';
            communityCardsElement.appendChild(cardElement);
        });
    }
}

function createActionButtons(game) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'action-buttons';
    buttonContainer.id = 'action-buttons';

    const foldButton = document.createElement('button');
    foldButton.textContent = 'Fold';
    foldButton.id = 'fold-button';
    foldButton.onclick = () => handleFold(game);

    const callButton = document.createElement('button');
    callButton.textContent = 'Call';
    callButton.id = 'call-button';
    callButton.onclick = () => handleCall(game);

    const raiseButton = document.createElement('button');
    raiseButton.textContent = 'Raise';
    raiseButton.id = 'raise-button';
    raiseButton.onclick = () => handleRaise(game);

    buttonContainer.appendChild(foldButton);
    buttonContainer.appendChild(callButton);
    buttonContainer.appendChild(raiseButton);

    return buttonContainer;
}

function updateActionButtons(game) {
    // Only enable buttons if it's human player's turn
    const isHumanTurn = game.currentPlayerIndex === game.humanPlayerIndex;
    const humanActive = game.players[game.humanPlayerIndex].isActive;
    
    console.log('Updating action buttons:', {
        humanPlayerIndex: game.humanPlayerIndex,
        currentPlayerIndex: game.currentPlayerIndex,
        isHumanTurn,
        humanActive,
        gameState: game.gameState,
        dealer: `${game.players[game.dealerIndex].name} (index ${game.dealerIndex})`,
        smallBlind: `${game.players[(game.dealerIndex + 1) % game.players.length].name} (index ${(game.dealerIndex + 1) % game.players.length})`,
        bigBlind: `${game.players[(game.dealerIndex + 2) % game.players.length].name} (index ${(game.dealerIndex + 2) % game.players.length})`,
        humanHasActed: game.players[game.humanPlayerIndex].hasActed,
        currentBet: game.table.currentBet,
        humanCurrentBet: game.players[game.humanPlayerIndex].currentBet
    });
    
    // Action buttons
    const foldButton = document.querySelector('.action-buttons button:nth-child(1)');
    const callButton = document.querySelector('.action-buttons button:nth-child(2)');
    const raiseButton = document.querySelector('.action-buttons button:nth-child(3)');
    
    const shouldEnableButtons = isHumanTurn && humanActive && game.gameState !== 'showdown';
    
    // Enable or disable buttons
    foldButton.disabled = !shouldEnableButtons;
    callButton.disabled = !shouldEnableButtons;
    raiseButton.disabled = !shouldEnableButtons;
    
    // Update call button text based on the current bet
    if (isHumanTurn && humanActive) {
        const player = game.players[game.humanPlayerIndex];
        const callAmount = game.table.currentBet - player.currentBet;
        
        if (callAmount === 0) {
            callButton.textContent = 'Check';
        } else {
            callButton.textContent = `Call $${callAmount}`;
        }
        
        showFeedback(`Your turn (${capitalizeFirstLetter(game.gameState)})! Make your move.`);
    } else if (game.gameState === 'showdown') {
        showFeedback('Hand complete! Check the winner and start a new hand.');
    } else if (!humanActive) {
        showFeedback('You folded this hand. Wait for the next hand.');
    } else {
        // Show whose turn it is when it's not yours
        const currentPlayer = game.players[game.currentPlayerIndex];
        showFeedback(`Waiting for ${currentPlayer.name} to act (${capitalizeFirstLetter(game.gameState)})...`);
    }
}

function handleFold(game) {
    console.log('Fold clicked. Current player:', game.currentPlayerIndex, 'Human player:', game.humanPlayerIndex);
    if (game.currentPlayerIndex === game.humanPlayerIndex) {
        console.log('Processing fold action');
        game.players[game.currentPlayerIndex].fold();
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        updateDisplay(game);
        showFeedback('You folded. Waiting for other players...');
        runAIPlayersIfNeeded(game);
    } else {
        console.log('Cannot fold - not your turn');
        showFeedback('It\'s not your turn yet!');
    }
}

function handleCall(game) {
    console.log('Call clicked. Current player:', game.currentPlayerIndex, 'Human player:', game.humanPlayerIndex);
    if (game.currentPlayerIndex === game.humanPlayerIndex) {
        console.log('Processing call/check action');
        const player = game.players[game.currentPlayerIndex];
        const callAmount = game.table.currentBet - player.currentBet;
        
        if (callAmount > player.chips) {
            // Not enough chips to call, offer buy-in
            if (confirm(`You need $${callAmount} to call but only have $${player.chips}. Buy in for $100 more?`)) {
                player.chips += 100;
                showFeedback(`You bought in for $100. You now have $${player.chips}.`);
                updateDisplay(game);
                // Don't process the call yet, let the player try again
                return;
            } else {
                showFeedback("You don't have enough chips to call.");
                return;
            }
        }
        
        if (callAmount > 0) {
            player.placeBet(callAmount);
            game.table.addToPot(callAmount);
            showFeedback(`You called $${callAmount}.`);
        } else {
            showFeedback('You checked.');
        }
        player.hasActed = true;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        updateDisplay(game);
        runAIPlayersIfNeeded(game);
    } else {
        console.log('Cannot call - not your turn');
        showFeedback('It\'s not your turn yet!');
    }
}

function handleRaise(game) {
    console.log('Raise clicked. Current player:', game.currentPlayerIndex, 'Human player:', game.humanPlayerIndex);
    if (game.currentPlayerIndex === game.humanPlayerIndex) {
        console.log('Processing raise action');
        
        let raiseAmount;
        
        // Use a more touch-friendly input for mobile
        if (isMobile()) {
            // Create a temporary form for mobile input
            const form = document.createElement('div');
            form.style.position = 'fixed';
            form.style.top = '50%';
            form.style.left = '50%';
            form.style.transform = 'translate(-50%, -50%)';
            form.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            form.style.padding = '20px';
            form.style.borderRadius = '10px';
            form.style.zIndex = '1000';
            form.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
            form.style.textAlign = 'center';
            
            const inputLabel = document.createElement('div');
            inputLabel.textContent = 'Enter raise amount:';
            inputLabel.style.color = 'white';
            inputLabel.style.marginBottom = '10px';
            inputLabel.style.fontFamily = "'Press Start 2P', monospace";
            inputLabel.style.fontSize = '14px';
            
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.value = '20';
            input.style.width = '100%';
            input.style.padding = '10px';
            input.style.marginBottom = '15px';
            input.style.boxSizing = 'border-box';
            input.style.fontSize = '16px';
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'space-between';
            
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Confirm';
            confirmButton.style.padding = '10px 20px';
            confirmButton.style.backgroundColor = '#27ae60';
            confirmButton.style.border = 'none';
            confirmButton.style.borderRadius = '5px';
            confirmButton.style.color = 'white';
            confirmButton.style.fontWeight = 'bold';
            confirmButton.style.cursor = 'pointer';
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.padding = '10px 20px';
            cancelButton.style.backgroundColor = '#e74c3c';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.color = 'white';
            cancelButton.style.fontWeight = 'bold';
            cancelButton.style.cursor = 'pointer';
            
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(confirmButton);
            
            form.appendChild(inputLabel);
            form.appendChild(input);
            form.appendChild(buttonContainer);
            
            document.body.appendChild(form);
            
            input.focus();
            
            // Set up button actions
            confirmButton.onclick = function() {
                raiseAmount = input.value;
                document.body.removeChild(form);
                processRaise();
            };
            
            cancelButton.onclick = function() {
                document.body.removeChild(form);
            };
        } else {
            // Desktop prompt
            raiseAmount = prompt('Enter raise amount:');
            processRaise();
        }
        
        function processRaise() {
            if (raiseAmount) {
                const player = game.players[game.humanPlayerIndex];
                const totalBet = game.table.currentBet + parseInt(raiseAmount);
                const amountToAdd = totalBet - player.currentBet;
                
                console.log(`Raise details: currentBet=${game.table.currentBet}, raiseAmount=${raiseAmount}, player's currentBet=${player.currentBet}, amountToAdd=${amountToAdd}`);
                
                if (amountToAdd <= player.chips) {
                    player.placeBet(amountToAdd);
                    game.table.addToPot(amountToAdd);
                    game.table.setCurrentBet(totalBet);
                    player.hasActed = true;
                    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
                    updateDisplay(game);
                    showFeedback(`You raised by $${raiseAmount}.`);
                    runAIPlayersIfNeeded(game);
                } else {
                    // Not enough chips to raise, offer buy-in
                    if (confirm(`You need $${amountToAdd} to raise but only have $${player.chips}. Buy in for $100 more?`)) {
                        player.chips += 100;
                        showFeedback(`You bought in for $100. You now have $${player.chips}.`);
                        updateDisplay(game);
                        // Don't process the raise yet, let the player try again
                    } else {
                        showFeedback('Not enough chips for that raise!');
                    }
                }
            }
        }
    } else {
        console.log('Cannot raise - not your turn');
        showFeedback('It\'s not your turn yet!');
    }
}

// Export this function so it can be called from the main script
export function runAIPlayersIfNeeded(game) {
    console.log("Running AI players if needed. Game state:", game.gameState, "Current player:", game.currentPlayerIndex);
    
    // Don't run AI in showdown
    if (game.gameState === 'showdown') {
        console.log("Showdown - no AI moves needed");
        return;
    }
    
    // Check if betting round is already complete
    if (game.isBettingRoundComplete()) {
        console.log("Betting round already complete - waiting for user to proceed");
        showFeedback('Betting round complete. Click "Next Stage" to continue.');
        return;
    }
    
    // Run a single AI player's move, then set up the next one with a delay
    processNextAIMove(game);
}

// Process AI moves one at a time with a delay between them
function processNextAIMove(game) {
    // If it's human player's turn, stop and let them play
    if (game.currentPlayerIndex === game.humanPlayerIndex) {
        console.log("Human player's turn - stopping AI");
        updateActionButtons(game);
        return;
    }
    
    // If betting round is complete, stop and wait for next stage
    if (game.isBettingRoundComplete()) {
        console.log("Betting round complete after AI moves");
        showFeedback('Betting round complete. Click "Next Stage" to continue.');
        return;
    }
    
    // Run an AI player's turn
    console.log(`Running AI turn for player ${game.currentPlayerIndex}`);
    showFeedback(`AI player ${game.players[game.currentPlayerIndex].name} is thinking...`);
    
    // Add a delay to make AI thinking visible
    setTimeout(() => {
        const aiPlayed = game.handleAITurn();
        updateDisplay(game);
        
        // If AI successfully played, set up the next AI move with a delay
        if (aiPlayed) {
            // Delay between AI moves (1.5 seconds)
            setTimeout(() => {
                processNextAIMove(game);
            }, 1500);
        }
    }, 1000); // Initial thinking delay (1 second)
}

function showFeedback(message) {
    const feedback = document.getElementById('feedback');
    if (feedback) {
        feedback.textContent = message;
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function proceedToNextStage(game) {
    console.log("Proceeding to next stage button clicked");
    
    // Track current state before proceeding
    const oldState = game.gameState;
    
    // Proceed to next street
    game.proceedToNextStreet();
    
    // Update display
    updateDisplay(game);
    
    // Show appropriate feedback
    if (oldState === 'preflop') {
        showFeedback('Flop cards dealt! New betting round starting.');
    } else if (oldState === 'flop') {
        showFeedback('Turn card dealt! New betting round starting.');
    } else if (oldState === 'turn') {
        showFeedback('River card dealt! Final betting round starting.');
    } else if (oldState === 'river') {
        showFeedback('Showdown! Winner determined.');
    }
    
    // Force update of action buttons to make them active when it's human's turn
    setTimeout(() => {
        // Run AI players if it's not the human's turn
        if (game.currentPlayerIndex !== game.humanPlayerIndex) {
            runAIPlayersIfNeeded(game);
        } else {
            // Enable betting buttons if it's the human's turn
            updateActionButtons(game);
            showFeedback(`Your turn (${capitalizeFirstLetter(game.gameState)})! Make your move.`);
        }
    }, 100); // Short delay to ensure UI updates properly
}

function showWinnerByDefault(playerName) {
    showFeedback(`All other players folded! ${playerName} wins by default!`);
    
    // Create winner display
    const winnerDisplay = document.createElement('div');
    winnerDisplay.className = 'winner-display';
    
    // Position above the table instead of in the middle
    winnerDisplay.style.position = 'absolute';
    winnerDisplay.style.top = '-100px';
    winnerDisplay.style.left = '50%';
    winnerDisplay.style.transform = 'translateX(-50%) translateZ(5px)';
    winnerDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    winnerDisplay.style.padding = '15px 30px';
    winnerDisplay.style.borderRadius = '0';
    winnerDisplay.style.border = '4px solid gold';
    winnerDisplay.style.color = 'gold';
    winnerDisplay.style.fontSize = '24px';
    winnerDisplay.style.fontWeight = 'bold';
    winnerDisplay.style.textAlign = 'center';
    winnerDisplay.style.textShadow = '2px 2px 0 #000';
    winnerDisplay.style.width = 'auto';
    winnerDisplay.style.whiteSpace = 'nowrap';
    winnerDisplay.style.boxShadow = '0 4px 0 #000';
    
    winnerDisplay.textContent = `${playerName} WINS! Everyone else folded!`;
    
    // Remove any existing winner display
    const existingWinnerDisplay = document.querySelector('.winner-display');
    if (existingWinnerDisplay) {
        existingWinnerDisplay.remove();
    }
    
    document.getElementById('poker-table').appendChild(winnerDisplay);
}

// Update orientation class based on window dimensions
function updateOrientationClass() {
    if (window.innerHeight > window.innerWidth) {
        document.body.classList.add('portrait');
        document.body.classList.remove('landscape');
    } else {
        document.body.classList.add('landscape');
        document.body.classList.remove('portrait');
    }
} 