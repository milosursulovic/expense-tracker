import Transaction from "../models/Transaction.js";
import dayjs from "dayjs";
import PDFDocument from "pdfkit";

//Add a new transaction
export const addTransaction = async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Get all transactions with pagination
export const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if no page param
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page

    const transactions = await Transaction.find()
      .skip((page - 1) * limit) // Skip the previous pages' transactions
      .limit(limit) // Limit the number of results per page
      .sort({ date: -1 }); // Sort by date (optional)

    const totalTransactions = await Transaction.countDocuments(); // Get total count of transactions

    // Calculate total number of pages
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      transactions,
      currentPage: page,
      totalPages,
      totalTransactions,
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

//Get monthly summary
export const getMonthlySummary = async (req, res) => {
  const { month, year } = req.params;
  try {
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    const transactions = await Transaction.find({
      date: {
        $gte: start.toDate(),
        $lt: end.toDate(),
      },
    }).sort({ date: -1 }); // Sort by date in descending order
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({ income, expense, transactions });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const downloadMonthlySummaryPDF = async (req, res) => {
  const { month, year } = req.params;

  try {
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    const transactions = await Transaction.find({
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).sort({ date: -1 }); // Sort by date in descending order

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=summary-${month}-${year}.pdf`
    );
    doc.pipe(res);

    doc
      .fontSize(20)
      .text(`Monthly Summary - ${month}/${year}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text(`Total Income: $${income}`);
    doc.fontSize(16).text(`Total Expense: $${expense}`);
    doc.moveDown();

    doc.fontSize(14).text("Transactions:", { underline: true });
    transactions.forEach((t) => {
      doc.text(
        `${t.type.toUpperCase()}: $${t.amount} - ${t.description} (${dayjs(
          t.date
        ).format("YYYY-MM-DD")})`
      );
    });

    doc.end();
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};
