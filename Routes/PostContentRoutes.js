const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // For ObjectId validation
const multer = require('multer'); // Import multer for file uploads
const jwt = require('jsonwebtoken'); // For handling JWTs (used in login/registration)
const bcrypt = require('bcryptjs'); // For password hashing (used in login/registration)
const Comment = require('../Models/Comments'); // Import the Comment model
require('dotenv').config(); // Load environment variables
const nodemailer = require('nodemailer'); // For sending emails


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



/**
 * @route   POST /add-posts
 * @desc    Create a new blog post with an optional image upload
 * @access  Private (requires authentication token)/*
 * Route to create a new blog post.
 * It supports general posts and specific scholarship-type posts with additional fields.
 */
router.post('/add-posts', verifyToken, upload.single('image'), async (req, res) => {
    let blobUrl = null;
    try {
        const { title, body, category, author } = req.body;

        // Destructure scholarship-specific fields
        const { country, degree, description, funding, deadline, requirements } = req.body;

        // Destructure job-specific fields
        const { company, location, jobType, salaryRange, experienceRequired, applicationDeadline, responsibilities, link } = req.body;

        if (!title || !body || !category || !author) {
            return res.status(400).json({ message: 'Missing required fields: title, body, or category.' });
        }

        if (!mongoose.Types.ObjectId.isValid(author)) {
            return res.status(400).json({ message: 'Invalid author ID format.' });
        }

        const slug = generateSlug(title);

        const existingPost = await Post.findOne({ $or: [{ slug: slug }, { title: title }] });
        if (existingPost) {
            return res.status(409).json({ message: 'A post with this title or slug already exists. Please use a different title.' });
        }

        if (req.file) {
            const fileExt = req.file.originalname.split('.').pop();
            const filename = `${slug}-${Date.now()}.${fileExt}`;

            const blob = await put(filename, req.file.buffer, {
                access: 'public',
                token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            blobUrl = blob.url;
        }

        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

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
            const parsedRequirements = requirements ? JSON.parse(requirements) : [];
            postData.scholarshipDetails = {
                country,
                degree,
                description,
                funding,
                deadline,
                requirements: parsedRequirements
            };
        }

        // --- NEW: Handle job-specific fields ---
        if (category === 'jobs') {
            // Parse array fields if they are sent as JSON strings
            const parsedRequirements = requirements ? JSON.parse(requirements) : [];
            const parsedResponsibilities = responsibilities ? JSON.parse(responsibilities) : [];

            // Parse salary range string into min and max numbers
            let salary = {};
            if (salaryRange) {
                const parts = salaryRange.replace(/[$,k]/g, '').split('-').map(part => parseFloat(part.trim()));
                if (parts.length === 2) {
                    salary.min = parts[0] * 1000;
                    salary.max = parts[1] * 1000;
                } else if (parts.length === 1) {
                    // Handle single number like '90k'
                    salary.min = parts[0] * 1000;
                    salary.max = parts[0] * 1000;
                }
            }

            postData.jobDetails = {
                company,
                location,
                jobType,
                salary,
                salaryRange, // Save the original string for display
                experienceRequired,
                applicationDeadline,
                requirements: parsedRequirements,
                responsibilities: parsedResponsibilities,
                link
            };
        }
        // --- END OF NEW CODE ---

        const newPost = new Post(postData);
        const savedPost = await newPost.save();

        res.status(201).json({ message: 'Blog post created successfully!', post: savedPost });

    } catch (error) {
        console.error('Error creating blog post:', error);

        if (blobUrl) {
            try {
                await del(blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
                console.log(`Successfully deleted orphaned blob: ${blobUrl}`);
            } catch (blobError) {
                console.error(`Failed to delete orphaned blob: ${blobUrl}`, blobError);
            }
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Validation failed: ${messages.join(', ')}` });
        }

        res.status(500).json({ message: 'Server error occurred while creating the post. Please try again later.' });
    }
});




// @route   POST api/comments/:postId
// @desc    Add a comment to a post
// @access  Private (requires authentication)

router.post('/:postId', async (req, res) => {
    // Expecting either `authorId` or `author_info` (with fullName and email)
    const { content, authorId, author_info } = req.body;
    const postId = req.params.postId;

    // Basic validation for the comment content
    if (!content) {
        return res.status(400).json({ msg: 'Comment content is required' });
    }

    // Check for at least one of the two optional fields
    // A comment must be associated with an author OR provide author info
    if (!authorId && (!author_info || (!author_info.fullName && !author_info.email))) {
        return res.status(400).json({ msg: 'Either authorId or author_info (with a name/email) is required' });
    }

    try {
        // Find the post to ensure it exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ msg: 'Post not found' });
        }

        const newCommentData = {
            content,
            post: postId
        };

        // Conditionally add the author fields based on what was provided
        if (authorId) {
            newCommentData.author = authorId;
        } else if (author_info) {
            newCommentData.author_info = author_info;
        }

        // Create a new comment instance
        const newComment = new Comment(newCommentData);

        // Save the comment to the database
        const savedComment = await newComment.save();

        // Update the comment count on the post
        post.commentCount++;
        await post.save();

        // Populate the author data before sending the response
        // This makes the response more useful to the frontend
        const populatedComment = await Comment.findById(savedComment._id)
            .populate('author', 'fullName email') // Populate the User model fields
            .lean(); // Convert to a plain JavaScript object

        res.status(201).json(populatedComment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



module.exports = router;