const express = require('express');
const router = express.Router();
const Post = require('../Models/Posts'); // Ensure this path is correct
const User = require('../Models/Users'); // Import the User model
const verifyToken = require('../Middlewares/verifyToken'); // Middleware to verify JWT and attach user info to request
const Comment = require('../Models/Comments'); // Import the Comment model
 



// DELETE route to remove a post by its ID
// I'll assume you have a middleware to protect this route, e.g., 'authMiddleware'
router.delete('/posts/:id', verifyToken, async (req, res) => {
    try {
        // Find the post by ID
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        // Check if the authenticated user is the author of the post
        // The user ID from the authentication middleware is stored in req.user.id
        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized to delete this post' });
        }

        // Remove the post from the database
        await post.remove();

        res.json({ msg: 'Post removed successfully' });

    } catch (err) {
        console.error(err.message);
        // This handles cases where the ID format is invalid
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Post not found' });
        }
        res.status(500).send('Server Error');
    }
});