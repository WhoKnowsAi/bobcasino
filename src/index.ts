// TODO:
// more features - slots, roulette (maybe), stock market
// remove some console.logs
// fix mine section
// add more emojis
// add more commands
// update command handler to ignore already existing commands
// change channel points reward id(s) to environment variables
// separate command handler sections into separate files

import { config } from 'dotenv';
import * as tmi from 'tmi.js';
import { User, Command, Mine, Lottery, Stocks, addUser, addCommand, deleteCommand, editCommand, addMine, deleteMine, addLottery, addStock } from './utils/database';
import { blackjack, hit, stand, doubleDown, calculateHand } from './utils/casino';
import { Emoji } from './utils/emoji';
import * as fs from 'fs';
import * as path from 'path';

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
    if(opts.channels) {
        client.say(opts.channels[0], 'connected');
    }
});

// Connect to MongoDB
const mongoose = require('mongoose');

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/twitch');
    console.log('Connected to MongoDB');
}

// Define bot-specific variables
// init emojis
const emojis = [
    new Emoji('🫓', 'flatbread', 10),
    new Emoji('🗑️', 'trash', 100),
    new Emoji('🧅', 'onion', 200),
    new Emoji('🍳', 'egg', 399),
    new Emoji('🍩', 'donut', 1000),
    new Emoji('🍔', 'burger', 2000),
    new Emoji('🍕', 'pizza', 2000),
    new Emoji('🍨', 'icecream', 2000),
    new Emoji('🍟', 'fries', 2000),
    new Emoji('🍌', 'banana', 5000),
    new Emoji('🪃', 'boomerang', 5000),
    new Emoji('🙈', 'seenoevil', 5000),
    new Emoji('🙉', 'hearnoevil', 5000),
    new Emoji('🙊', 'speaknoevil', 5000),
    new Emoji('🦍', 'gorilla', 10000),
    new Emoji('🐸', 'frog', 10000),
    new Emoji('🦘', 'kangaroo', 10000),
    new Emoji('🐶', 'dog', 20000),
    new Emoji('🐱', 'cat', 20000),
    new Emoji('🦧', 'orangutan', 20000),
    new Emoji('🐊', 'crocodile', 20000),
    new Emoji('💰', 'moneybag', 50000),
    new Emoji('💎', 'diamond', 100000),
    new Emoji('🗿', 'moai', 200000),
    new Emoji('🏎️', 'car', 500000),
    new Emoji('🚁', 'helicopter', 1000000),
    new Emoji('🪂', 'parachute', 1000000),
    new Emoji('👑', 'crown', 10000000),
    new Emoji('🚀', 'rocket', 100000000),
    new Emoji('🛸', 'ufo', 200000000),
    new Emoji('💦', 'sweat', 500000000)


    // Add more emojis here
];

// init stocks - figure out how to only call once on bot start, has been duplicating stocks
// Define the list of stocks
async function initStocks() {
    const stocks = [
        { symbol: 'WICH', currentPrice: 150, lastPrice: 148 },
        { symbol: 'SNAX', currentPrice: 2500, lastPrice: 2498 },
        { symbol: 'COPES', currentPrice: 300, lastPrice: 298 },
        { symbol: 'WKAI', currentPrice: 3500, lastPrice: 3498 },
        { symbol: 'KLONG', currentPrice: 350, lastPrice: 348 },
        { symbol: 'POKE', currentPrice: 4000, lastPrice: 3998 },
        { symbol: 'ROR', currentPrice: 450, lastPrice: 448 },
        { symbol: 'EWGF', currentPrice: 5000, lastPrice: 4998 },
        { symbol: 'DIGI', currentPrice: 550, lastPrice: 548 },
        { symbol: 'BOB', currentPrice: 50, lastPrice: 50 },
        { symbol: 'ALLG', currentPrice: 100, lastPrice: 100 },
        { symbol: 'LJF', currentPrice: 200, lastPrice: 200 },
        { symbol: 'DORG', currentPrice: 300, lastPrice: 300}
        // Add more stocks here
    ];

    // Add stocks to the database if they don't exist already
    for (const stock of stocks) {
        const existingStock = await Stocks.findOne({ symbol: stock.symbol });
        // console.log(`findOne result for ${stock.symbol}:`, existingStock);
        if (existingStock) {
            console.log(`Stock already exists: ${stock.symbol}`);
        } else {
            console.log(`Adding stock: ${stock.symbol}`);
            await addStock(stock.symbol, stock.currentPrice, stock.lastPrice);
        }
    }
}

// Call the initStocks function to initialize the stocks
initStocks().catch(err => console.error('Error initializing stocks:', err));

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
        addUser(msgUsername.toLowerCase(), 10000, [], 0, false, false, '', 0, false, [], [], []) // add user with 10000 points
            .catch(err => console.error('Error adding user:', err));
    }

    // if lottery doesn't exist, create it
    const lottery = await Lottery.findOne();
    if (!lottery) {
        addLottery(0)
            .catch(err => console.error('Error adding lottery:', err));
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
        const username = addUserMatch[1].toLowerCase();
        const userExists = await User.findOne({ username: username });
        if (userExists) {
            client.say(channel, `User ${username} already exists`);
            console.log(`User ${username} already exists`);
        } else {
            addUser(username, 10000, [], 0, false, false, '', 0, false, [], [], [])
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
        const recipient = donateMatch[1].toLowerCase();
        const points = parseInt(donateMatch[2]);
        const user = await User.findOne({ username: msgUsername });
        const recipientUser = await User.findOne({ username: recipient });
        if (user && recipientUser) {
            if (points < 1 || points > user.points) {
                client.say(channel, 'Invalid donation amount');
                return;
            }
            if (msgUsername.toLowerCase() === recipient.toLowerCase()) {
                client.say(channel, "You can't donate points to yourself! scammer >:(");
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
            if (user.isDueling) {
                client.say(channel, `You are already in a duel with ${user.duelOpponent}`);
                return;
            }
            if (opponentUser.isDueling) {
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
        const username = setPointsMatch[1].toLowerCase();
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
    if (tags["custom-reward-id"] === "961a64c7-8d29-4910-8fbe-5ce66dc13b4c") { // change to your own channel points reward id
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            user.points += 10000;
            client.say(channel, `${msgUsername} redeemed 10k points!`);
            await user.save();
        }
    }

    //collection section
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
    const storeRegex = /^!(store|shop)$/i;
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

    // // !buy [emoji]: buy emoji
    // const buyEmojiRegex = /^!buy (\S+)$/i;
    // const buyEmojiMatch = chat.match(buyEmojiRegex);
    // if (buyEmojiMatch) {
    //     const emojiInput = buyEmojiMatch[1].toLowerCase();
    //     const emoji = emojis.find(e => e.character === emojiInput || e.alias === emojiInput);
    //     if (!emoji) {
    //         client.say(channel, 'Invalid item');
    //         return;
    //     }
    //     const user = await User.findOne({ username: msgUsername });
    //     if (!user) {
    //         client.say(channel, 'User does not exist');
    //         return;
    //     }
    //     if (user.points < emoji.price) {
    //         client.say(channel, `You need ${emoji.price - user.points} more points to buy ${emoji.character}`);
    //         return;
    //     }
    //     user.points -= emoji.price;
    //     user.emojiCollection.push(emoji.character);
    //     await user.save();
    //     client.say(channel, `${msgUsername} bought an emoji: ${emoji.character}`);
    // }

    // !buy [item] [quantity]: buy item (emoji or stock)
    const buyRegex = /^!buy (\S+)(?: (\d+))?$/i;
    const buyMatch = chat.match(buyRegex);
    if (buyMatch) {
        const itemInput = buyMatch[1].toLowerCase();
        const quantity = parseInt(buyMatch[2]) || 1; // Default to 1 if no quantity is provided

        // Check if the item is an emoji
        const emoji = emojis.find(e => e.character === itemInput || e.alias === itemInput);
        if (emoji) {
            // Handle buying an emoji
            const user = await User.findOne({ username: msgUsername });
            if (!user) {
                client.say(channel, 'User does not exist');
                return;
            }
            if (user.emojiCollection.includes(emoji.character)) {
                client.say(channel, `You already own ${emoji.character}`);
                return;
            }
            if (quantity > 1) {
                client.say(channel, 'You cannot buy more than 1 emoji');
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
        } else {
            // Assume the item is a stock symbol
            const symbol = itemInput.toUpperCase();
            // Handle buying a stock
            const user = await User.findOne({ username: msgUsername });
            const stock = await Stocks.findOne({ symbol });
            if (!user) {
                client.say(channel, 'User does not exist');
                return;
            }
            if (!stock) {
                client.say(channel, 'Invalid stock');
                return;
            }
            if (quantity < 1 || !stock.currentPrice || quantity * stock.currentPrice > user.points) {
                client.say(channel, 'Invalid quantity');
                return;
            }

            // Find the owned stock in the user's ownedStocks array
            const ownedStock = user.ownedStocks.find(stock => stock.symbol === symbol);

            if (ownedStock) {
                // If the user already owns this stock, increase the quantity
                if (ownedStock.quantity && ownedStock.purchasePrice) {
                    ownedStock.quantity += quantity;

                    // Calculate the new purchase price by averaging the old and new purchase prices
                    const oldPurchasePrice = ownedStock.purchasePrice;
                    const newPurchasePrice = stock.currentPrice;
                    const totalQuantity = ownedStock.quantity + quantity;
                    ownedStock.purchasePrice = Math.round((oldPurchasePrice * ownedStock.quantity + newPurchasePrice * quantity) / totalQuantity);
                }
            } else {
                // If the user does not own this stock, add it to the ownedStocks array
                user.ownedStocks.push({ symbol, quantity, purchasePrice: stock.currentPrice });
            }

            // Deduct the points from the user
            user.points -= quantity * stock.currentPrice;

            // Save the updated user
            await user.save();

            // Send success message with quantity bought
            client.say(channel, `${msgUsername} purchased ${quantity}x ${symbol} at ${stock.currentPrice}`);
        }
    }

    // !sell [item] [quantity]: sell item (emoji or stock)
    const sellRegex = /^!sell (\S+)(?: (\d+))?$/i;
    const sellMatch = chat.match(sellRegex);
    if (sellMatch) {
        const itemInput = sellMatch[1].toLowerCase();
        const quantity = parseInt(sellMatch[2]) || 1;

        const emoji = emojis.find(e => e.character === itemInput || e.alias === itemInput);
        if (emoji) {
            const user = await User.findOne({ username: msgUsername });
            if (!user) {
                client.say(channel, 'User does not exist');
                return;
            }
            const emojiIndex = user.emojiCollection.indexOf(emoji.character);
            if (emojiIndex === -1) {
                client.say(channel, `You do not own ${emoji.character}`);
                return;
            }
            user.points += emoji.price;
            user.emojiCollection.splice(emojiIndex, 1);
            await user.save();
            client.say(channel, `${msgUsername} parted ways with ${emoji.character}`);
        } else {
            const symbol = itemInput.toUpperCase();
            const user = await User.findOne({ username: msgUsername });
            const stock = await Stocks.findOne({ symbol });
            if (!user) {
                client.say(channel, 'User does not exist');
                return;
            }
            if (!stock) {
                client.say(channel, 'Invalid stock');
                return;
            }
            if (quantity < 1) {
                client.say(channel, 'Invalid quantity');
                return;
            }

            const ownedStock = user.ownedStocks.find(stock => stock.symbol === symbol);

            if (ownedStock) {
                if (ownedStock.quantity) {
                    ownedStock.quantity -= quantity;
                }
                if (ownedStock.quantity === 0) {
                    const stockIndex = user.ownedStocks.indexOf(ownedStock);
                    user.ownedStocks.splice(stockIndex, 1);
                }
            }

            let profit = 0;
            if (stock.currentPrice && ownedStock && ownedStock.purchasePrice) {
                profit = (stock.currentPrice - ownedStock.purchasePrice) * quantity;
            }

            if (stock.currentPrice) {
                user.points += quantity * stock.currentPrice;
            }

            await user.save();

            client.say(channel, `${msgUsername} sold ${quantity}x ${symbol} at ${stock.currentPrice} (Profit: ${profit})`);
        }
    }

    // // !sell [emoji]: sell emoji
    // const sellEmojiRegex = /^!sell (\S+)$/i;
    // const sellEmojiMatch = chat.match(sellEmojiRegex);
    // if (sellEmojiMatch) {
    //     const emojiInput = sellEmojiMatch[1].toLowerCase();
    //     const emoji = emojis.find(e => e.character === emojiInput || e.alias === emojiInput);
    //     if (!emoji) {
    //         client.say(channel, 'Invalid item');
    //         return;
    //     }
    //     const user = await User.findOne({ username: msgUsername });
    //     if (!user) {
    //         client.say(channel, 'User does not exist');
    //         return;
    //     }
    //     const emojiIndex = user.emojiCollection.indexOf(emoji.character);
    //     if (emojiIndex === -1) {
    //         client.say(channel, `You do not own ${emoji.character}`);
    //         return;
    //     }
    //     user.points += emoji.price;
    //     user.emojiCollection.splice(emojiIndex, 1);
    //     await user.save();
    //     client.say(channel, `${msgUsername} parted ways with ${emoji.character}`);
    // }

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

    // // !buystock [symbol] [quantity]: buy stock - FIX, stocks are throwing "Invalid stock"
    // const buyStockRegex = /^!buystock (\S+) (\d+)$/i;
    // const buyStockMatch = chat.match(buyStockRegex);
    // if (buyStockMatch) {
    //     const symbol = buyStockMatch[1].toUpperCase();
    //     const quantity = parseInt(buyStockMatch[2]);
    //     const user = await User.findOne({ username: msgUsername });
    //     const stock = await Stocks.findOne({ symbol });
    //     if (!user) {
    //         client.say(channel, 'User does not exist');
    //         return;
    //     }
    //     if (!stock) {
    //         client.say(channel, 'Invalid stock');
    //         return;
    //     }
    //     if (quantity < 1 || !stock.currentPrice || quantity * stock.currentPrice > user.points) {
    //         client.say(channel, 'Invalid quantity');
    //         return;
    //     }

    //     // Find the owned stock in the user's ownedStocks array
    //     const ownedStock = user.ownedStocks.find(stock => stock.symbol === symbol);

    //     if (ownedStock) {
    //         // If the user already owns this stock, increase the quantity
    //         if (ownedStock.quantity) {
    //             ownedStock.quantity += quantity;
    //         }
    //     } else {
    //         // If the user does not own this stock, add it to the ownedStocks array
    //         user.ownedStocks.push({ symbol, quantity, purchasePrice: stock.currentPrice });
    //     }

    //     // Deduct the points from the user
    //     user.points -= quantity * stock.currentPrice;

    //     // Save the updated user
    //     await user.save();

    //     // Send success message with quantity bought
    //     client.say(channel, `${msgUsername} purchased ${quantity}x ${symbol} at ${stock.currentPrice}`);
    // }

    // // !sellstock [symbol] [quantity]: sell stock
    // const sellStockRegex = /^!sellstock (\S+) (\d+)$/i;
    // const sellStockMatch = chat.match(sellStockRegex);
    // if (sellStockMatch) {
    //     const symbol = sellStockMatch[1].toUpperCase();
    //     const quantity = parseInt(sellStockMatch[2]);
    //     const user = await User.findOne({ username: msgUsername });
    //     const stock = await Stocks.findOne({ symbol });
    //     if (!user) {
    //         client.say(channel, 'User does not exist');
    //         return;
    //     }
    //     if (!stock) {
    //         client.say(channel, 'Invalid stock');
    //         return;
    //     }
    //     if (quantity < 1) {
    //         client.say(channel, 'Invalid quantity');
    //         return;
    //     }

    //     // Find the owned stock in the user's ownedStocks array
    //     const ownedStock = user.ownedStocks.find(stock => stock.symbol === symbol);

    //     if (ownedStock) {
    //         // If the user owns this stock, decrease the quantity
    //         if (ownedStock.quantity) {
    //             ownedStock.quantity -= quantity;
    //         }
    //         // If the quantity is 0, remove the stock from the ownedStocks array
    //         if (ownedStock.quantity === 0) {
    //             const stockIndex = user.ownedStocks.indexOf(ownedStock);
    //             user.ownedStocks.splice(stockIndex, 1);
    //         }
    //     }

    //     // Calculate profit
    //     let profit = 0;
    //     if (stock.currentPrice && ownedStock && ownedStock.purchasePrice) {
    //         profit = (stock.currentPrice - ownedStock.purchasePrice) * quantity;
    //     }

    //     // Add the points to the user if stock.currentPrice is not null or undefined
    //     if (stock.currentPrice) {
    //         user.points += quantity * stock.currentPrice;
    //     }

    //     // Save the updated user
    //     await user.save();

    //     // Send success message with quantity sold and profit
    //     client.say(channel, `${msgUsername} sold ${quantity}x ${symbol} at ${stock.currentPrice} (Profit: ${profit})`);
    // }

    // !portfolio: check user's stock portfolio
    const portfolioRegex = /^!(portfolio|mystocks)$/i;
    const portfolioMatch = chat.match(portfolioRegex); // declare portfolioMatch for price change prevention
    if (portfolioMatch) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            let message = `${msgUsername}'s portfolio: `;
            if (user.ownedStocks.length === 0) {
                message += "Empty";
            } else {
                for (const stock of user.ownedStocks) {
                    const stockInfo = await Stocks.findOne({ symbol: stock.symbol });
                    if (stockInfo) {
                        const percentChange = stockInfo.currentPrice && stock.purchasePrice ? ((stockInfo.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100 : 0;
                        const changeSymbol = percentChange >= 0 ? '+' : '-';
                        message += `${stock.quantity}x ${stock.symbol} (C: ${stockInfo.currentPrice || 0} | bAt: ${stock.purchasePrice} | ${changeSymbol}${Math.abs(percentChange).toFixed(2)}%)`;
                    } else {
                        message += `${stock.quantity}x ${stock.symbol}`;
                    }
                    message += ', ';
                }
                message = message.slice(0, -2); // Remove the trailing comma and space
            }
            client.say(channel, message);
        }
    }

    // !stockmarket: check stock market
    const stockMarketRegex = /^!(stockmarket|stocks)$/i;
    const stockMarketMatch = chat.match(stockMarketRegex); // declare stockMarketMatch for price change prevention
    if (chat.match(stockMarketRegex)) {
        const stocks = await Stocks.find();
        if (stocks) {
            let message = 'AZ Index: ';
            stocks.forEach((stock, index) => {
                const percentChange = stock.currentPrice && stock.lastPrice ? ((stock.currentPrice - stock.lastPrice) / stock.lastPrice) * 100 : 0;
                const changeSymbol = percentChange >= 0 ? '+' : '-';
                message += `${stock.symbol} - (${stock.currentPrice || 0} | ${changeSymbol}${Math.abs(percentChange).toFixed(2)}%)`;
                if (index !== stocks.length - 1) {
                    message += ', ';
                }
            });
            client.say(channel, message);
        }
    }

    // on message, move all stock prices up or down by up to 5 points
    const stocks = await Stocks.find();
    if (stocks && !stockMarketMatch && !buyMatch && !sellMatch && !portfolioMatch) {
        stocks.forEach(async stock => {
            const random = Math.floor(Math.random() * 2) === 0 ? -1 : 1;
            stock.lastPrice = stock.currentPrice;
            
            const newPrice = stock.currentPrice + random * Math.floor(Math.random() * 5);
            stock.currentPrice = Math.max(newPrice, 0);
            await stock.save();
        });

        // Update ticker.txt
        let tickerMessage = 'AZ Index: ';
        stocks.forEach((stock, index) => {
            const percentChange = stock.currentPrice && stock.lastPrice ? ((stock.currentPrice - stock.lastPrice) / stock.lastPrice) * 100 : 0;
            const changeSymbol = percentChange >= 0 ? '+' : '-';
            tickerMessage += `${stock.symbol} - (${stock.currentPrice || 0} | ${changeSymbol}${Math.abs(percentChange).toFixed(2)}%)`;
            if (index !== stocks.length - 1) {
                tickerMessage += ', ';
            }
        });

        // Define the directory and file paths
        const dirPath = path.join(__dirname, 'output');
        const filePath = path.join(dirPath, 'ticker.txt');

        // Write the message to a text file
        fs.writeFile(filePath, tickerMessage, err => {
            if (err) {
                console.error('Error writing to file:', err);
            } else {
                console.log('Message written to file');
            }
        });
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
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points :(`);
            } else {
                user.points += bet;
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points :)`);
            }
            await user.save();
        }
    }

    // !lottery [number]: buy a lottery ticket for 100 points, user picks a number between 1-1000, winning number wins 100000 + (number of losing tickets * 100) points
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
            user.points += 1000000 + (lottery && lottery.lotteryBonus || 0);
            client.say(channel, `Congratulations! ${msgUsername} won the lottery! The winning number was ${winningNumber}. ${msgUsername} now has ${user.points} points`);
            if (lottery) {
                lottery.lotteryBonus = 0;
                await lottery.save();
            }
        } else {
            if (lottery) {
                lottery.lotteryBonus = (lottery.lotteryBonus || 0) + 99;
                await lottery.save();
            }
            client.say(channel, `Better luck next time! The winning number was ${winningNumber}. The jackpot is now ${1000000 + (lottery && lottery.lotteryBonus || 0)} points. ${msgUsername} now has ${user.points} points`);
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
