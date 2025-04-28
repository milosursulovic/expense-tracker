import express from "express";
import {
  addTransaction,
  getTransactions,
  getMonthlySummary,
  downloadMonthlySummaryPDF,
} from "../controllers/transactionController.js";

const router = express.Router();

router.post("/", addTransaction);
router.get("/", getTransactions);
router.get("/summary/:month/:year", getMonthlySummary);
router.get("/summary/:month/:year/pdf", downloadMonthlySummaryPDF);

export default router;
