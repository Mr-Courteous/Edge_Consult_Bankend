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
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/ /g, '-') // Replace spaces with hyphens
        .replace(/[^\w-]+/g, ''); // Remove all non-word characters (except hyphens)
};

/**
 * @route   POST /api/posts
 * @desc    Create a new blog post
 * @access  Private (You'd typically add middleware here for authentication)
 */

// Set storage engine
const storage = multer.diskStorage({
    destination: './uploads/images', // Images will be saved in a folder named 'uploads/images'
    filename: (req, file, cb) => {
        // Generate a unique filename: fieldname-timestamp.ext
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload middleware
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // Limit file size to 10MB
    fileFilter: (req, file, cb) => {
        // Check file type to ensure only images are uploaded
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only (JPEG, JPG, PNG, GIF)!');
        }
    }
}).single('image'); // 'image' is the name of the form field that will contain the file

// --- Route to add new posts ---

/**
 * @route   POST /api/posts/add-posts
 * @desc    Create a new blog post with optional image upload
 * @access  Private (You'd typically add middleware here for authentication)
 */
router.post('/add-posts', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        // If no file was uploaded, req.file will be undefined
        const imagePath = req.file ? `/uploads/images/${req.file.filename}` : null;

        // 1. Destructure required fields from the request body
        // Note: When using multer, text fields are in req.body
        const { title, body, category, author, tags } = req.body;

        // 2. Basic validation
        if (!title || !body || !category || !author) {
            // If an image was uploaded but other fields are missing, delete the image
            if (req.file) {
                const fs = require('fs'); // Node's file system module
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(400).json({ message: 'Please enter all required fields: title, body, category, and author.' });
        }

        // 3. Validate author as a valid ObjectId (assuming 'User' model uses ObjectId)
        if (!mongoose.Types.ObjectId.isValid(author)) {
            if (req.file) {
                const fs = require('fs');
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
            return res.status(400).json({ message: 'Invalid author ID provided.' });
        }

        // 4. Generate a slug from the title
        const slug = generateSlug(title);

        try {
            // 5. Check if a post with the generated slug or title already exists to prevent duplicates
            const existingPost = await Post.findOne({ $or: [{ slug: slug }, { title: title }] });
            if (existingPost) {
                if (req.file) {
                    const fs = require('fs');
                    fs.unlink(req.file.path, (unlinkErr) => {
                        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                    });
                }
                return res.status(409).json({ message: 'A post with this title or slug already exists.' });
            }

            // 6. Create a new Post instance
            const newPost = new Post({
                title,
                slug,
                body,
                category,
                author,
                image_path: imagePath, // Save the path to the uploaded image
                tags: tags ? JSON.parse(tags) : [] // Tags might come as a JSON string from FormData
            });

            // 7. Save the new post to the database
            const savedPost = await newPost.save();

            // 8. Respond with the newly created post
            res.status(201).json(savedPost);

        } catch (error) {
            console.error('Error creating post:', error.message);
            if (req.file) {
                const fs = require('fs');
                fs.unlink(req.file.path, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
                });
            }
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