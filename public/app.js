// Get elements from the DOM
const form = document.getElementById("transaction-form"); // The form element for submitting transactions
const typeInput = document.getElementById("type"); // Input for the type of transaction (income or expense)
const amountInput = document.getElementById("amount"); // Input for the amount of the transaction
const descriptionInput = document.getElementById("description"); // Input for the description of the transaction
const dateInput = document.getElementById("date"); // Input for the transaction date
const currencyInput = document.getElementById("currency"); // Input for the currency of the transaction
const transactionList = document.getElementById("transaction-list"); // The list element where transactions will be displayed
const monthInput = document.getElementById("month"); // Input for the month to view the summary
const yearInput = document.getElementById("year"); // Input for the year to view the summary
const loadSummaryBtn = document.getElementById("load-summary"); // Button to load the monthly summary
const incomeSpan = document.getElementById("income"); // Span element for displaying total income
const expenseSpan = document.getElementById("expense"); // Span element for displaying total expenses
const monthlyTransactions = document.getElementById("monthly-transactions"); // The list element for displaying monthly transactions
const downloadPdfBtn = document.getElementById("download-pdf"); // Button to download the monthly summary as a PDF

// Set the default date input to today's date (ISO format)
dateInput.value = new Date().toISOString().split("T")[0];

// Read the current page and limit values from the URL, default to 1 and 10 if not present
const urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get("page")) || 1;
const limit = parseInt(urlParams.get("limit")) || 10;

// Handle form submission to add a new transaction
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Prevent form from submitting normally

  const transaction = {
    type: typeInput.value, // Get the type of the transaction
    amount: parseFloat(amountInput.value), // Parse the amount to a float
    description: descriptionInput.value, // Get the description
    date: dateInput.value, // Get the date
    currency: currencyInput.value, // Get the currency
  };

  try {
    // Send the transaction data to the server to be added
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    // Clear the form fields after the transaction is added
    amountInput.value = "";
    descriptionInput.value = "";

    // Reload transactions to reflect the newly added transaction
    fetchTransactions(currentPage);
  } catch (err) {
    console.error("Error adding transaction:", err);
  }
});

// Fetch and display transactions with pagination
async function fetchTransactions(page) {
  try {
    // Fetch transactions for the current page and limit
    const res = await fetch(`/api/transactions?page=${page}&limit=${limit}`);
    const data = await res.json();

    // Clear the current transaction list
    transactionList.innerHTML = "";

    // Loop through the transactions and display them
    data.transactions.forEach((t) => {
      const li = document.createElement("li");
      li.classList.add(t.type); // Add a class based on the transaction type (income or expense)

      const typeLabel =
        t.type.toUpperCase() === "INCOME" ? "Pozajmio" : "Pozajmica"; // Label based on transaction type
      const currencyLabel =
        t.currency !== "thing" ? ` ${t.currency.toUpperCase()}` : ""; // Add currency symbol if it's not "thing"

      li.textContent = `${typeLabel}: ${t.amount}${currencyLabel} - ${
        t.description
      } (${new Date(t.date).toLocaleDateString("sr-RS")})`; // Display the transaction details

      transactionList.appendChild(li); // Append the transaction to the list
    });

    // Update pagination controls
    updatePaginationControls(data.currentPage, data.totalPages);

    // Fetch and display the monthly summary
    fetchMonthlySummary(yearInput.value, monthInput.value);
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }
}

// Update pagination controls based on the current page and total pages
function updatePaginationControls(currentPage, totalPages) {
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageNumber = document.getElementById("page-number");

  pageNumber.textContent = `Strana ${currentPage}`; // Display the current page number

  // Disable the Previous button if we're on the first page
  prevBtn.disabled = currentPage === 1;

  // Disable the Next button if we're on the last page
  nextBtn.disabled = currentPage === totalPages;
}

// Update the URL parameters for pagination
function updateUrlParams(page, limit) {
  const url = new URL(window.location);
  url.searchParams.set("page", page); // Set the page parameter
  url.searchParams.set("limit", limit); // Set the limit parameter
  window.history.pushState({}, "", url); // Update the URL without reloading the page
}

// Handle Previous page and Next page button clicks
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--; // Decrease the current page number
    updateUrlParams(currentPage, limit); // Update the URL parameters
    fetchTransactions(currentPage); // Fetch transactions for the new page
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  currentPage++; // Increase the current page number
  updateUrlParams(currentPage, limit); // Update the URL parameters
  fetchTransactions(currentPage); // Fetch transactions for the new page
});

// Load the monthly summary when the user clicks the "Load Summary" button
loadSummaryBtn.addEventListener("click", () => {
  const month = monthInput.value; // Get the selected month
  const year = yearInput.value; // Get the selected year
  fetchMonthlySummary(year, month); // Fetch and display the monthly summary
});

// Helper function to format the summary by currency
const formatSummary = (summaryObj) => {
  return Object.entries(summaryObj)
    .map(([currency, amount]) => {
      const label = currency === "thing" ? "Stvar(i)" : currency.toUpperCase(); // Adjust label for "thing"
      return `${amount} ${label}`; // Return the formatted summary string
    })
    .join(", "); // Join multiple entries with commas
};

// Fetch and display the monthly summary for a specific month and year
async function fetchMonthlySummary(year, month) {
  try {
    // Fetch the summary data from the server
    const res = await fetch(`/api/transactions/summary/${month}/${year}`);
    const data = await res.json();

    // Format and display total income and expense by currency
    incomeSpan.textContent = `Pozajmio: ${formatSummary(data.income)}`;
    expenseSpan.textContent = `Pozajmica: ${formatSummary(data.expense)}`;

    // Display the transactions for the month
    monthlyTransactions.innerHTML = "";
    data.transactions.forEach((t) => {
      const li = document.createElement("li");
      li.classList.add(t.type); // Add class based on the transaction type

      const typeLabel =
        t.type.toUpperCase() === "INCOME" ? "Pozajmio" : "Pozajmica"; // Label based on transaction type
      const currencyLabel =
        t.currency !== "thing" ? ` ${t.currency.toUpperCase()}` : ""; // Add currency symbol if needed

      li.textContent = `${typeLabel}: ${t.amount}${currencyLabel} - ${
        t.description
      } (${new Date(t.date).toLocaleDateString("sr-RS")})`; // Display transaction details

      monthlyTransactions.appendChild(li); // Append the transaction to the list
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
  }
}

// Download the monthly summary as a PDF when the user clicks the download button
downloadPdfBtn.addEventListener("click", () => {
  const month = monthInput.value; // Get the selected month
  const year = yearInput.value; // Get the selected year
  window.open(`/api/transactions/summary/${month}/${year}/pdf`, "_blank"); // Open the PDF in a new tab
});

// Load the initial transactions and monthly summary on page load
fetchTransactions(currentPage);

// Set the default month and year to the current month and year
const today = new Date();
monthInput.value = today.getMonth() + 1; // JS months are 0-based, so add 1
yearInput.value = today.getFullYear(); // Set the year to the current year

// Fetch and display the monthly summary for the current month and year
fetchMonthlySummary(yearInput.value, monthInput.value);
