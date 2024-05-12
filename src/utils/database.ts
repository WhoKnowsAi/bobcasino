import mongoose from 'mongoose';

// Define the User schema
const UserSchema = new mongoose.Schema({
    username: String,
    points: { type: Number, default: 100 },
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

//Define the Mine schema
const MineSchema = new mongoose.Schema({
    mine: String,
});

// Create models from the schemas
export const User = mongoose.model('User', UserSchema);
export const Command = mongoose.model('Command', CommandSchema);
export const Mine = mongoose.model('Mine', MineSchema);

// Function to add a user
export async function addUser(username: string, points: number, blackjackBet: number, isDueling: boolean, duelInitiator: boolean, duelOpponent: string, duelBet: number, insurance: boolean, blackjackHand: string[] | null, dealerHand: string[] | null, emojiCollection: string[] | null) {
    const user = new User({ username, points, blackjackBet, isDueling, duelInitiator, duelOpponent, duelBet, insurance, blackjackHand, dealerHand, emojiCollection});
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