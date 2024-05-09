import mongoose from 'mongoose';

// Define the User schema
const UserSchema = new mongoose.Schema({
    username: String,
    points: { type: Number, default: 100 },
    bet: { type: Number, default: 0 },
    insurance: { type: Boolean, default: false },
    blackjackHand: { type: [String], default: [] },
    dealerHand: { type: [String], default: [] }
  });

// Define the Command schema
const CommandSchema = new mongoose.Schema({
    command: String,
    output: String
});

// Create models from the schemas
export const User = mongoose.model('User', UserSchema);
export const Command = mongoose.model('Command', CommandSchema);

// Function to add a user
export async function addUser(username: string, points: number, bet: number, insurance: boolean, blackjackHand: string[] | null, dealerHand: string[] | null) {
    const user = new User({ username, points, bet, insurance, blackjackHand, dealerHand});
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