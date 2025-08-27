const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['news', 'nysc', 'scholarships', 'jobs'],
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    image_path: {
        type: String,
        required: false
    },
    tags: {
        type: [String],
        default: []
    },
    likes: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        default: []
    },
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    // New optional fields for scholarships
    scholarshipDetails: {
        // You can use an object to group all scholarship-related fields
        required: false, // Make the entire object optional
        type: {
            // New fields specific to a scholarship post
            country: {
                type: String,
                required: false
            },
            degree: {
                type: String,
                required: false
            },
            description: {
                type: String,
                required: false
            },
            funding: {
                type: String,
                required: false
            },
            deadline: {
                type: String,
                required: false
            },
            requirements: {
                type: [String],
                required: false
            }
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', PostSchema);