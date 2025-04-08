export function evaluateHand(cards) {
    // Basic hand evaluation with numeric rankings (higher is better)
    const ranks = cards.map(card => card.rank);
    const suits = cards.map(card => card.suit);
    
    // Check for flush
    const isFlush = suits.every(suit => suit === suits[0]);
    
    // Check for straight
    const rankValues = ranks.map(rank => {
        const values = {'J': 11, 'Q': 12, 'K': 13, 'A': 14};
        return values[rank] || parseInt(rank);
    }).sort((a, b) => a - b);
    
    const isStraight = rankValues.every((val, i) => 
        i === 0 || val === rankValues[i-1] + 1
    );
    
    // Count rank frequencies
    const rankCounts = {};
    ranks.forEach(rank => {
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    // Determine hand type with numeric value and name
    // Hand types from strongest to weakest:
    // 9: Straight Flush, 8: Four of a Kind, 7: Full House, 6: Flush, 5: Straight
    // 4: Three of a Kind, 3: Two Pair, 2: One Pair, 1: High Card
    
    if (isFlush && isStraight) return { value: 9, name: 'Straight Flush' };
    if (Object.values(rankCounts).includes(4)) return { value: 8, name: 'Four of a Kind' };
    if (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2)) return { value: 7, name: 'Full House' };
    if (isFlush) return { value: 6, name: 'Flush' };
    if (isStraight) return { value: 5, name: 'Straight' };
    if (Object.values(rankCounts).includes(3)) return { value: 4, name: 'Three of a Kind' };
    if (Object.values(rankCounts).filter(count => count === 2).length === 2) return { value: 3, name: 'Two Pair' };
    if (Object.values(rankCounts).includes(2)) return { value: 2, name: 'One Pair' };
    return { value: 1, name: 'High Card' };
} 