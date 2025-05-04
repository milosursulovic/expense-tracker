import Transaction from "../models/Transaction.js"; // Import the Transaction model for DB interaction
import dayjs from "dayjs"; // Import dayjs for date handling
import puppeteer from "puppeteer"; // Import puppeteer for PDF generation

// ============================
// Add a new transaction
// ============================
export const addTransaction = async (req, res) => {
  try {
    const transaction = new Transaction(req.body); // Instantiate a new transaction from request body
    await transaction.save(); // Save to the database
    res.status(201).json(transaction); // Return created transaction with HTTP 201
  } catch (error) {
    res.status(500).json({ msg: error.message }); // Internal server error response
  }
};

// ============================
// Get transactions with pagination, search, and sorting
// ============================
export const getTransactions = async (req, res) => {
  try {
    // Extract query parameters or use defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.search || "";
    const sortBy = req.query.sortBy || "date";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const isNumeric = !isNaN(searchQuery);

    // Build a dynamic search filter
    const searchFilter = {
      $or: [
        { description: { $regex: searchQuery, $options: "i" } },
        ...(isNumeric ? [{ amount: Number(searchQuery) }] : []),
      ],
    };

    // Query and paginate results
    const transactions = await Transaction.find(searchFilter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalTransactions = await Transaction.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      transactions,
      currentPage: page,
      totalPages,
      totalTransactions,
      searchQuery,
      sortBy,
      sortOrder: sortOrder === 1 ? "asc" : "desc",
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// ============================
// Get monthly summary of transactions
// ============================
export const getMonthlySummary = async (req, res) => {
  const { month, year } = req.params;

  try {
    // Define start and end dates for the selected month
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    // Fetch transactions for the month
    const transactions = await Transaction.find({
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).sort({ date: -1 });

    // Group transactions by type and currency
    const groupByCurrency = (type) => {
      return transactions
        .filter((t) => t.type === type)
        .reduce((acc, t) => {
          acc[t.currency] = (acc[t.currency] || 0) + t.amount;
          return acc;
        }, {});
    };

    const income = groupByCurrency("income");
    const expense = groupByCurrency("expense");

    res.json({ income, expense, transactions });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// ============================
// Generate and download a PDF summary for the month
// ============================
export const downloadMonthlySummaryPDF = async (req, res) => {
  const { month, year } = req.params;

  try {
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    const transactions = await Transaction.find({
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).sort({ date: -1 });

    // Aggregate income and expenses by currency
    const incomeByCurrency = {};
    const expenseByCurrency = {};

    transactions.forEach((t) => {
      const target = t.type === "income" ? incomeByCurrency : expenseByCurrency;
      target[t.currency] = (target[t.currency] || 0) + t.amount;
    });

    // Format summary values for display
    const formatSummary = (summaryObj) => {
      return Object.entries(summaryObj)
        .map(([currency, amount]) => {
          const label =
            currency === "thing" ? "Stvar(i)" : currency.toUpperCase();
          return `${amount} ${label}`;
        })
        .join(", ");
    };

    const income = formatSummary(incomeByCurrency);
    const expense = formatSummary(expenseByCurrency);

    // Compose HTML for PDF
    const htmlContent = `
      <html>
        <body>
          <h1 style="text-align:center;">Izveštaj - ${month}/${year}</h1>
          <p><strong>Ukupno Pozajmio:</strong> ${income}</p>
          <p><strong>Ukupno Pozajmica:</strong> ${expense}</p>
          <h2>Transakcije:</h2>
          <ul>
            ${transactions
              .map((t) => {
                const label = t.type === "income" ? "Pozajmio" : "Pozajmica";
                const currency =
                  t.currency !== "thing" ? ` ${t.currency.toUpperCase()}` : "";
                return `<li>${label}: ${t.amount}${currency} - ${
                  t.description
                } (${dayjs(t.date).format("YYYY-MM-DD")})</li>`;
              })
              .join("")}
          </ul>
        </body>
      </html>
    `;

    // Generate the PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Set HTTP headers and send the PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=izvestaj-${month}-${year}.pdf`
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// ============================
// Delete a transaction by ID
// ============================
export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Transaction.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ msg: "Transakcija nije pronađena." });
    }

    res.status(200).json({ msg: "Transakcija uspešno obrisana." });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};
