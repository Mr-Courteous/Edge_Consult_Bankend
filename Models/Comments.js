const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Author is now optional
    },
    author_info: {
        type: {
            fullName: {
                type: String,
                required: false,
                trim: true
            },
            email: {
                type: String,
                required: false,
                trim: true,
                lowercase: true,
            }
        },
        required: false // The entire object is optional
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
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
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', CommentSchema);