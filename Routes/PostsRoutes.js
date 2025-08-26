const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // For ObjectId validation
const multer = require('multer'); // Import multer for file uploads
const jwt = require('jsonwebtoken'); // For handling JWTs (used in login/registration)
const bcrypt = require('bcryptjs'); // For password hashing (used in login/registration)
require('dotenv').config(); // Load environment variables

// --- Vercel Blob Storage specific imports ---
const { put, del } = require('@vercel/blob');

// --- Model Imports ---
const Post = require('../Models/Posts'); // Assuming your blog post model is named 'Post'
const User = require('../Models/Users'); // Assuming your user model is named 'User'

// --- Middleware & Utility Imports ---
const verifyToken = require('../Middlewares/verifyToken'); // Middleware to verify JWT and attach user info to req
const { generateSlug } = require('../Utils/slugGenerator'); // Utility to generate URL-friendly slugs

// --- Multer Configuration ---
// Use memory storage for Multer to handle file uploads in memory.
// This is essential for serverless environments like Vercel as the filesystem is read-only.
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------------------
// --- Blog Post Management Routes ---
// ----------------------------------------

/**
 * @route   POST /add-posts
 * @desc    Create a new blog post with an optional image upload
 * @access  Private (requires authentication token)/*
 * Route to create a new blog post.
 * It supports general posts and specific scholarship-type posts with additional fields.
 */
router.post('/add-posts', verifyToken, upload.single('image'), async (req, res) => {
    let blobUrl = null; // Initialize to null for potential cleanup
    try {
        // Destructure core fields from req.body
        const { title, body, category, author } = req.body;

        // Destructure scholarship-specific fields, if present
        const { country, degree, description, funding, deadline, requirements } = req.body;

        // Validate essential fields
        if (!title || !body || !category || !author) {
            return res.status(400).json({ message: 'Missing required fields: title, body, or category.' });
        }

        // Validate author ID format
        if (!mongoose.Types.ObjectId.isValid(author)) {
            return res.status(400).json({ message: 'Invalid author ID format.' });
        }

        // Generate a URL-friendly slug from the post title
        const slug = generateSlug(title);

        // Check for duplicate title or slug
        const existingPost = await Post.findOne({ $or: [{ slug: slug }, { title: title }] });
        if (existingPost) {
            return res.status(409).json({ message: 'A post with this title or slug already exists. Please use a different title.' });
        }

        // Handle image upload to Vercel Blob Storage if a file is present
        if (req.file) {
            const fileExt = req.file.originalname.split('.').pop();
            const filename = `${slug}-${Date.now()}.${fileExt}`;
            
            const blob = await put(filename, req.file.buffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            blobUrl = blob.url;
        }

        // Parse tags from the request body
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        // Prepare the post object to be saved
        const postData = {
            title,
            slug,
            body,
            category,
            author,
            image_path: blobUrl,
            tags: tags
        };

        // If the category is 'scholarships', add the specific details
        if (category === 'scholarships') {
            // Parse requirements if they are sent as a JSON string
            const parsedRequirements = requirements ? JSON.parse(requirements) : [];
            
            // Add the scholarshipDetails object to the postData
            postData.scholarshipDetails = {
                country,
                degree,
                description,
                funding,
                deadline,
                requirements: parsedRequirements
            };
        }

        // Create and save the new post instance
        const newPost = new Post(postData);
        const savedPost = await newPost.save();

        // Respond with success and the newly created post data
        res.status(201).json({ message: 'Blog post created successfully!', post: savedPost });

    } catch (error) {
        // Log the full error for debugging purposes
        console.error('Error creating blog post:', error);

        // --- Cleanup: Delete the uploaded blob if the database save or any other step fails ---
        if (blobUrl) {
            try {
                await del(blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
                console.log(`Successfully deleted orphaned blob: ${blobUrl}`);
            } catch (blobError) {
                console.error(`Failed to delete orphaned blob: ${blobUrl}`, blobError);
            }
        }

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
        }
        
        // Catch-all for other server errors
        res.status(500).json({ message: 'Server error occurred while creating the post. Please try again later.' });
    }
});
/**
 * @route   POST /register
 * @desc    Register a new user (admin role by default for first user)
 * @access  Public
 */
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    // Basic Validation
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide all required fields: name, email, and password.' });
    }

    try {
        // Check if a user with this email already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: 'A user with this email already exists.' });
        }

        // Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new User instance; assign 'admin' role by default
        user = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin' // Default role
        });

        // Save the new user to the database
        await user.save();

        // Respond with success message and basic user info (exclude password)
        res.status(201).json({ 
            message: 'User registered successfully!', 
            user: { id: user._id, name: user.name, email: user.email, role: user.role } 
        });

    } catch (error) {
        console.error('Error during user registration:', error.message);
        // Handle Mongoose validation errors for registration
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Registration failed: ${messages.join(', ')}` });
        }
        res.status(500).json({ message: 'Server error occurred during registration. Please try again later.' });
    }
});

/**
 * @route   POST /login
 * @desc    Authenticate user and get JWT
 * @access  Public
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    try {
        // Check if the user exists in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Prepare the payload for the JWT
        const payload = {
            user: {
                id: user.id, // User's unique database ID
                role: user.role, // User's role
                name: user.name // User's name for convenience
            }
        };

        // --- Refinement: Explicitly retrieve secret for clarity and parser safety ---
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            // This error will be caught at runtime if JWT_SECRET is truly missing.
            // A SyntaxError is a parsing error, which is different.
            console.error("Server configuration error: JWT_SECRET environment variable is not set.");
            return res.status(500).json({ message: 'Server configuration error: Authentication secret is missing.' });
        }

        // Sign the token and send it back to the client
        jwt.sign(
            payload,
            jwtSecret, // Use the explicitly defined variable
            { expiresIn: '1h' }, // Token expires in 1 hour (adjust as needed)
            (err, token) => {
                if (err) {
                    console.error("Error signing JWT:", err);
                    return res.status(500).json({ message: 'Error generating authentication token.' });
                }
                res.status(200).json({
                    message: 'Login successful!',
                    token, // The JSON Web Token
                    user: {
                        id: user._id, // Send the user ID
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            }
        );

    } catch (error) {
        console.error('Error during user login:', error.message);
        res.status(500).json({ message: 'Server error occurred during login. Please try again later.' });
    }
});


module.exports = router;
        