const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // User's full name
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Unique email for login and communication
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    // Hashed password for security
    password: {
        type: String,
        required: true,
        minlength: 6 // Enforce minimum length for password security
    },
    // The user's role, with 'admin' as the default for now
    role: {
        type: String,
        enum: ['admin', 'user', 'moderator'], // Define possible roles
        default: 'admin' // Start with 'admin' as the default role
    },
    // A flag to indicate if the user's account is active
    isActive: {
        type: Boolean,
        default: true
    },
    // Profile picture URL (optional)
    avatar: {
        type: String
    },
    // You can add more profile-related fields here for the future
    // e.g., phone: String, bio: String, location: String
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('User', UserSchema);