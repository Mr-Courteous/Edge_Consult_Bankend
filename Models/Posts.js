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
    },
    // New optional fields for job posts
    jobDetails: {
        required: false,
        type: {
            company: {
                type: String,
                required: false,
                trim: true
            },
            location: {
                type: String,
                required: false,
                trim: true
            },
            jobType: {
                type: String,
                required: false,
                enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
                trim: true
            },
            salary: {
                min: { type: Number, required: false },
                max: { type: Number, required: false }
            },
            salaryRange: {
                type: String,
                required: false,
                trim: true
            },
            experienceRequired: {
                type: String,
                required: false,
                trim: true
            },
            applicationDeadline: {
                type: Date,
                required: false
            },
            responsibilities: {
                type: [String],
                default: []
            },
            requirements: {
                type: [String],
                default: []
            },
            link: {
                type: String,
                required: false,
                trim: true
            }
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', PostSchema);