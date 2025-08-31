const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // For ObjectId validation
const multer = require('multer'); // Import multer for file uploads
const jwt = require('jsonwebtoken'); // For handling JWTs (used in login/registration)
const bcrypt = require('bcryptjs'); // For password hashing (used in login/registration)
const Comment = require('../Models/Comments'); // Import the Comment model
require('dotenv').config(); // Load environment variables
const nodemailer = require('nodemailer'); // For sending emails
const User = require('../Models/Users'); // Import the User model



// ----------------------------------------
// --- Blog Post Management Routes ---
// ----------------------------------------



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
