import { config } from 'dotenv';
import * as tmi from 'tmi.js';
import { addUser, User, addCommand, deleteCommand, editCommand, Command } from './utils/database';
import { blackjack, hit, stand, doubleDown, calculateHand } from './utils/casino';


config();

const opts = {
    identity: {
        username: process.env.USER1 || 'zodgy',
        password: process.env.OAUTH1 || 'oauth:1234567890'
    },
    channels: process.env.CHANNELS?.split(',')
};

const client = new tmi.client(opts);

client.connect();
client.on('connected', () => {
    client.say('zodgy', 'connected');
    console.log('Connected to Twitch');
    console.log(opts.identity.username);
});

const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/twitch');
    console.log('Connected to MongoDB');
}

client.on('message', async (channel, tags, message, self) => {
    // const addcom = '!commands add';
    // const delcom = '!commands delete';
    const channelName = channel.replace('#', '');
    const modStatus: boolean = tags.mod || (tags.username === channelName);
    const msgUsername: string = tags.username || '';
    if (self) return;

    const user = await User.findOne({ username: msgUsername });
    if (!user) {
        addUser(msgUsername, 100, 0, false, [], [])
            .catch(err => console.error('Error adding user:', err));
    }

    const addCommandRegex = /^!(commands add|addcom) (\S+) (.+)$/i;
    const editCommandRegex = /^!(commands edit|editcom) (\S+) (.+)$/i;
    const deleteCommandRegex = /^!(commands delete|delcom) (\S+)/i;

    let chat = message.trim();
    while (chat.substring(chat.length - 2) === '󠀀') { // trim invisible character from 7tv (so annoying, there is probably a more efficient way to do this)
        chat = chat.substring(0, chat.length - 3);
    }
    console.log(tags.username + ': ' + chat + ' ' + tags.mod + ' ' + channelName);

    //points section
    // !points: check points
    const pointsRegex = /^!points$/i;
    if (chat.match(pointsRegex)) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            client.say(channel, `${msgUsername} has ${user.points} points`);
        }
    }

    // !setpoints [username] [points]: set points - MOD ONLY
    const setPointsRegex = /^!setpoints (\S+) (\d+)$/i;
    const setPointsMatch = chat.match(setPointsRegex);
    if (setPointsMatch && modStatus) {
        const username = setPointsMatch[1];
        const points = parseInt(setPointsMatch[2]);
        const user = await User.findOne({ username });
        if (user) {
            user.points = points;
            await user.save();
            client.say(channel, `${username} now has ${points} points`);
        } else { // user does not exist
            client.say(channel, `${username} does not exist`);
        }
    }

    // !gamble [points]: simple gamble points
    const gambleRegex = /^!gamble (\d+|all)$/i;
    const gambleMatch = chat.match(gambleRegex);
    if (gambleMatch) {
        const user = await User.findOne({ username: msgUsername });
        let bet: number;

        if (gambleMatch[1].toLowerCase() === 'all') {
            if (!user) {
                client.say(channel, 'Invalid bet');
                return;
            }
            bet = user.points;
        } else {
            bet = parseInt(gambleMatch[1]);
        }

        if (!user || bet < 1 || bet > user.points) {
            client.say(channel, 'Invalid bet');
            return;
        } else {
            const random = Math.floor(Math.random() * 100) + 1;
            if (random < 50) {
                user.points -= bet;
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points!`);
            } else {
                user.points += bet;
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points!`);
            }
            await user.save();
        }
    }

    //!beg: beg for points
    const begRegex = /^!beg$/i;
    if (chat.match(begRegex)) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            //random roll to get 1-5 points
            const random = Math.floor(Math.random() * 5) + 1;
            user.points += random;
            client.say(channel, `After a long day of begging, ${msgUsername} received ${random} points!`);
            await user.save();
        }
    }

    //blackjack section
    const blackjackRegex = /^!blackjack (\d+|all)$/i;
    const hitRegex = /^!hit$/i;
    const standRegex = /^!stand$/i;
    const doubleDownRegex = /^!double$/i;

    // !blackjack [bet]: start a blackjack game with a bet
    const blackjackMatch = chat.match(blackjackRegex);
    if (blackjackMatch) {
        const user = await User.findOne({ username: msgUsername });
        let bet: number;

        if (blackjackMatch[1].toLowerCase() === 'all') {
            if (!user) {
                client.say(channel, 'Invalid bet');
                return;
            }
            bet = user.points;
        } else {
            bet = parseInt(blackjackMatch[1]);
        }

        if (user && user.blackjackHand.length > 0) {
            client.say(channel, `You are already playing blackjack! Your hand: ${calculateHand(user.blackjackHand)} (${user.blackjackHand.join(', ')}) Dealer shows: ${calculateHand(user.dealerHand)} (${user.dealerHand[0]}). Type !hit to draw another card, !double to double down (if you can afford it), or !stand to stick with your cards.`);
            return;
        }

        if (!user || bet < 1 || bet > user.points) {
            client.say(channel, 'Invalid bet');
            return;
        } else {
            await blackjack(msgUsername, bet)
                .catch(err => console.error('Error playing blackjack:', err));
            const updatedUser = await User.findOne({ username: msgUsername });
            if (updatedUser && updatedUser.blackjackHand) {
                const userHandValue = calculateHand(updatedUser.blackjackHand);
                const dealerHandValue = calculateHand(updatedUser.dealerHand);
                if (userHandValue === 21 && dealerHandValue !== 21) {
                    client.say(channel, `Blackjack! You win 1.5 times your bet! Your hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += Math.round(bet * 1.5);
                    updatedUser.blackjackHand = [];
                    updatedUser.dealerHand = [];
                    updatedUser.bet = 0;
                    await updatedUser.save();
                    // await stand(msgUsername);
                } else if (userHandValue === 21 && dealerHandValue === 21) {
                    client.say(channel, `Push! Both you and the dealer got blackjack. Your bet is returned. Your hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    await stand(msgUsername);
                } else {
                    client.say(channel, `Dealing cards! Your hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer shows: ${calculateHand(updatedUser.dealerHand)} (${updatedUser.dealerHand[0]}). Type !hit to draw another card, !double to double down (if you can afford it), or !stand to stick with your cards.`);
                }
                console.log(`User ${msgUsername} started a blackjack game with a bet of ${bet}`);
                await updatedUser.save();
            }
        }
    }

    // !hit: draw another card in blackjack
    const hitMatch = chat.match(hitRegex);
    if (hitMatch) {
        const user = await User.findOne({ username: msgUsername });
        if (user && user.blackjackHand && user.blackjackHand.length > 0) {
            await hit(msgUsername)
                .catch(err => console.error('Error hitting:', err));
            const updatedUser = await User.findOne({ username: msgUsername });
            if (updatedUser && updatedUser.blackjackHand) {
                const handValue = calculateHand(updatedUser.blackjackHand);
                if (handValue > 21) {
                    client.say(channel, `Bust! Your hand value is ${handValue} (${updatedUser.blackjackHand.join(', ')}).`);
                    // Handle bust logic here
                    updatedUser.blackjackHand = [];
                    updatedUser.dealerHand = [];
                    updatedUser.bet = 0;
                    await updatedUser.save();
                } else {
                    client.say(channel, `Your new hand: ${handValue} (${updatedUser.blackjackHand.join(', ')})`);
                }
            }
        } else {
            client.say(channel, 'You are not currently playing blackjack.');
        }
    }

    // !double: double down in blackjack
    const doubleDownMatch = chat.match(doubleDownRegex);
    if (doubleDownMatch) {
        const user = await User.findOne({ username: msgUsername });
        if (user && user.blackjackHand && user.blackjackHand.length > 0) {
            if (user.points < user.bet) {
                client.say(channel, 'Insufficient points to double down');
                return;
            }
            const doubleDownResult = await doubleDown(msgUsername).catch(err => console.error('Error doubling down:', err));
            const { userHandValue, dealerHandValue } = doubleDownResult as { userHandValue: number; dealerHandValue: number; };
            const updatedUser = await User.findOne({ username: msgUsername });
            if (updatedUser) {
                if (userHandValue > 21) {
                    client.say(channel, `Bust! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')})`);
                } else if (dealerHandValue > 21) {
                    client.say(channel, `Dealer busts! You win! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.bet * 2;
                } else if (userHandValue > dealerHandValue) {
                    client.say(channel, `You win! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.bet * 2;
                } else if (userHandValue < dealerHandValue) {
                    client.say(channel, `You lose! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                } else {
                    client.say(channel, `It's a tie! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.bet;
                }
                updatedUser.blackjackHand = [];
                updatedUser.dealerHand = [];
                updatedUser.bet = 0;
                await updatedUser.save();
            }
        } else {
            client.say(channel, 'You are not currently playing blackjack.');
        }
    }


    // !stand: stand in blackjack
    const standMatch = chat.match(standRegex);
    if (standMatch) {
        const user = await User.findOne({ username: msgUsername });
        if (user && user.blackjackHand && user.blackjackHand.length > 0) {
            const standResult = await stand(msgUsername).catch(err => console.error('Error standing:', err));
            const { userHandValue, dealerHandValue } = standResult as { userHandValue: number; dealerHandValue: number; };
            const updatedUser = await User.findOne({ username: msgUsername });
            if (updatedUser) {
                if (dealerHandValue > 21) {
                    client.say(channel, `Dealer busts! You win! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.bet * 2;
                } else if (userHandValue > dealerHandValue) {
                    client.say(channel, `You win! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.bet * 2;
                } else if (userHandValue < dealerHandValue) {
                    client.say(channel, `You lose! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                } else {
                    client.say(channel, `It's a tie! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.bet;
                }
                updatedUser.blackjackHand = [];
                updatedUser.dealerHand = [];
                updatedUser.bet = 0;
                await updatedUser.save();
            }
        } else {
            client.say(channel, 'You are not currently playing blackjack.');
        }
    }

    // text command section
    // !commands add/!addcom: add text command - MOD ONLY
    const addCommandMatch = chat.match(addCommandRegex);
    if (addCommandMatch && modStatus) {
        const commandName = addCommandMatch[2];
        const commandOutput = addCommandMatch[3];
        const command = await Command.findOne({ command: commandName });
        if (command) {
            client.say(channel, `Command ${commandName} already exists`);
            console.log(`Command ${commandName} already exists`);
        } else {
            addCommand(commandName, commandOutput)
                .catch(err => console.error('Error adding command:', err));
            client.say(channel, `Command ${commandName} added`);
            console.log(`Command ${commandName} added`);
        }
    }

    // !commands edit/!editcom: edit text command - MOD ONLY
    const editCommandMatch = chat.match(editCommandRegex);
    if (editCommandMatch && modStatus) {

        const commandName = editCommandMatch[2];
        const newOutput = editCommandMatch[3];

        const command = await Command.findOne({ command: commandName });
        if (command) {
            editCommand(commandName, newOutput)
                .catch(err => console.error('Error editing command:', err));
            client.say(channel, `Command ${commandName} edited`);
            console.log(`Command ${commandName} edited`);
        } else {
            client.say(channel, `Command ${commandName} does not exist`);
        }
    }

    // !commands delete/!delcom: delete text command - MOD ONLY
    const deleteCommandMatch = chat.match(deleteCommandRegex);
    if (deleteCommandMatch && modStatus) {

        const commandName = deleteCommandMatch[2];

        const command = await Command.findOne({ command: commandName });
        if (command) {
            deleteCommand(commandName)
                .catch(err => console.error('Error deleting command:', err));
            client.say(channel, `Command ${commandName} deleted`);
            console.log(`Command ${commandName} deleted`);
        } else {
            client.say(channel, `Command ${commandName} does not exist`);
        }
    }



    // text command handler
    if (!chat.startsWith('!commands')) {
        const command = await Command.findOne({ command: chat });
        if (command) {
            const output = command.output || ''; // Fix: Assign an empty string if command.output is undefined or null
            client.say(channel, output);
            console.log(`Command ${chat} executed`);
        }
    }
});
