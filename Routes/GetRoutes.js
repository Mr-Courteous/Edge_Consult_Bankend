const express = require('express');
const router = express.Router();
const Post = require('../Models/Posts'); // Ensure this path is correct
const User = require('../Models/Users'); // Import the User model
const verifyToken = require('../Middlewares/verifyToken'); // Middleware to verify JWT and attach user info to request
const Comment = require('../Models/Comments'); // Import the Comment model



/**
 * @route   GET /api/posts
 * @desc    Get all posts
 * @access  Public
 */
// router.get('/posts', async (req, res) => {
//     try {
//         const posts = await Post.find().sort({ createdAt: -1 }); // Sort by creation date (newest first)
//         res.status(200).json(posts);
//     } catch (error) {
//         console.error('Error fetching posts:', error.message);
//         res.status(500).json({ message: 'Server error when fetching posts.' });
//     }
// });


router.get('/posts', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 }) // Sort by newest first
            .populate('author', 'fullName'); // Populate the author's name

        res.json(posts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// Route to get a single post by ID
router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate('author', 'name');
    if (!post) return res.status(404).send('<h1>Post not found</h1>');

    const pageTitle = post.title;
    const pageDescription = post.body?.substring(0, 150) || '';
    const pageImage = post.image_path || '';
    const pageUrl = `https://your-domain.com/posts/${post._id}`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>${pageTitle}</title>
          <meta name="description" content="${pageDescription}"/>
          <meta property="og:title" content="${pageTitle}"/>
          <meta property="og:description" content="${pageDescription}"/>
          <meta property="og:image" content="${pageImage}"/>
          <meta property="og:url" content="${pageUrl}"/>
          <meta name="twitter:card" content="summary_large_image"/>
          <meta name="twitter:title" content="${pageTitle}"/>
          <meta name="twitter:description" content="${pageDescription}"/>
          <meta name="twitter:image" content="${pageImage}"/>
        </head>
        <body>
          <div id="root"></div>
          <script>
            window.__POST_DATA__ = ${JSON.stringify(post)};
          </script>
          <script src="/bundle.js"></script>
        </body>
      </html>
    `);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).send('<h1>Invalid Post ID</h1>');
    console.error(error);
    res.status(500).send('<h1>Server error</h1>');
  }
});

// get all cooments numbers



// scholarships route to get posts with category 'scholarships'

router.get('/scholarships', async (req, res) => {
    try {
        const scholarshipPosts = await Post.find({ category: 'scholarships' }).sort({ createdAt: -1 });
        res.status(200).json(scholarshipPosts);
    } catch (error) {
        console.error('Error fetching scholarship posts:', error);
        res.status(500).json({ message: 'Server error occurred while fetching scholarship posts.' });
    }
});




// router.get('/post/:postId', async (req, res) => {
//     try {
//         const postId = req.params.postId;

//         // Find all comments for the given postId
//         // Populate the 'author' field to get user details if available
//         const comments = await Comment.find({ post: postId })
//             .populate('author', 'fullName email') // Only populate if 'author' (ObjectId) exists
//             .sort({ createdAt: -1 }) // Sort by newest comments first
//             .lean(); // For performance, get plain JavaScript objects

//         // The populate will only work if the 'author' field is actually an ObjectId referencing a User.
//         // If it's an anonymous comment, the 'author' field will be null, and 'author_info' will contain the details.

//         res.status(200).json(comments);
//     } catch (err) {
//         console.error(err.message);
//         res.status(500).send('Server error');
//     }
// });



// Admin Dashboard route 

router.get('/admin-dashboard', verifyToken, async (req, res) => {
    try {
        // Fetch all data concurrently using Promise.all for efficiency
        const [
            totalPosts,
            postsByCategory,
            allUsers
        ] = await Promise.all([
            // Get total count of all posts
            Post.countDocuments(),

            // Get post count grouped by category
            Post.aggregate([
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]),

            // Get all users, but only select essential fields
            User.find().select('name email role createdAt').sort({ createdAt: -1 })
        ]);

        // Format the postsByCategory data into a key-value object
        const formattedPostsByCategory = postsByCategory.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const dashboardData = {
            totalPosts,
            postsByCategory: formattedPostsByCategory,
            users: allUsers
        };

        res.status(200).json(dashboardData);
    } catch (error) {
        console.error('Error fetching admin dashboard data:', error.message);
        res.status(500).json({ message: 'Server error when fetching dashboard data.' });
    }
});










// Admin Metrics route

router.get('/metrics', async (req, res) => {
    try {
        const [
            usersByRole,
            postsWithMostLikes,
            postsWithMostComments
        ] = await Promise.all([
            // Get user count grouped by role (e.g., admin, user)
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]),

            // Find top 5 posts with the most likes
            Post.find().sort({ likeCount: -1 }).limit(5).select('title likeCount'),

            // Find top 5 posts with the most comments
            Post.find().sort({ commentCount: -1 }).limit(5).select('title commentCount')
        ]);

        const metricsData = {
            usersByRole: usersByRole.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            topPostsByLikes: postsWithMostLikes,
            topPostsByComments: postsWithMostComments
        };

        res.status(200).json(metricsData);
    } catch (error) {
        console.error('Error fetching admin metrics:', error.message);
        res.status(500).json({ message: 'Server error when fetching metrics.' });
    }
});






































module.exports = router;