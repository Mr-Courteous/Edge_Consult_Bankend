// Import necessary packages
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();

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

    // Validate incoming data
    if ( !email) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Define the email content
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'inumiduncourteous@gmail.com', // The website owner's email
        subject: `New Message from Contact Form`,
        html: `
            <h3>Contact Details</h3>
            <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Email:</strong> ${email}</li>
            </ul>
            <h3>Message</h3>
            <p>${message}</p>
        `,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        res.status(200).json({ msg: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ msg: 'Server error. Failed to send message.' });
    }
});

module.exports = router;