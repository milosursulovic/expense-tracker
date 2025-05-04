// ==== DOM ELEMENTS ====

// Transaction form and its input fields
const form = document.getElementById("transaction-form");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");
const descriptionInput = document.getElementById("description");
const dateInput = document.getElementById("date");
const currencyInput = document.getElementById("currency");

// Transaction display elements
const transactionList = document.getElementById("transaction-list");
const monthlyTransactions = document.getElementById("monthly-transactions");

// Monthly summary UI
const monthInput = document.getElementById("month");
const yearInput = document.getElementById("year");
const loadSummaryBtn = document.getElementById("load-summary");
const incomeSpan = document.getElementById("income");
const expenseSpan = document.getElementById("expense");
const downloadPdfBtn = document.getElementById("download-pdf");

// Search and sorting inputs
const searchInput = document.getElementById("search");
const sortByInput = document.getElementById("sortBy");
const sortOrderInput = document.getElementById("sortOrder");

// ==== URL PARAMETERS ====

// Extract query parameters (search, sort)
const searchParams = new URLSearchParams(window.location.search);
const searchValue = searchParams.get("search") || "";
const sortByValue = searchParams.get("sortBy") || "date";
const sortOrderValue = searchParams.get("sortOrder") || "asc";

// Populate form inputs with URL values
searchInput.value = searchValue;
sortByInput.value = sortByValue;
sortOrderInput.value = sortOrderValue;

// Set default date to today
dateInput.value = new Date().toISOString().split("T")[0];

// Pagination setup
const urlParams = new URLSearchParams(window.location.search);
let currentPage = parseInt(urlParams.get("page")) || 1;
const limit = parseInt(urlParams.get("limit")) || 10;

// ==== FORM SUBMISSION HANDLER ====

// Submits a new transaction to the server
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
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });

    // Clear fields and reload data
    amountInput.value = "";
    descriptionInput.value = "";
    fetchTransactions(currentPage);
  } catch (err) {
    console.error("Error adding transaction:", err);
  }
});

// ==== FETCHING & DISPLAYING TRANSACTIONS ====

// Fetch and render transactions based on current page, search, and sort
async function fetchTransactions(page) {
  const search = searchInput.value;
  const srtBy = sortByInput.value;
  const srtOrder = sortOrderInput.value;

  try {
    const res = await fetch(
      `/api/transactions?page=${page}&limit=${limit}&search=${search}&sortBy=${srtBy}&sortOrder=${srtOrder}`
    );
    const data = await res.json();

    // Allow page reset when sort by or sort order changes
    let newPage = page === undefined ? 1 : page;

    // Update URL parameters
    const params = new URLSearchParams({
      page: newPage,
      limit,
      search: data.searchQuery,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder,
    });
    history.replaceState(null, "", `/?${params.toString()}`);

    // Render transactions
    transactionList.innerHTML = "";
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

      // Dugme za brisanje
      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-btn");
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => deleteTransaction(t._id));
      li.appendChild(deleteBtn);

      transactionList.appendChild(li);
    });

    // Update pagination and summary
    updatePaginationControls(data.currentPage, data.totalPages);
    fetchMonthlySummary(yearInput.value, monthInput.value);
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }
}

// ==== PAGINATION HANDLERS ====

// Update "Previous" and "Next" buttons
function updatePaginationControls(currentPage, totalPages) {
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const pageNumber = document.getElementById("page-number");

  pageNumber.textContent = `Strana ${currentPage} od ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// Update URL with new pagination values
function updateUrlParams(page, limit) {
  const url = new URL(window.location);
  url.searchParams.set("page", page);
  url.searchParams.set("limit", limit);
  window.history.pushState({}, "", url);
}

// Navigate to previous page
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    updateUrlParams(currentPage, limit);
    fetchTransactions(currentPage);
  }
});

// Navigate to next page
document.getElementById("next-page").addEventListener("click", () => {
  currentPage++;
  updateUrlParams(currentPage, limit);
  fetchTransactions(currentPage);
});

// ==== SUMMARY FUNCTIONS ====

// Load summary when "Load Summary" is clicked
loadSummaryBtn.addEventListener("click", () => {
  fetchMonthlySummary(yearInput.value, monthInput.value);
});

// Helper: Format income/expense summary for display
const formatSummary = (summaryObj) => {
  return Object.entries(summaryObj)
    .map(([currency, amount]) => {
      const label = currency === "thing" ? "Stvar(i)" : currency.toUpperCase();
      return `${amount} ${label}`;
    })
    .join(", ");
};

// Fetch and display monthly summary and transactions
async function fetchMonthlySummary(year, month) {
  try {
    const res = await fetch(`/api/transactions/summary/${month}/${year}`);
    const data = await res.json();

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

      // Dugme za brisanje
      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-btn");
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => deleteTransaction(t._id));
      li.appendChild(deleteBtn);

      monthlyTransactions.appendChild(li);
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
  }
}

async function deleteTransaction(id) {
  if (!confirm("Da li ste sigurni da želite da obrišete ovu transakciju?"))
    return;

  try {
    await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });

    // Ponovno učitavanje podataka
    fetchTransactions(currentPage);
    fetchMonthlySummary(yearInput.value, monthInput.value);
  } catch (err) {
    console.error("Greška pri brisanju transakcije:", err);
  }
}

// Download monthly summary as PDF
downloadPdfBtn.addEventListener("click", () => {
  const month = monthInput.value;
  const year = yearInput.value;
  window.open(`/api/transactions/summary/${month}/${year}/pdf`, "_blank");
});

// ==== INITIAL PAGE LOAD ====

// Set default month and year
const today = new Date();
monthInput.value = today.getMonth() + 1; // JavaScript months are 0-based
yearInput.value = today.getFullYear();

// Load initial data
fetchTransactions(currentPage);
fetchMonthlySummary(yearInput.value, monthInput.value);
