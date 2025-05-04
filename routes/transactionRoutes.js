// Import express and controller functions
import express from "express";
import {
  addTransaction, // Controller to add a new transaction
  getTransactions, // Controller to retrieve transactions (with pagination, search, and sorting)
  deleteTransaction, // Controller to delete a transaction by ID
  getMonthlySummary, // Controller to get a monthly transaction summary
  downloadMonthlySummaryPDF, // Controller to generate and download a PDF summary for the month
} from "../controllers/transactionController.js";

// Initialize an Express router
const router = express.Router();

// Route to create a new transaction (POST /)
router.post("/", addTransaction);

// Route to fetch all transactions (GET /)
router.get("/", getTransactions);

// Route to delete a transaction by ID (DELETE /:id)
router.delete("/:id", deleteTransaction);

// Route to get a summary for a specific month and year (GET /summary/:month/:year)
router.get("/summary/:month/:year", getMonthlySummary);

// Route to download a PDF report for a specific month and year (GET /summary/:month/:year/pdf)
router.get("/summary/:month/:year/pdf", downloadMonthlySummaryPDF);

// Export the router to be used in the main server file
export default router;
