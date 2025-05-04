// Get elements
const form = document.getElementById("transaction-form");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const dateInput = document.getElementById("date");
const currencyInput = document.getElementById("currency");
const transactionList = document.getElementById("transaction-list");
const monthInput = document.getElementById("month");
const yearInput = document.getElementById("year");
const loadSummaryBtn = document.getElementById("load-summary");
const incomeSpan = document.getElementById("income");
const expenseSpan = document.getElementById("expense");
const monthlyTransactions = document.getElementById("monthly-transactions");
const downloadPdfBtn = document.getElementById("download-pdf");

dateInput.value = new Date().toISOString().split("T")[0];

// Read page and limit from URL if present
const urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get("page")) || 1;
const limit = parseInt(urlParams.get("limit")) || 10;

// Handle form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const transaction = {
    type: typeInput.value,
    amount: parseFloat(amountInput.value),
    description: descriptionInput.value,
    date: dateInput.value,
    currency: currencyInput.value,
  };

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    // Clear form
    amountInput.value = "";
    descriptionInput.value = "";

    // Reload transactions
    fetchTransactions(currentPage);
  } catch (err) {
    console.error("Error adding transaction:", err);
  }
});

// Fetch and display transactions with pagination
async function fetchTransactions(page) {
  try {
    const res = await fetch(`/api/transactions?page=${page}&limit=${limit}`);
    const data = await res.json();

    transactionList.innerHTML = "";

    data.transactions.forEach((t) => {
      const li = document.createElement("li");
      li.classList.add(t.type); // Add income or expense class

      const typeLabel =
        t.type.toUpperCase() === "INCOME" ? "Pozajmio" : "Pozajmica";
      const currencyLabel =
        t.currency !== "thing" ? ` ${t.currency.toUpperCase()}` : "";

      li.textContent = `${typeLabel}: ${t.amount}${currencyLabel} - ${
        t.description
      } (${new Date(t.date).toLocaleDateString("sr-RS")})`;

      transactionList.appendChild(li);
    });

    // Update pagination controls
    updatePaginationControls(data.currentPage, data.totalPages);

    fetchMonthlySummary(yearInput.value, monthInput.value);
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }
}

// Update pagination controls
function updatePaginationControls(currentPage, totalPages) {
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageNumber = document.getElementById("page-number");

  pageNumber.textContent = `Strana ${currentPage}`;

  // Disable Previous button if on first page
  prevBtn.disabled = currentPage === 1;

  // Disable Next button if on last page
  nextBtn.disabled = currentPage === totalPages;
}

function updateUrlParams(page, limit) {
  const url = new URL(window.location);
  url.searchParams.set("page", page);
  url.searchParams.set("limit", limit);
  window.history.pushState({}, "", url);
}

// Handle Pagination button clicks
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    updateUrlParams(currentPage, limit);
    fetchTransactions(currentPage);
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  currentPage++;
  updateUrlParams(currentPage, limit);
  fetchTransactions(currentPage);
});

// Load monthly summary
loadSummaryBtn.addEventListener("click", () => {
  const month = monthInput.value;
  const year = yearInput.value;
  fetchMonthlySummary(year, month);
});

// Helper function to format the summary by currency
const formatSummary = (summaryObj) => {
  return Object.entries(summaryObj)
    .map(([currency, amount]) => {
      const label = currency === "thing" ? "Stvar(i)" : currency.toUpperCase();
      return `${amount} ${label}`;
    })
    .join(", ");
};

// Fetch and display monthly summary
async function fetchMonthlySummary(year, month) {
  try {
    const res = await fetch(`/api/transactions/summary/${month}/${year}`);
    const data = await res.json();

    // Format and display total income and expense by currency
    incomeSpan.textContent = `Pozajmio: ${formatSummary(data.income)}`;
    expenseSpan.textContent = `Pozajmica: ${formatSummary(data.expense)}`;

    monthlyTransactions.innerHTML = "";
    data.transactions.forEach((t) => {
      const li = document.createElement("li");
      li.classList.add(t.type);

      const typeLabel =
        t.type.toUpperCase() === "INCOME" ? "Pozajmio" : "Pozajmica";
      const currencyLabel =
        t.currency !== "thing" ? ` ${t.currency.toUpperCase()}` : "";

      li.textContent = `${typeLabel}: ${t.amount}${currencyLabel} - ${
        t.description
      } (${new Date(t.date).toLocaleDateString("sr-RS")})`;

      monthlyTransactions.appendChild(li);
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
  }
}

// Download PDF report
downloadPdfBtn.addEventListener("click", () => {
  const month = monthInput.value;
  const year = yearInput.value;
  window.open(`/api/transactions/summary/${month}/${year}/pdf`, "_blank");
});

// Load initial transactions and monthly summary on page load
fetchTransactions(currentPage);

const today = new Date();
monthInput.value = today.getMonth() + 1; // JS months are 0-based
yearInput.value = today.getFullYear();

fetchMonthlySummary(yearInput.value, monthInput.value);
