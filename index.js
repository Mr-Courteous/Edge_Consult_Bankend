// Load environment variables from a .env file
require('dotenv').config();

// Core Express and database connection
const express = require('express');
const app = express();
const connectDB = require('./Dbconnection');

// Middleware for CORS and body parsing
const cors = require('cors'); // Import the cors package
const bodyParser = require('body-parser'); 

// Import your route files
const PostRoutes = require('./Routes/PostsRoutes');
const GetRoutes = require('./Routes/GetRoutes');

// --- Global Middleware ---

// Enable CORS for all origins and all routes.
// This is the simplest way to allow any frontend to communicate with your API.
// IMPORTANT: For production, you might want to restrict this to specific domains for security.
// Place this BEFORE any routes are defined or used.
app.use(cors()); 

// Middleware to parse incoming JSON data from the request body.
app.use(express.json());

// If you need to handle URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// --- Database Connection ---

// Call the function to connect to your database.
connectDB();

// --- API Routes ---

// Use a base path for your API routes to keep them organized.
// For example, all post-related routes will start with '/api/posts'.
app.use('/api', PostRoutes); // Example: Prefixing routes with /api
app.use('/api', GetRoutes);  // Example: Prefixing routes with /api


// --- Generic Routes ---

// Define the root route.
app.get('/', (req, res) => {
  res.send('Hello from your simple Express server!');
});

// A simple example of a GET route with a query parameter.
app.get('/api/greet', (req, res) => {
  const name = req.query.name || 'Guest';
  res.status(200).json({ message: `Greetings, ${name}!` });
});

// --- Server Startup ---

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});