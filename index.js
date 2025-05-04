// Import necessary dependencies
import express from "express"; // Express framework for handling HTTP requests
import mongoose from "mongoose"; // MongoDB ORM for connecting to and interacting with MongoDB
import cors from "cors"; // Middleware for enabling Cross-Origin Resource Sharing
import bodyParser from "body-parser"; // Middleware for parsing incoming request bodies
import transactionRoutes from "./routes/transactionRoutes.js"; // Routes for handling transaction-related API requests
import dotenv from "dotenv"; // For loading environment variables from a .env file

// Load environment variables from .env file
dotenv.config();

// Initialize an Express application
const app = express();

// Set the port from environment variable or fallback to 3000
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) for all origins
app.use(cors());

// Use body-parser to parse incoming JSON data in request bodies
app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static("public"));

// Mount the transaction routes to handle "/api/transactions" API path
app.use("/api/transactions", transactionRoutes);

// Connect to MongoDB using the URI from environment variables
mongoose
  .connect(process.env.MONGODB_URI) // MongoDB URI stored in environment variable
  .then(() => {
    // Successfully connected to MongoDB
    console.log("Connected to MongoDB");

    // Start the Express server on the specified port
    app.listen(PORT, () => {
      // Log that the server is running
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    // Log an error if the MongoDB connection fails
    console.error("Error connecting to MongoDB:", error);
  });
