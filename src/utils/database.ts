import mongoose from 'mongoose';

// Define the User schema
const UserSchema = new mongoose.Schema({
    username: String,
    points: { type: Number, default: 100 },
    ownedStocks: [{
        symbol: String,
        quantity: Number,
        purchasePrice: Number
      }],
    blackjackBet: { type: Number, default: 0 },
    isDueling: { type: Boolean, default: false },
    duelInitiator: { type: Boolean, default: false },
    duelOpponent: { type: String, default: '' },
    duelBet: { type: Number, default: 0 },
    insurance: { type: Boolean, default: false },
    blackjackHand: { type: [String], default: [] },
    dealerHand: { type: [String], default: [] },
    emojiCollection: { type: [String], default: []}
  });

// Define the Command schema
const CommandSchema = new mongoose.Schema({
    command: String,
    output: String
});

// Define the Mine schema
const MineSchema = new mongoose.Schema({
    mine: String,
});

// Define the Lottery schema
const LotterySchema = new mongoose.Schema({
    lotteryBonus: Number,
});

// Define the stocks schema
const StocksSchema = new mongoose.Schema({
    symbol: String,
    currentPrice: Number,
    lastPrice: Number,
});

// Create models from the schemas
export const User = mongoose.model('User', UserSchema);
export const Command = mongoose.model('Command', CommandSchema);
export const Mine = mongoose.model('Mine', MineSchema);
export const Lottery = mongoose.model('Lottery', LotterySchema);
export const Stocks = mongoose.model('Stocks', StocksSchema);

// Function to add a user
export async function addUser(username: string, points: number, ownedStocks: string[] | null, blackjackBet: number, isDueling: boolean, duelInitiator: boolean, duelOpponent: string, duelBet: number, insurance: boolean, blackjackHand: string[] | null, dealerHand: string[] | null, emojiCollection: string[] | null) {
    const user = new User({ username, points, ownedStocks, blackjackBet, isDueling, duelInitiator, duelOpponent, duelBet, insurance, blackjackHand, dealerHand, emojiCollection});
    await user.save();
}

// Function to add a command
export async function addCommand(command: string, output: string) {
    const cmd = new Command({ command, output });
    await cmd.save();
}

// Function to delete a command
export async function deleteCommand(command: string) {
    return Command.deleteOne({ command });
}

// Function to edit a command
export async function editCommand(command: string, newOutput: string) {
    return Command.updateOne({ command }, { output: newOutput });
}

// Function to add a mine
export async function addMine(mine: string) {
    const m = new Mine({ mine });
    await m.save();
}

// Function to delete a mine
export async function deleteMine(mine: string) {
    return Mine.deleteOne({ mine });
}

// Function to create Lottery
export async function addLottery(lotteryBonus: number) {
    const l = new Lottery({ lotteryBonus });
    await l.save();
}

// Function to add a stock
export async function addStock(symbol: string, currentPrice: number, lastHourlyPrice: number) {
    const s = new Stocks({ symbol, currentPrice, lastHourlyPrice });
    await s.save();
}

