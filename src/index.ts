// TODO:
// more features - slots, roulette (maybe), emoji collection
// remove some console.logs
// 


import { config } from 'dotenv';
import * as tmi from 'tmi.js';
import { User, Command, Mine, addUser, addCommand, deleteCommand, editCommand, addMine, deleteMine } from './utils/database';
import { blackjack, hit, stand, doubleDown, calculateHand } from './utils/casino';
import { Emoji } from './utils/emoji';

config();


const opts = {
    identity: {
        username: process.env.USER1 || 'chatbot',
        password: process.env.OAUTH1 || 'oauth:1234567890'
    },
    channels: process.env.CHANNELS?.split(',')
};

const client = new tmi.client(opts);

client.connect();
client.on('connected', () => {
    console.log('Connected to Twitch');
    // console.log(opts.identity.username);
});

// Connect to MongoDB
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/twitch');
    console.log('Connected to MongoDB');
}

// Define bot-specific variables
const emojis = [
    new Emoji('🗑️', 'trash', 100),
    new Emoji('🍔', 'burger', 2000),
    new Emoji('🍕', 'pizza', 2000),
    new Emoji('🍌', 'banana', 5000),
    new Emoji('🐸', 'frog', 10000),
    new Emoji('🐶', 'dog', 20000),
    new Emoji('🐱', 'cat', 20000),
    new Emoji('💰', 'moneybag', 50000),
    new Emoji('💎', 'diamond', 100000),
    new Emoji('🏎️', 'car', 500000),
    new Emoji('🚁', 'helicopter', 1000000),
    new Emoji('👑', 'crown', 10000000),
    new Emoji('🚀', 'rocket', 100000000),


    // Add more emojis here
];

let lotteryAddition = 0;

client.on('message', async (channel, tags, message, self) => {
    // const addcom = '!commands add';
    // const delcom = '!commands delete';
    if ("custom-reward-id" in tags) {
        console.log(tags["custom-reward-id"]);
    }
    const channelName = channel.replace('#', '');
    const modStatus: boolean = tags.mod || (tags.username === channelName);
    const msgUsername: string = tags.username || '';
    if (self) return;

    const user = await User.findOne({ username: msgUsername });
    if (!user) {
        addUser(msgUsername.toLowerCase(), 10000, 0, false, false, '', 0, false, [], [], []) // add user with 10000 points
            .catch(err => console.error('Error adding user:', err));
    }

    // if user exists, give them a point per message
    if (user) {
        user.points += 1;
        await user.save();
    }

    let chat = message.trim();
    while (chat.substring(chat.length - 2) === '󠀀') { // trim invisible character from 7tv (so annoying, there is probably a more efficient way to do this)
        chat = chat.substring(0, chat.length - 3);
    }
    console.log(tags.username + ': ' + chat + ' ' + tags.mod + ' ' + channelName);

    // !adduser [username]: add user - MOD ONLY
    const addUserRegex = /^!adduser (\S+)$/i;
    const addUserMatch = chat.match(addUserRegex);
    if (addUserMatch && modStatus) {
        const username = addUserMatch[1];
        const userExists = await User.findOne({ username: username });
        if (userExists) {
            client.say(channel, `User ${username} already exists`);
            console.log(`User ${username} already exists`);
        } else {
            addUser(username, 10000, 0, false, false, '', 0, false, [], [], [])
                .catch(err => console.error('Error adding user:', err));
            client.say(channel, `User ${username} added`);
            console.log(`User ${username} added`);
        }
    }

    //points section
    // !points: check points
    const pointsRegex = /^!points$/i;
    if (chat.match(pointsRegex)) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            client.say(channel, `${msgUsername} has ${user.points} points`);
        }
    }

    // !leaderboard: check leaderboard
    const leaderboardRegex = /^!leaderboard$/i;
    if (chat.match(leaderboardRegex)) {
        const users = await User.find().sort({ points: -1 }).limit(5);
        if (users) {
            for (let i = 0; i < users.length; i++) {
                const message = `${i + 1}. ${users[i].username} - ${users[i].points} points`;
                client.say(channel, message);
            }
        }
    }

    // !donate [username] [points]: donate points to another user
    const donateRegex = /^!donate (\S+) (\d+)$/i;
    const donateMatch = chat.match(donateRegex);
    if (donateMatch) {
        const recipient = donateMatch[1];
        const points = parseInt(donateMatch[2]);
        const user = await User.findOne({ username: msgUsername });
        const recipientUser = await User.findOne({ username: recipient });
        if (user && recipientUser) {
            if (points < 1 || points > user.points) {
                client.say(channel, 'Invalid donation amount');
                return;
            }
            user.points -= points;
            recipientUser.points += points;
            await user.save();
            await recipientUser.save();
            client.say(channel, `${msgUsername} donated ${points} points to ${recipient}`);
        }
    }

    // !duel [username] [points]: duel another user, winner receives points
    const duelRegex = /^!duel (\S+) (\d+)$/i;
    const duelMatch = chat.match(duelRegex);
    if (duelMatch) {
        const opponent = duelMatch[1].toLowerCase();
        const points = parseInt(duelMatch[2]);
        const user = await User.findOne({ username: msgUsername });
        const opponentUser = await User.findOne({ username: opponent });
        if (user && opponentUser) {
            if (points < 1 || points > user.points || points > opponentUser.points) {
                client.say(channel, 'Invalid duel amount');
                return;
            }
            if(user.isDueling){
                client.say(channel, `You are already in a duel with ${user.duelOpponent}`);
                return;
            }
            if(opponentUser.isDueling){
                client.say(channel, `${opponent} is already in a duel with ${opponentUser.duelOpponent}`);
                return;
            }
            user.points -= points;
            user.duelBet = points;
            opponentUser.points -= points;
            opponentUser.duelBet = points;
            user.isDueling = true;
            opponentUser.isDueling = true;
            user.duelInitiator = true;
            user.duelOpponent = opponent;
            opponentUser.duelOpponent = msgUsername;
            await user.save();
            await opponentUser.save();
            client.say(channel, `${msgUsername} has challenged ${opponent} to a duel for ${points} points! Type !accept or !decline to respond.`);
        }
    }

    // !accept: accept a duel
    const acceptRegex = /^!accept$/i;
    if (chat.match(acceptRegex)) {
        const user = await User.findOne({ username: msgUsername });
        const opponent = await User.findOne({ username: user?.duelOpponent });
        if (user && opponent && user.isDueling && opponent.isDueling && user.duelOpponent === opponent.username) {
            // check if user is the duel initiator, if so, they can't accept
            if (user.duelInitiator) {
                client.say(channel, `${msgUsername}, you can't accept a duel you initiated!`);
                return;
            }

            const random = Math.floor((Math.random() * 100) + 1);
            if (random > 50) {
                user.points += 2 * user.duelBet;
                client.say(channel, `${msgUsername} won the duel! ${msgUsername} now has ${user.points} points`);
            } else {
                opponent.points += 2 * opponent.duelBet;
                client.say(channel, `${user.duelOpponent} won the duel! ${user.duelOpponent} now has ${opponent.points} points`);
            }

            user.isDueling = false;
            opponent.isDueling = false;
            user.duelInitiator = false;
            opponent.duelInitiator = false;
            user.duelOpponent = '';
            opponent.duelOpponent = '';
            user.duelBet = 0;
            opponent.duelBet = 0;
            await user.save();
            await opponent.save();
        }
    }

    // !decline: decline a duel
    const declineRegex = /^!decline$/i;
    if (chat.match(declineRegex)) {
        const user = await User.findOne({ username: msgUsername });
        const opponent = await User.findOne({ username: user?.duelOpponent });
        if (user && opponent && user.isDueling && opponent.isDueling && user.duelOpponent === opponent.username) {
            client.say(channel, `${msgUsername} declined the duel. maybe next time :(`);
            user.isDueling = false;
            opponent.isDueling = false;
            user.duelInitiator = false;
            opponent.duelInitiator = false;
            user.duelOpponent = '';
            opponent.duelOpponent = '';
            user.points += user.duelBet;
            opponent.points += opponent.duelBet;
            user.duelBet = 0;
            opponent.duelBet = 0;
            await user.save();
            await opponent.save();
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

    // channel points redeem - 10k voucher
    if(tags["custom-reward-id"] === "961a64c7-8d29-4910-8fbe-5ce66dc13b4c") {
        const user = await User.findOne({ username: msgUsername });
        if(user){
            user.points += 10000;
            client.say(channel, `${msgUsername} redeemed 10k points!`);
            await user.save();
        }
    }

    //collection section
    // !buy [emoji]: buy emoji
    const buyEmojiRegex = /^!buy (\S+)$/i;
    const buyEmojiMatch = chat.match(buyEmojiRegex);
    if (buyEmojiMatch) {
        const emojiInput = buyEmojiMatch[1];
        const emoji = emojis.find(e => e.character === emojiInput || e.alias === emojiInput);
        if (!emoji) {
            client.say(channel, 'Invalid item');
            return;
        }
        const user = await User.findOne({ username: msgUsername });
        if (!user) {
            client.say(channel, 'User does not exist');
            return;
        }
        if (user.points < emoji.price) {
            client.say(channel, `You need ${emoji.price - user.points} more points to buy ${emoji.character}`);
            return;
        }
        user.points -= emoji.price;
        user.emojiCollection.push(emoji.character);
        await user.save();
        client.say(channel, `${msgUsername} bought an emoji: ${emoji.character}`);
    }
    // !collection: check emoji collection
    const collectionRegex = /^!collection$/i;
    if (chat.match(collectionRegex)) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            const message = user.emojiCollection.length > 0 ? `${msgUsername}'s collection: ${user.emojiCollection.join(' , ')}` : `${msgUsername} has nothing but dust in their collection :(`;
            client.say(channel, message);
        }
    }

    // !store: check available emojis in store
    const storeRegex = /^!store$/i;
    if (chat.match(storeRegex)) {
        let message = 'Available to buy: ';
        emojis.forEach((emoji, index) => {
            message += `${emoji.character} (${emoji.price})`;
            if (index !== emojis.length - 1) {
                message += ', ';
            }
        });
        client.say(channel, message);
    }


    // //!beg: beg for points - REMOVED, REPLACING WITH PER-MESSAGE POINTS
    // const begRegex = /^!beg$/i;
    // if (chat.match(begRegex)) {
    //     const user = await User.findOne({ username: msgUsername });
    //     if (user) {
    //         //random roll to get 1-5 points
    //         const random = Math.floor(Math.random() * 5) + 1;
    //         user.points += random;
    //         client.say(channel, `After a long day of begging, ${msgUsername} received ${random} points!`);
    //         await user.save();
    //     }
    // }

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
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points :(`);
            } else {
                user.points += bet;
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points :)`);
            }
            await user.save();
        }
    }

    // !lottery: buy a lottery ticket for 100 points, user picks a number between 1-1000, winning number wins 100000 + (number of losing tickets * 100) points

    const lotteryRegex = /^!lottery (\d+)$/i;
    const lotteryMatch = chat.match(lotteryRegex);
    if (lotteryMatch) {
        const user = await User.findOne({ username: msgUsername });
        const number = parseInt(lotteryMatch[1]);
        if (!user) {
            client.say(channel, 'User does not exist');
            return;
        }
        if (user.points < 100) {
            client.say(channel, 'Insufficient points to buy a lottery ticket');
            return;
        }
        if (number < 1 || number > 1000) {
            client.say(channel, 'Invalid number');
            return;
        }
        user.points -= 100;
        const winningNumber = Math.floor(Math.random() * 1000) + 1;
        // const winningNumber = 777; // for testing purposes
        if (number === winningNumber) {
            user.points += 100000 + lotteryAddition;
            client.say(channel, `Congratulations! ${msgUsername} won the lottery! The winning number was ${winningNumber}. ${msgUsername} now has ${user.points} points`);
            lotteryAddition = 0;
        } else {
            lotteryAddition += 100;
            client.say(channel, `Better luck next time! The winning number was ${winningNumber}. The jackpot is now ${100000 + lotteryAddition} points. ${msgUsername} now has ${user.points} points`);
        }
        await user.save();
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
                    updatedUser.points += bet + Math.round(bet * 1.5);
                    updatedUser.blackjackHand = [];
                    updatedUser.dealerHand = [];
                    updatedUser.blackjackBet = 0;
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
                    updatedUser.blackjackBet = 0;
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
            if (user.points < user.blackjackBet) {
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
                    updatedUser.points += updatedUser.blackjackBet * 2;
                } else if (userHandValue > dealerHandValue) {
                    client.say(channel, `You win! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.blackjackBet * 2;
                } else if (userHandValue < dealerHandValue) {
                    client.say(channel, `You lose! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                } else {
                    client.say(channel, `It's a tie! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.blackjackBet;
                }
                updatedUser.blackjackHand = [];
                updatedUser.dealerHand = [];
                updatedUser.blackjackBet = 0;
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
                    updatedUser.points += updatedUser.blackjackBet * 2;
                } else if (userHandValue > dealerHandValue) {
                    client.say(channel, `You win! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.blackjackBet * 2;
                } else if (userHandValue < dealerHandValue) {
                    client.say(channel, `You lose! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                } else {
                    client.say(channel, `It's a tie! Your final hand: ${userHandValue} (${updatedUser.blackjackHand.join(', ')}), Dealer's final hand: ${dealerHandValue} (${updatedUser.dealerHand.join(', ')})`);
                    updatedUser.points += updatedUser.blackjackBet;
                }
                updatedUser.blackjackHand = [];
                updatedUser.dealerHand = [];
                updatedUser.blackjackBet = 0;
                await updatedUser.save();
            }
        } else {
            client.say(channel, 'You are not currently playing blackjack.');
        }
    }

    // // mine section - CURRENTLY BROKEN
    // // mine points redeem handler
    // if(tags["custom-reward-id"] === "e7179d56-57d4-47c0-9bc1-53777f5afd09") {
    // addMine(chat);
    // client.say(channel, `${msgUsername} planted a mine!`);
    // } 
    
    // // message mine handler
    // try {
    //     const mineTest = await Mine.findOne({ mine: chat });
    //     if(mineTest){
    //         client.timeout(channel, msgUsername, 180, 'You hit a mine! RIP')
    //         .then((data) => {
    //             console.log(data);
    //         })
    //         .catch(error => {
    //             console.error('Error timing out user:', error);
    //             console.log('User:', msgUsername);
    //         });
    //         await deleteMine(chat);
    //     }
    // } catch (error) {
    //     console.error('Error handling mine:', error);
    // }

    // // !addmine: add mine - MOD ONLY
    // const addMineRegex = /^!addmine (\S+)$/i;
    // const addMineMatch = chat.match(addMineRegex);
    // if (addMineMatch && modStatus) {
    //     const mine = addMineMatch[1];
    //     const mineExists = await Mine.findOne({ mine });
    //     if (mineExists) {
    //         client.say(channel, `Mine ${mine} already exists`);
    //         console.log(`Mine ${mine} already exists`);
    //     } else {
    //         addMine(mine)
    //             .catch(err => console.error('Error adding mine:', err));
    //         client.say(channel, `Mine ${mine} added`);
    //         console.log(`Mine ${mine} added`);
    //     }
    // }


    // // !removemine: remove mine - MOD ONLY
    // const removeMineRegex = /^!removemine (\S+)$/i;
    // const removeMineMatch = chat.match(removeMineRegex);
    // if (removeMineMatch && modStatus) {
    //     const mine = removeMineMatch[1];
    //     const mineExists = await Mine.findOne({ mine });
    //     if (mineExists) {
    //         deleteMine(mine)
    //             .catch(err => console.error('Error deleting mine:', err));
    //         client.say(channel, `Mine ${mine} deleted`);
    //         console.log(`Mine ${mine} deleted`);
    //     } else {
    //         client.say(channel, `Mine ${mine} does not exist`);
    //     }
    // }

    // text command section
    // !commands add/!addcom: add text command - MOD ONLY
    const addCommandRegex = /^!(commands add|addcom) (\S+) (.+)$/i;
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
    const editCommandRegex = /^!(commands edit|editcom) (\S+) (.+)$/i;
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
    const deleteCommandRegex = /^!(commands delete|delcom) (\S+)/i;
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
