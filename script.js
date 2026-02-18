/**
 * ELITE REGISTRY - COMPLETE SYSTEM SCRIPT (Cookie-based Auth)
 * Version: 2.2.0
 * Includes: Auth, CRUD, Avatar Initials, Reports
 */

// --- 1. GLOBAL STATE & CONFIGURATION ---
let editId = null;
let foreclosureData = []; // Holds database records
const API_BASE_URL = "https://ped-foreclosure-back.onrender.com/api/v1";

/**
 * Utility: Format ISO dates to DD-MM-YYYY
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// --- 2. AUTHENTICATION & PROFILE ---
const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Auth Failed");

    // Save user name for avatar display
    const displayName = result.data.user?.name || "User";
    localStorage.setItem("userFullName", displayName);

    window.location.replace("dashboard.html");
  } catch (error) {
    alert("Authentication Failed: " + error.message);
  }
};

const checkAuth = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/foreclosures`, {
      credentials: "include",
    });
    if (res.status === 401) {
      window.location.replace("index.html");
      return false;
    }
    return true;
  } catch (err) {
    window.location.replace("index.html");
    return false;
  }
};

window.logout = async function () {
  await fetch(`${API_BASE_URL}/users/logout`, { credentials: "include" });
  localStorage.removeItem("userFullName");
  window.location.replace("index.html");
};

/**
 * Generates Avatar Initials (e.g., Ayantu Kassahun -> AK)
 */
function updateAvatarUI() {
  const fullName = localStorage.getItem("userFullName") || "User";
  const container = document.getElementById("user-avatar-container");
  if (container) {
    const parts = fullName.trim().split(/\s+/);
    const initials =
      parts.length > 1
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].substring(0, 2);
    container.innerHTML = `<div class="avatar-circle" title="${fullName}">${initials.toUpperCase()}</div>`;
  }
}

// --- 3. DATA CORE (CRUD OPERATIONS) ---
window.loadDataFromDB = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/foreclosures`, {
      credentials: "include",
    });
    if (response.status === 401) return logout();

    const result = await response.json();
    foreclosureData = result.data?.data || result.data || [];
    console.log("Loaded foreclosureData:", foreclosureData);
    render();
  } catch (error) {
    console.error("Fetch error:", error);
  }
};

window.deleteData = async (id) => {
  if (!confirm("Are you sure you want to permanently delete this record?"))
    return;
  try {
    const resp = await fetch(`${API_BASE_URL}/foreclosures/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (resp.ok) await window.loadDataFromDB();
    else alert("Delete failed.");
  } catch (err) {
    console.error("Delete error:", err);
  }
};

window.openEdit = (id) => {
  editId = id;
  const item = foreclosureData.find((x) => (x._id || x.id) === id);
  if (!item) return;
  document.getElementById("modalTitle").textContent = "Edit Record";
  document.getElementById("progressiveSection").style.display = "block";
  document.getElementById("applicant").value = item.applicantName || "";
  document.getElementById("branch").value = item.branch || "";
  document.getElementById("location").value = item.siteLocation || "";
  document.getElementById("collateral-type").value =
    item.collateralType || "building";
  document.getElementById("num-collateral").value =
    item.numberOfCollaterals || 0;
  document.getElementById("req-date").value = item.dateOfRequest
    ? item.dateOfRequest.split("T")[0]
    : "";
  document.getElementById("app-date").value = item.dateOfAppointment
    ? item.dateOfAppointment.split("T")[0]
    : "";
  document.getElementById("reported-date").value = item.dateOfReport
    ? item.dateOfReport.split("T")[0]
    : "";
  document.getElementById("engineer").value = item.engineerName || "";
  document.getElementById("status").value = item.reportStatus || "pending";
  document.getElementById("remark").value = item.remarks || "";
  document.getElementById("modalOverlay").style.display = "flex";
};

async function handleSaveData(e) {
  if (e) e.preventDefault();
  const payload = {
    applicantName: document.getElementById("applicant").value,
    branch: document.getElementById("branch").value,
    siteLocation: document.getElementById("location").value,
    collateralType: document.getElementById("collateral-type").value,
    numberOfCollaterals:
      parseInt(document.getElementById("num-collateral").value) || 0,
    dateOfRequest: document.getElementById("req-date").value,
    dateOfAppointment: document.getElementById("app-date").value,
    dateOfReport: document.getElementById("reported-date").value,
    engineerName: document.getElementById("engineer").value,
    reportStatus: document.getElementById("status").value,
    remarks: document.getElementById("remark").value,
  };
  const url = editId
    ? `${API_BASE_URL}/foreclosures/${editId}`
    : `${API_BASE_URL}/foreclosures`;
  const method = editId ? "PATCH" : "POST";
  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    if (!response.ok) throw new Error("Save operation failed");
    window.closeModal();
    await window.loadDataFromDB();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// --- 4. UI RENDERING ---
function render(dataToRender = foreclosureData) {
  const desktopTableBody = document.getElementById("desktop-body");
  const mobileContainer = document.getElementById("mobile-cards-container");
  if (desktopTableBody) desktopTableBody.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";

  dataToRender
    .slice()
    .reverse()
    .forEach((item) => {
      const statusRaw = (item.reportStatus || "pending").toLowerCase().trim();
      const s = statusRaw.replace(/\s+/g, "-");
      const id = item._id || item.id;

      if (desktopTableBody) {
        desktopTableBody.innerHTML += `
        <tr>
          <td><b>${item.applicantName}</b></td>
          <td>${item.branch}</td>
          <td>${item.siteLocation}</td>
          <td>${item.collateralType}</td>
          <td>${item.numberOfCollaterals}</td>
          <td>${formatDate(item.dateOfRequest)}</td>
          <td>${formatDate(item.dateOfAppointment)}</td>
          <td>${item.engineerName || ""}</td>
          <td><span class="pill ${s}">${s}</span></td>
          <td>${formatDate(item.dateOfReport)}</td>
          <td>${item.remarks || ""}</td>
          <td>
            <div class="actions">
              <button class="act-btn e-btn" onclick="openEdit('${id}')">Edit</button>
              <button class="act-btn d-btn" onclick="deleteData('${id}')">Delete</button>
            </div>
          </td>
        </tr>`;
      }

      if (mobileContainer) {
        mobileContainer.innerHTML += `
        <div class="card">
          <div class="card-header">
            <div><h3 class="card-title">${item.applicantName}</h3><div class="card-subtitle">${item.branch}</div></div>
            <span class="pill ${s}">${s}</span>
          </div>
          <div class="actions">
            <button class="act-btn e-btn" onclick="openEdit('${id}')">Edit</button>
            <button class="act-btn d-btn" onclick="deleteData('${id}')">Delete</button>
          </div>
        </div>`;
      }
    });
  updateStatsCounters();
}

function updateStatsCounters() {
  let stats = {
    total: 0,
    reported: 0,
    "in-progress": 0,
    pending: 0,
    canceled: 0,
  };
  foreclosureData.forEach((item) => {
    stats.total++;
    const s = (item.reportStatus || "pending")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
    if (stats.hasOwnProperty(s)) stats[s]++;
    else if (s.includes("reported")) stats.reported++;
    else if (s.includes("progress")) stats["in-progress"]++;
    else if (s.includes("cancel")) stats.canceled++;
    else stats.pending++;
  });
  ["total", "reported", "pending", "canceled", "in-progress"].forEach((k) => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.innerText = stats[k];
  });
}

// --- 5. DETAILED REPORTS & PDF EXPORT (FIXED UTC ISSUE) ---
// --- UTC Date Helper ---
function parseDateAsUTC(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)); // UTC midnight
}

// --- 5. DETAILED REPORTS & PDF EXPORT (UTC-FIXED) ---
window.runCustomReport = function (reportTitle) {
  const startVal = document.getElementById("start-date").value;
  const endVal = document.getElementById("end-date").value;
  const display = document.getElementById("active-report-display");

  if (!startVal || !endVal) return alert("Please select a valid date range.");

  const startDate = parseDateAsUTC(startVal);
  const endDate = parseDateAsUTC(endVal);
  endDate.setUTCHours(23, 59, 59, 999); // End of day in UTC

  const filtered = foreclosureData.filter((item) => {
    if (!item.dateOfRequest) return false;
    const itemDate = new Date(item.dateOfRequest); // UTC from DB
    console.log("DB:", item.dateOfRequest, "Parsed:", itemDate);
    console.log("Start:", startDate, "End:", endDate);
    return itemDate >= startDate && itemDate <= endDate;
  });

  const total = filtered.length;

  if (total === 0) {
    display.innerHTML = `<div class="summary-card" style="border-left: 6px solid #f59e0b;">
      <h3>No Records Found</h3>
      <p>Checked ${foreclosureData.length} records, none matched ${formatDate(startVal)} to ${formatDate(endVal)}.</p>
    </div>`;
    return;
  }

  // Count statuses
  let counts = { reported: 0, pending: 0, canceled: 0, "in-progress": 0 };
  filtered.forEach((item) => {
    let s = (item.reportStatus || "pending")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
    if (s.includes("reported")) counts.reported++;
    else if (s.includes("progress")) counts["in-progress"]++;
    else if (s.includes("cancel")) counts.canceled++;
    else counts.pending++;
  });

  const getPct = (c) => (total > 0 ? ((c / total) * 100).toFixed(1) : "0.0");

  display.innerHTML = `
    <div class="summary-card">
      <h2 style="color:var(--primary); margin-bottom:5px;">${reportTitle}</h2>
      <p style="color:#64748b; margin-bottom:20px;">Range: ${formatDate(startVal)} to ${formatDate(endVal)}</p>
      <div style="background:#f1f5f9; padding:20px; border-radius:12px; text-align:center; margin-bottom:25px;">
        <div style="font-size:0.8rem; text-transform:uppercase; color:#64748b;">Total Requests in Period</div>
        <div style="font-size:2.5rem; font-weight:bold; color:var(--primary);">${total}</div>
      </div>
      <div style="display:grid; gap:12px;">
        ${renderStatRow("Completed / Reported", counts.reported, getPct(counts.reported), "#16a34a")}
        ${renderStatRow("In Progress", counts["in-progress"], getPct(counts["in-progress"]), "#ca8a04")}
        ${renderStatRow("Pending", counts.pending, getPct(counts.pending), "#2563eb")}
        ${renderStatRow("Canceled", counts.canceled, getPct(counts.canceled), "#dc2626")}
      </div>
      <button class="btn btn-add" style="width:100%; margin-top:25px; height:50px; font-weight:bold;"
        onclick="exportToPDF('${reportTitle}', '${startVal}', '${endVal}')">DOWNLOAD PDF REPORT</button>
    </div>`;
};

window.exportToPDF = function (title, startDate, endDate) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");

  const start = parseDateAsUTC(startDate);
  const end = parseDateAsUTC(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const filtered = foreclosureData.filter((item) => {
    if (!item.dateOfRequest) return false;
    const itemDate = new Date(item.dateOfRequest);
    return itemDate >= start && itemDate <= end;
  });

  if (filtered.length === 0) {
    alert("No records found for the selected date range.");
    return;
  }

  doc.setFontSize(16);
  doc.text(`Foreclosure Report - ${title}`, 14, 15);

  const tableBody = filtered.map((i) => [
    i.applicantName || "",
    i.branch || "",
    i.siteLocation || "",
    i.collateralType || "",
    i.numberOfCollaterals || 0,
    formatDate(i.dateOfRequest),
    formatDate(i.dateOfReport),
    i.reportStatus || "pending",
  ]);

  doc.autoTable({
    startY: 25,
    head: [
      [
        "Applicant",
        "Branch",
        "Location",
        "Type",
        "Number of Collaterals",
        "Date Requested",
        "Date Reported",
        "Status",
      ],
    ],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [2, 0, 102] },
    styles: { fontSize: 10 },
  });

  doc.save(`${title}.pdf`);
};

// --- 6. MODAL UTILITIES ---
window.closeModal = () => {
  document.getElementById("modalOverlay").style.display = "none";
  editId = null;
};

// --- 7. EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  updateAvatarUI();

  const menuBtn = document.getElementById("mobile-menu-btn");
  const navLinks = document.getElementById("nav-links");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navLinks.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && e.target !== menuBtn)
        navLinks.classList.remove("active");
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login(
        document.getElementById("username").value,
        document.getElementById("password").value,
      );
    });
  }

  const openAddBtn = document.getElementById("openAddModal");
  if (openAddBtn) {
    openAddBtn.addEventListener("click", () => {
      editId = null;
      document.getElementById("modalTitle").textContent = "Add New Data";
      document.getElementById("progressiveSection").style.display = "none";
      document
        .querySelectorAll(".modal-box input, .modal-box textarea")
        .forEach((i) => (i.value = ""));
      document.getElementById("status").value = "pending";
      document.getElementById("modalOverlay").style.display = "flex";
    });
  }

  const saveBtn = document.getElementById("saveData");
  if (saveBtn) saveBtn.addEventListener("click", handleSaveData);

  const findTxt = document.getElementById("find-txt");
  if (findTxt) {
    findTxt.addEventListener("input", () => {
      const term = findTxt.value.toLowerCase();
      const filtered = foreclosureData.filter(
        (i) =>
          i.applicantName?.toLowerCase().includes(term) ||
          i.branch?.toLowerCase().includes(term),
      );
      render(filtered);
    });
  }

  // Real authentication check before loading data
  if (
    document.getElementById("desktop-body") ||
    document.getElementById("mobile-cards-container")
  ) {
    checkAuth().then((ok) => {
      if (ok) window.loadDataFromDB();
    });
  }
});

window.onclick = function (event) {
  if (event.target == document.getElementById("modalOverlay"))
    window.closeModal();
};
