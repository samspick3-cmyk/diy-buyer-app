const STORAGE_KEY = "diy-supply-buyer-jobs";

const ITEM_NAMES = [
  "Windows",
  "Exterior Doors",
  "French Doors",
  "Ranch Sliders",
  "Bifold Doors",
  "Timber Joinery",
  "Aluminium Joinery",
  "Hardware Lot",
  "Other",
];

const fields = {
  name: document.getElementById("customer-name"),
  phone: document.getElementById("phone"),
  address: document.getElementById("address"),
  notes: document.getElementById("notes"),
};

const itemsEl = document.getElementById("items");
const grandTotalEl = document.getElementById("grand-total");
const jobMetaEl = document.getElementById("job-meta");
const jobView = document.getElementById("job-view");
const jobsView = document.getElementById("jobs-view");
const jobsListEl = document.getElementById("jobs-list");
const searchEl = document.getElementById("job-search");
const toastEl = document.getElementById("toast");

let currentJobId = null;
let itemInputs = [];

function money(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
  }).format(Number(value) || 0);
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function loadJobs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function createJobId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `JOB-${stamp}-${rand}`;
}

function emptyItems() {
  return ITEM_NAMES.map((name) => ({
    name,
    quantity: "",
    buyPrice: "",
  }));
}

function renderItems(items) {
  itemsEl.innerHTML = "";
  itemInputs = items.map((item, index) => {
    const row = document.createElement("article");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-name">${item.name}</div>
      <div class="item-grid">
        <label>
          Quantity
          <input data-field="quantity" inputmode="decimal" type="number" min="0" step="1" value="${item.quantity}" />
        </label>
        <label>
          Buy Price Each
          <input data-field="buyPrice" inputmode="decimal" type="number" min="0" step="0.01" value="${item.buyPrice}" />
        </label>
        <div class="line-total">
          <span>Line Total</span>
          <span data-line-total>${money(0)}</span>
        </div>
      </div>
    `;
    itemsEl.appendChild(row);
    const qty = row.querySelector('[data-field="quantity"]');
    const price = row.querySelector('[data-field="buyPrice"]');
    const total = row.querySelector("[data-line-total]");
    qty.addEventListener("input", updateTotals);
    price.addEventListener("input", updateTotals);
    return { name: item.name, qty, price, total, index };
  });
  updateTotals();
}

function updateTotals() {
  let grand = 0;
  itemInputs.forEach((item) => {
    const line = parseNumber(item.qty.value) * parseNumber(item.price.value);
    item.total.textContent = money(line);
    grand += line;
  });
  grandTotalEl.textContent = money(grand);
  return grand;
}

function collectJob() {
  return {
    id: currentJobId || createJobId(),
    customerName: fields.name.value.trim(),
    phone: fields.phone.value.trim(),
    address: fields.address.value.trim(),
    notes: fields.notes.value.trim(),
    items: itemInputs.map((item) => ({
      name: item.name,
      quantity: item.qty.value,
      buyPrice: item.price.value,
    })),
    total: updateTotals(),
    savedAt: new Date().toISOString(),
  };
}

function fillJob(job) {
  currentJobId = job.id;
  fields.name.value = job.customerName || "";
  fields.phone.value = job.phone || "";
  fields.address.value = job.address || "";
  fields.notes.value = job.notes || "";
  renderItems(job.items?.length ? job.items : emptyItems());
  if (job.id && job.savedAt) {
    jobMetaEl.hidden = false;
    jobMetaEl.textContent = `Job ID ${job.id} · Saved ${formatDate(job.savedAt)}`;
  } else {
    jobMetaEl.hidden = true;
  }
}

function resetJob() {
  currentJobId = null;
  fillJob({
    id: null,
    customerName: "",
    phone: "",
    address: "",
    notes: "",
    items: emptyItems(),
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-NZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

function showJobView() {
  jobView.hidden = false;
  jobsView.hidden = true;
}

function showJobsView() {
  jobView.hidden = true;
  jobsView.hidden = false;
  searchEl.value = "";
  renderJobsList();
  searchEl.focus();
}

function renderJobsList() {
  const query = searchEl.value.trim().toLowerCase();
  const jobs = loadJobs()
    .slice()
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .filter((job) => {
      if (!query) return true;
      return [job.customerName, job.address, job.id, job.phone]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  if (!jobs.length) {
    jobsListEl.innerHTML = `<p class="empty">${query ? "No jobs match that search." : "No saved jobs yet."}</p>`;
    return;
  }

  jobsListEl.innerHTML = "";
  jobs.forEach((job) => {
    const card = document.createElement("article");
    card.className = "job-card";
    card.innerHTML = `
      <h3>${job.customerName || "Unnamed customer"}</h3>
      <p>${job.address || "No address"}</p>
      <p>Saved ${formatDate(job.savedAt)}</p>
      <p>Job ID ${job.id}</p>
      <p class="job-value">${money(job.total)}</p>
      <button type="button" class="btn btn-primary">Reopen Job</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      fillJob(job);
      showJobView();
      showToast("Job reopened");
    });
    jobsListEl.appendChild(card);
  });
}

document.getElementById("save-job").addEventListener("click", () => {
  const job = collectJob();
  if (!job.customerName && !job.address) {
    showToast("Add a customer name or address before saving");
    return;
  }
  const jobs = loadJobs();
  const index = jobs.findIndex((existing) => existing.id === job.id);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }
  saveJobs(jobs);
  currentJobId = job.id;
  jobMetaEl.hidden = false;
  jobMetaEl.textContent = `Job ID ${job.id} · Saved ${formatDate(job.savedAt)}`;
  showToast("Job saved on this phone");
});

document.getElementById("new-job").addEventListener("click", () => {
  const hasData =
    fields.name.value ||
    fields.phone.value ||
    fields.address.value ||
    fields.notes.value ||
    itemInputs.some((item) => item.qty.value || item.price.value);
  if (hasData && !confirm("Start a new job? Unsaved changes will be lost.")) {
    return;
  }
  resetJob();
  showJobView();
  showToast("New job started");
});

document.getElementById("view-jobs").addEventListener("click", showJobsView);
document.getElementById("back-to-job").addEventListener("click", showJobView);
searchEl.addEventListener("input", renderJobsList);

resetJob();
