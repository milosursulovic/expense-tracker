import Transaction from "../models/Transaction.js"; // Import the Transaction model to interact with the database
import dayjs from "dayjs"; // Import dayjs for date manipulation
import puppeteer from "puppeteer"; // Import puppeteer for generating PDFs from HTML

// Add a new transaction
export const addTransaction = async (req, res) => {
  try {
    const transaction = new Transaction(req.body); // Create a new Transaction object using the request body
    await transaction.save(); // Save the new transaction to the database
    res.status(201).json(transaction); // Respond with the created transaction and status code 201 (created)
  } catch (error) {
    res.status(500).json({ msg: error.message }); // In case of error, send an error message with status 500
  }
};

// Get all transactions with pagination
export const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get the page number from query parameters (default to page 1)
    const limit = parseInt(req.query.limit) || 10; // Get the limit for number of transactions per page (default to 10)

    // Find transactions, skipping the number of results from previous pages and limiting the results per page
    const transactions = await Transaction.find()
      .skip((page - 1) * limit) // Skip previous pages' transactions
      .limit(limit) // Limit the number of results per page
      .sort({ date: -1 }); // Sort transactions by date in descending order

    const totalTransactions = await Transaction.countDocuments(); // Get the total number of transactions in the database

    // Calculate total number of pages based on the total number of transactions and the limit
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      transactions, // Send the transactions as a response
      currentPage: page, // Send the current page number
      totalPages, // Send the total number of pages
      totalTransactions, // Send the total count of transactions
    });
  } catch (error) {
    res.status(500).json({ msg: error.message }); // In case of error, send an error message with status 500
  }
};

// Get a monthly summary of transactions
export const getMonthlySummary = async (req, res) => {
  const { month, year } = req.params; // Extract the month and year from the URL parameters

  try {
    // Set the start and end dates for the given month and year
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    // Find transactions within the selected month and year
    const transactions = await Transaction.find({
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).sort({ date: -1 }); // Sort transactions by date in descending order

    // Helper function to group transactions by type (income/expense) and currency
    const groupByCurrency = (type) => {
      return transactions
        .filter((t) => t.type === type) // Filter transactions by type (income or expense)
        .reduce((acc, t) => {
          acc[t.currency] = (acc[t.currency] || 0) + t.amount; // Sum amounts by currency
          return acc;
        }, {});
    };

    // Group income and expense transactions by currency
    const income = groupByCurrency("income");
    const expense = groupByCurrency("expense");

    // Respond with the grouped income, expense, and the list of transactions
    res.json({ income, expense, transactions });
  } catch (error) {
    res.status(500).json({ msg: error.message }); // In case of error, send an error message with status 500
  }
};

// Download the monthly summary as a PDF
export const downloadMonthlySummaryPDF = async (req, res) => {
  const { month, year } = req.params; // Extract the month and year from the URL parameters

  try {
    // Set the start and end dates for the given month and year
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    // Find transactions within the selected month and year
    const transactions = await Transaction.find({
      date: { $gte: start.toDate(), $lt: end.toDate() },
    }).sort({ date: -1 }); // Sort transactions by date in descending order

    // Create separate objects to group income and expense transactions by currency
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
            currency === "thing" ? "Stvar(i)" : currency.toUpperCase(); // Handle "thing" currency special case
          return `${amount} ${label}`; // Return formatted string for each currency and its total
        })
        .join(", ");
    };

    // Format the income and expense summaries
    const income = formatSummary(incomeByCurrency);
    const expense = formatSummary(expenseByCurrency);

    // Create HTML content for the PDF report
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
                const label = t.type === "income" ? "Pozajmio" : "Pozajmica"; // Label based on transaction type
                const currency =
                  t.currency !== "thing" ? ` ${t.currency.toUpperCase()}` : ""; // Format currency
                return `<li>${label}: ${t.amount}${currency} - ${
                  t.description
                } (${dayjs(t.date).format("YYYY-MM-DD")})</li>`; // Format each transaction in a list item
              })
              .join("")}
          </ul>
        </body>
      </html>
    `;

    // Launch Puppeteer to create a PDF from the HTML content
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate the PDF
    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close(); // Close the Puppeteer browser

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=izvestaj-${month}-${year}.pdf` // Set the filename for the PDF
    );
    res.send(pdfBuffer); // Send the PDF file as the response
  } catch (error) {
    res.status(500).json({ msg: error.message }); // In case of error, send an error message with status 500
  }
};
