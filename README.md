# zodbot

zodbot is a Twitch bot built with Node.js and TypeScript. It uses the tmi.js library to interact with the Twitch chat and MongoDB for data persistence.

## Features

- Users earn 1 point per-message sent in an available channel

### Commands

#### Points
- !points: check how many points you have
- !leaderboard: check the top 5 users with the most points
- !donate \[username] \[points]: give an amount of points to a specified user
- !duel \[username] \[points]: offer a challenge to a specified user for a certain amount of points
- !accept: accept a duel (you cannot accept your own duel)
- !decline: decline a duel
- !setpoints \[username] \[points]: set a user's points to a certain value; MOD ONLY

#### Collection
- !buy \[emoji|emoji alias]: if you have enough points, purchase an emoji from the store
- !store: check available emojis in the store
- !collection: show off your emoji collection!

#### Casino
- !gamble \[points]: simple gamble; roll from 0-100; roll over 50 to win 2:1
- !lottery \[number between 1-1000]: pick a number between 1-1000. Each lottery ticket costs 100 points, and each losing ticket adds to the jackpot, which starts at 100,000.
- !blackjack \[points]: start a blackjack game. Users will be dealt 2 cards, while the dealer shows the first card value. Dealer stands on soft 17.
- !hit: Draw another card in blackjack.
- !double: Draw one card and stand after in blackjack. Your bet is doubled. Only works when you have enough points.
- !stand: Stick with your current hand and end the round in blackjack.

#### Text Commands
- !commands add/!addcom \[command name] \[command output]: create a new text command
- !commands edit/!editcom \[command name] \[command output]: edit an already-existing text command
- !commands delete/!delcom \[command name]: delete an existing command

## Getting Started

1. Clone the repository:

```sh
git clone https://github.com/cjenstad/zodbot-twitch.git
cd zodbot-twitch
```

2. Install the dependencies:

```sh
npm install
```

3. Copy the `.env.example` file to a new file named `.env` and fill in your Twitch credentials and MongoDB connection string.

4. Run the bot:

```sh
npm start
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[ISC](https://choosealicense.com/licenses/isc/)