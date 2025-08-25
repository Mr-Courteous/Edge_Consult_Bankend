const express = require('express');
const router = express.Router();
const Post = require('../Models/Posts'); // Import the Post model
const User = require('../Models/Users'); // Import the User model
const bcrypt = require('bcryptjs'); // For password hashing
const mongoose = require('mongoose'); // For ObjectId validation
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const multer = require('multer'); // Import multer
require('dotenv').config(); // Load environment variables from .env file

// Helper function to generate a slug from a title
// At the top of your file, import the `put` function and `multer`
const { put } = require('@vercel/blob');

// --- NEW Multer Configuration ---
// Use memory storage instead of disk storage.
// This stores the file in a buffer in memory before you process it.
const storage = multer.memoryStorage();

// Init upload middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
        // Check file type to ensure only images are uploaded
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(file.originalname.toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only (JPEG, JPG, PNG, GIF)!');
        }
    }
}).single('image'); // 'image' is the name of the form field that will contain the file

// --- Your Route to add new posts ---
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
};

// ... (Other imports like express, mongoose, etc.)

router.post('/add-posts', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        // 1. Destructure required fields from the request body
        const { title, body, category, author, tags } = req.body;

        // 2. Basic validation
        if (!title || !body || !category || !author) {
            return res.status(400).json({ message: 'Please enter all required fields: title, body, category, and author.' });
        }

        // 3. Validate author as a valid ObjectId (assuming 'User' model uses ObjectId)
        if (!mongoose.Types.ObjectId.isValid(author)) {
            return res.status(400).json({ message: 'Invalid author ID provided.' });
        }

        // 4. Generate a slug from the title
        const slug = generateSlug(title);

        let imagePath = null;
        try {
            // --- NEW: Upload the image to Vercel Blob ---
            if (req.file) {
                // Get the file extension from the original name
                const fileExt = file.originalname.split('.').pop();
                // Create a unique filename for the blob
                const filename = `${slug}-${Date.now()}.${fileExt}`;
                
                // Use the Vercel Blob `put` function to upload the file from memory
                const blob = await put(filename, req.file.buffer, {
                    access: 'public', // Makes the image publicly accessible via a URL
                    token: process.env.BLOB_READ_WRITE_TOKEN,
                });

                // The returned `url` is the public URL of the uploaded image
                imagePath = blob.url;
            }

            // 5. Check if a post with the generated slug or title already exists
            const existingPost = await Post.findOne({ $or: [{ slug: slug }, { title: title }] });
            if (existingPost) {
                // Since we've already uploaded the image, we should delete it if the post creation fails
                // (Note: This is a simplified example, you might handle cleanup differently in production)
                // For now, we'll just return the error.
                return res.status(409).json({ message: 'A post with this title or slug already exists.' });
            }

            // 6. Create a new Post instance with the Blob URL
            const newPost = new Post({
                title,
                slug,
                body,
                category,
                author,
                image_path: imagePath, // Save the public URL
                tags: tags ? JSON.parse(tags) : []
            });

            // 7. Save the new post to the database
            const savedPost = await newPost.save();

            // 8. Respond with the newly created post
            res.status(201).json(savedPost);

        } catch (error) {
            console.error('Error creating post:', error.message);
            // In a real app, you might also delete the blob here if the database save fails
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: 'Server error when creating post.' });
        }
    });
});
  



// Registration Routes

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // 1. Basic Validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields: name, email, and password.' });
    }

    // 2. Check if a user with this email already exists
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create a new User instance
        user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin' // The first user is an admin by default
        });

        // 5. Save the user to the database
        await user.save();

        // 6. Respond with success (excluding the password)
        res.status(201).json({ message: 'User registered successfully!', user: { name: user.name, email: user.email, role: user.role } });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});




// Login Route



router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. Basic Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter both email and password.' });
    }

    try {
        // 2. Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // 3. Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // 4. Create the JWT payload
        const payload = {
            user: {
                id: user.id, // The user's database ID
                role: user.role // The user's role (admin, user, etc.)
            }
        };

        // 5. Sign the token and send it back
        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Use the secret key from your .env file
            { expiresIn: '1h' }, // Token expires in 1 hour
            (err, token) => {
                if (err) throw err;
                res.status(200).json({
                    message: 'Login successful!',
                    token, // The JWT is sent to the client
                    user: {
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


module.exports = router;