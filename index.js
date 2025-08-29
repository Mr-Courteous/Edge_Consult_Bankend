// Load environment variables
require('dotenv').config();
require('./babel-register'); // Enable Babel
const React = require('react');
const ReactDOMServer = require('react-dom/server');



// Core Express and database connection
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./Dbconnection');

// Import your routes
const PostRoutes = require('./Routes/PostsRoutes'); // API routes
const GetRoutes = require('./Routes/GetRoutes');     // Other API routes

// Initialize Express app
const app = express();

// --- Global Middleware ---
app.use(cors()); // Allow requests from all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.static('dist'));


// --- Database Connection ---
connectDB();

// --- View Engine for SSR ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Place your EJS templates here

// --- Serve Static Files from Vite Build ---
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- API Routes ---
app.use( PostRoutes); // Prefix API routes with /api/posts
app.use( GetRoutes);        // Other API routes

// --- SSR Route for Individual Posts ---
// This assumes you have a posts EJS template at /server/views/post.ejs
app.get('/posts/:id', async (req, res) => {
    try {
        const Post = require('./Models/Posts'); // Your Mongoose model
        const postId = req.params.id;
        const post = await Post.findById(postId).populate('author', 'name email');

        if (!post) return res.status(404).send('Post not found');

        const meta = {
            title: post.title,
            description: post.body.substring(0, 160),
            image: post.image_path || '/default.jpg',
            likes: post.likeCount,
            author: post.author.name,
            url: `${req.protocol}://${req.get('host')}/posts/${post._id}`,
        };

        res.render('post', { meta });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// --- Root Route ---
app.get('/', (req, res) => {
    res.send('Hello from your Express server!');
});

// --- Example Query Route ---
app.get('/api/greet', (req, res) => {
    const name = req.query.name || 'Guest';
    res.status(200).json({ message: `Greetings, ${name}!` });
});

// --- Start Server ---
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
