const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // For ObjectId validation
const multer = require('multer'); // Import multer for file uploads
const jwt = require('jsonwebtoken'); // For handling JWTs (used in login/registration)
const bcrypt = require('bcryptjs'); // For password hashing (used in login/registration)
const Comment = require('../Models/Comments'); // Import the Comment model
require('dotenv').config(); // Load environment variables
const nodemailer = require('nodemailer'); // For sending emails



// Create a transporter using your email service credentials
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email service provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// @route   POST /api/contact
// @desc    Send an email from the contact form
// @access  Public

router.post('/subscribe', async (req, res) => {
    const { name, email, message } = req.body;

    // Validate incoming data - only 'email' is required for subscription
    if (!email) {
        return res.status(400).json({ msg: 'Email is required' });
    }

    // Define the email content
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'exradallenum@gmail.com', // The website owner's email details good
        subject: `New Newsletter Subscription`, // Changed subject to be more specific
        html: `
            <h3>New Subscriber!</h3>
            <p><strong>Email:</strong> ${email}</p>
        `,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Subscription email sent successfully!');
        res.status(200).json({ msg: 'Subscription successful!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ msg: 'Server error. Failed to send message.' });
    }
});


router.post('/send-message-exradallenum', async (req, res) => {
    // Destructure all the fields from the request body
    const {
        fullName,
        phoneNumber,
        emailAddress,
        whatClass,
        howOld,
        whatServices,
        whatCountry,
        preferredTime,
        specificNeeds,
        additionalMessage
    } = req.body;

    // Validate incoming data to ensure required fields are present
    if (!fullName || !emailAddress) {
        return res.status(400).json({ msg: 'Full Name and Email Address are required.' });
    }

    // Define the email content
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'inumiduncourteous@gmail.com', // The website owner's email
        subject: `New Message from Contact Form: ${fullName}`,
        html: `
            <h3>New Contact Form Submission</h3>
            <ul>
                <li><strong>Full Name:</strong> ${fullName}</li>
                <li><strong>Phone Number:</strong> ${phoneNumber || 'Not provided'}</li>
                <li><strong>Email Address:</strong> ${emailAddress}</li>
                <li><strong>What Class:</strong> ${whatClass || 'Not provided'}</li>
                <li><strong>How Old:</strong> ${howOld || 'Not provided'}</li>
                <li><strong>What Services:</strong> ${whatServices || 'Not provided'}</li>
                <li><strong>What Country:</strong> ${whatCountry || 'Not provided'}</li>
                <li><strong>Preferred Time of Day:</strong> ${preferredTime || 'Not provided'}</li>
                <li><strong>Specific Needs of the Child:</strong> ${specificNeeds || 'Not provided'}</li>
            </ul>
            <h3>Additional Message</h3>
            <p>${additionalMessage || 'No additional message provided.'}</p>
        `,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Contact form email sent successfully!');
        res.status(200).json({ msg: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ msg: 'Server error. Failed to send message.' });
    }
});




module.exports = router;