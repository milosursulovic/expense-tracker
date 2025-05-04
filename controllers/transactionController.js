import Transaction from "../models/Transaction.js";
import dayjs from "dayjs";
import puppeteer from "puppeteer";

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

// Get monthly summary
export const getMonthlySummary = async (req, res) => {
  const { month, year } = req.params;

  try {
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    const transactions = await Transaction.find({
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).sort({ date: -1 }); // Sort by date in descending order

    // Helper function to group transactions by currency
    const groupByCurrency = (type) => {
      return transactions
        .filter((t) => t.type === type)
        .reduce((acc, t) => {
          acc[t.currency] = (acc[t.currency] || 0) + t.amount;
          return acc;
        }, {});
    };

    // Group income and expense by currency
    const income = groupByCurrency("income");
    const expense = groupByCurrency("expense");

    // Send the grouped data back to the frontend
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

    // Group income and expense by currency
    const incomeByCurrency = {};
    const expenseByCurrency = {};

    transactions.forEach((t) => {
      if (t.type === "income") {
        incomeByCurrency[t.currency] =
          (incomeByCurrency[t.currency] || 0) + t.amount;
      } else if (t.type === "expense") {
        expenseByCurrency[t.currency] =
          (expenseByCurrency[t.currency] || 0) + t.amount;
      }
    });

    // Helper function to format the summary by currency
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

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();

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
