import express, { Request, Response } from 'express';
import path from 'path';
import { User } from './utils/database';
import hbs from 'hbs';
import mongoose from 'mongoose';

mongoose.connect('mongodb://127.0.0.1:27017/twitch')
  .then(() => console.log('Database connected'))
  .catch(err => console.log('Database connection error: ', err));

const app = express();
const itemsPerPage = 100;

// Set up the Handlebars engine with custom options
app.set('view engine', 'hbs');
app.engine('hbs', hbs.__express);

// Serve static files from a directory within your project
app.use('/bootstrap-css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));

app.get('/leaderboard', async (req: Request, res: Response) => {
    const page = req.query.page? parseInt(req.query.page as string) : 1;
    const skip = (page - 1) * itemsPerPage;

    // Fetch users from the database and sort them by points
    const users = await User.find().sort({ points: -1 }).skip(skip).limit(itemsPerPage);

    // Render the leaderboard view with the users data
    res.render('leaderboard', { users, page });
});

app.get('/', (req, res) => {
    res.redirect('/leaderboard');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

hbs.registerHelper('addOne', function(value) {
    return value + 1;
  });