import { User } from './database';

//blackjack functions
// Define a deck of cards
const deck = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].flatMap(card => Array(4).fill(card));

// Function to draw a card from the deck
function drawCard() {
    const randomIndex = Math.floor(Math.random() * deck.length);
    return deck.splice(randomIndex, 1)[0];
}

// Function to calculate the value of a hand
export function calculateHand(hand: string[]) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card === 'A') {
            value += 11;
            aces += 1;
        } else if (['K', 'Q', 'J'].includes(card)) {
            value += 10;
        } else {
            value += Number(card);
        }
    }

    // Adjust the value if there's a single ace and the total value exceeds 21
    if (aces >= 1 && value > 21 && hand.includes('A')) {
        value -= 10 * aces;
    }

    return value;
}

export async function blackjack(username: string, bet: number) {
    console.log('blackjack function called');
    const user = await User.findOne({ username });

    // Check if user exists, if user.points is defined and is enough for the bet, and if user.blackjackHand is not null
    if (user && user.points && user.points >= bet) {
        console.log('user exists and has enough points');
        user.points -= bet;
        user.bet = bet;
        user.blackjackHand = [drawCard(), drawCard()];
        user.dealerHand = [drawCard()]; // Initialize dealerHand
        await user.save();
        console.log(`User's new points: ${user.points}`);
    } else {
        console.log('user does not exist or does not have enough points');
    }
}

export async function hit(username: string) {
    const user = await User.findOne({ username });

    if (user && user.blackjackHand.length > 0) {
        user.blackjackHand.push(drawCard());
        await user.save();
    }
}

export async function stand(username: string) {
    const user = await User.findOne({ username });
    let userHandValue = 0;
    let dealerHandValue = 0;
    if (user && user.blackjackHand.length > 0) {
        let dealerValue = calculateHand(user.dealerHand);
        while (dealerValue < 17) {
            user.dealerHand.push(drawCard());
            dealerValue = calculateHand(user.dealerHand);
        }
        userHandValue = calculateHand(user.blackjackHand);
        dealerHandValue = dealerValue;

        await user.save();
    }
    return { userHandValue, dealerHandValue };
}

export async function doubleDown(username: string) {
    const user = await User.findOne({ username });
    let userHandValue = 0;
    let dealerHandValue = 0;
    if (user && user.blackjackHand.length > 0) {
        user.blackjackHand.push(drawCard());
        let dealerValue = calculateHand(user.dealerHand);
        while (dealerValue < 17) {
            user.dealerHand.push(drawCard());
            dealerValue = calculateHand(user.dealerHand);
        }
        userHandValue = calculateHand(user.blackjackHand);
        dealerHandValue = dealerValue;
        
    }
    if (user && user.blackjackHand.length > 0 && user.points >= user.bet) {
        user.points -= user.bet;
        user.bet *= 2;
        await user.save();
    }
    return { userHandValue, dealerHandValue };
}

export async function insurance(username: string) {
    const user = await User.findOne({ username });

    if (user && user.blackjackHand.length > 0 && user.points >= user.bet / 2) {
        user.points -= user.bet / 2;
        user.insurance = true;
        await user.save();
    }
}