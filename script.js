// --- 1. GLOBAL STATE & CONFIGURATION ---
let editId = null;
// let foreclosureData = []; // Holds database records
const API_BASE_URL = "https://ped-foreclosure-back.onrender.com/api/v1";
// Ensure this is global
window.foreclosureData = window.foreclosureData || [];
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

// --- Avatar Initials ---
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
    const result = await response.json();

    // Explicitly attach to window
    window.foreclosureData = result.data?.data || result.data || [];

    console.log("Sync Complete. Records:", window.foreclosureData.length);
    render(window.foreclosureData);
  } catch (error) {
    console.error("Sync Error:", error);
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
  const item = window.foreclosureData.find((x) => (x._id || x.id) === id);
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
      method,
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
function render(dataToRender) {
  const data = dataToRender || window.foreclosureData;

  const desktopTableBody = document.getElementById("desktop-body");
  const mobileContainer = document.getElementById("mobile-cards-container");

  if (desktopTableBody) desktopTableBody.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";

  if (!data || data.length === 0) {
    console.log("Render received empty data");
    return;
  }

  data
    .slice()
    .reverse()
    .forEach((item) => {
      const statusRaw = (item.reportStatus || "pending").toLowerCase().trim();
      const s = statusRaw.replace(/\s+/g, "-");
      const id = item._id;

      // ===== DESKTOP TABLE =====
      if (desktopTableBody) {
        const row = document.createElement("tr");

        row.innerHTML = `
        <td><b>${item.applicantName || ""}</b></td>
        <td>${item.branch || ""}</td>
        <td>${item.siteLocation || ""}</td>
        <td>${item.collateralType || ""}</td>
        <td>${item.numberOfCollaterals || 0}</td>
        <td>${formatDate(item.dateOfRequest)}</td>
        <td>${formatDate(item.dateOfAppointment)}</td>
        <td>${item.engineerName || ""}</td>
        <td>${formatDate(item.dateOfReport)}</td>
        <td><span class="pill ${s}">${s}</span></td>
        <td>
        <td>${item.remarks || ""}</td>
        </td>
        <td>
        <div class="actions">
        <button class="act-btn e-btn" onclick="openEdit('${id}')">Edit</button>
        <button class="act-btn d-btn" onclick="deleteData('${id}')">Delete</button>
        </div>
        </td>
      `;

        desktopTableBody.prepend(row);
      }

      // ===== MOBILE CARDS =====
      if (mobileContainer) {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
        <div class="card-header">
          <div>
            <h3 class="card-title">${item.applicantName || ""}</h3>
            <div class="card-subtitle">${item.branch || ""}</div>
          </div>
          <span class="pill ${s}">${s}</span>
        </div>

        <div class="card-body">
          <p><b>Location:</b> ${item.siteLocation || ""}</p>
          <p><b>Type:</b> ${item.collateralType || ""}</p>
          <p><b>Qty:</b> ${item.numberOfCollaterals || 0}</p>
          <p><b>Requested:</b> ${formatDate(item.dateOfRequest)}</p>
          <p><b>Reported:</b> ${formatDate(item.dateOfReport)}</p>
        </div>

        <div class="actions">
          <button class="act-btn e-btn" onclick="openEdit('${id}')">Edit</button>
          <button class="act-btn d-btn" onclick="deleteData('${id}')">Delete</button>
        </div>
      `;

        mobileContainer.appendChild(card);
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

// --- 5. DETAILED REPORTS & PDF EXPORT (UTC-SAFE) ---
// --- UTC Helper ---
function parseFormDateToUTC(dateStr, endOfDay = false) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (endOfDay) {
    return Date.UTC(y, m - 1, d, 23, 59, 59, 999); // End of day UTC
  }
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0); // Start of day UTC
}

// --- Run Custom Report (AMENDED) ---

window.runCustomReport = function (reportTitle) {
  // 1. Initialize display immediately to prevent 'ReferenceError'
  const display = document.getElementById("active-report-display");
  const startVal = document.getElementById("start-date").value;
  const endVal = document.getElementById("end-date").value;

  if (!display) return;

  // 2. Access the data via the global window object
  // This ensures the report sees exactly what the dashboard sees
  const data = window.foreclosureData || [];

  if (data.length === 0) {
    display.innerHTML = `
      <div class="summary-card" style="border-left: 6px solid #dc2626;">
        <h3 style="color:#dc2626;">Data Sync Error</h3>
        <p>The dashboard shows records, but the report variable is empty. 
        Please click the button below to force a data sync.</p>
        <button class="btn btn-util" onclick="window.loadDataFromDB()">SYNC DATA NOW</button>
      </div>`;
    return;
  }

  if (!startVal || !endVal) return alert("Please select a valid date range.");

  // 3. UTC Safe Parsing
  const startUTC = parseFormDateToUTC(startVal);
  const endUTC = parseFormDateToUTC(endVal, true);

  // 4. Filtering
  const filtered = data.filter((item) => {
    if (!item.dateOfRequest) return false;
    const itemUTC = new Date(item.dateOfRequest).getTime();
    return itemUTC >= startUTC && itemUTC <= endUTC;
  });

  const total = filtered.length;

  if (total === 0) {
    display.innerHTML = `
      <div class="summary-card" style="border-left: 6px solid #f59e0b;">
        <h3>No Records Found</h3>
        <p>Checked <b>${data.length}</b> total records in the system. 
        None matched the range: ${formatDate(startVal)} to ${formatDate(endVal)}.</p>
      </div>`;
    return;
  }

  // 5. FULL STATS CALCULATIONS (UNOMITTED)
  let counts = { reported: 0, pending: 0, canceled: 0, "in-progress": 0 };

  filtered.forEach((item) => {
    let s = (item.reportStatus || "pending")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    if (s.includes("reported") || s === "completed") counts.reported++;
    else if (s.includes("progress")) counts["in-progress"]++;
    else if (s.includes("cancel")) counts.canceled++;
    else counts.pending++;
  });

  const getPct = (c) => (total > 0 ? ((c / total) * 100).toFixed(1) : "0.0");

  // 6. RENDER SUMMARY
  display.innerHTML = `
    <div class="summary-card">
      <h2 style="color:var(--primary); margin-bottom:5px;">${reportTitle}</h2>
      <p style="color:#64748b; margin-bottom:20px;">Range: ${formatDate(startVal)} to ${formatDate(endVal)}</p>
      
      <div style="background:#f1f5f9; padding:20px; border-radius:12px; text-align:center; margin-bottom:25px; border:1px solid #e2e8f0;">
        <div style="font-size:0.8rem; text-transform:uppercase; color:#64748b; letter-spacing:1px;">Total Requests in Period</div>
        <div style="font-size:2.8rem; font-weight:bold; color:var(--primary);">${total}</div>
      </div>

      <div style="display:grid; gap:12px;">
        ${renderStatRow("Completed / Reported", counts.reported, getPct(counts.reported), "#16a34a")}
        ${renderStatRow("In Progress", counts["in-progress"], getPct(counts["in-progress"]), "#ca8a04")}
        ${renderStatRow("Pending", counts.pending, getPct(counts.pending), "#2563eb")}
        ${renderStatRow("Canceled", counts.canceled, getPct(counts.canceled), "#dc2626")}
      </div>

      <button class="btn btn-add" style="width:100%; margin-top:25px; height:50px; font-weight:bold;"
        onclick="exportToPDF('${reportTitle}', '${startVal}', '${endVal}')">
        DOWNLOAD PDF REPORT
      </button>
    </div>`;
};

// --- Export PDF (FIXED FOR GLOBAL SCOPE) ---
window.exportToPDF = function (title, startDate, endDate) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");

  // 1. Use the UTC Parser to match the report screen logic exactly
  const startUTC = parseFormDateToUTC(startDate);
  const endUTC = parseFormDateToUTC(endDate, true);

  // 2. CRITICAL FIX: Use window.foreclosureData so the records are found
  const data = window.foreclosureData || [];

  const filtered = data.filter((item) => {
    if (!item.dateOfRequest) return false;
    const itemUTC = new Date(item.dateOfRequest).getTime();
    return itemUTC >= startUTC && itemUTC <= endUTC;
  });

  // 3. Safety Check
  if (filtered.length === 0) {
    alert(
      "No records found in global memory for this range. Try clicking SYNC DATA NOW first.",
    );
    return;
  }

  // 4. Build the PDF
  doc.setFontSize(16);
  doc.setTextColor(2, 0, 102); // Elite Registry Blue
  doc.text(`Foreclosure Report - ${title}`, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated on: ${new Date().toLocaleString()} | Range: ${formatDate(startDate)} to ${formatDate(endDate)}`,
    14,
    22,
  );

  const tableBody = filtered.map((i) => [
    i.applicantName || "",
    i.branch || "",
    i.siteLocation || "",
    i.collateralType || "",
    i.numberOfCollaterals || 0,
    formatDate(i.dateOfRequest),
    formatDate(i.dateOfReport),
    (i.reportStatus || "pending").toUpperCase(),
  ]);

  doc.autoTable({
    startY: 28,
    head: [
      [
        "Applicant",
        "Branch",
        "Location",
        "Type",
        "Qty",
        "Requested",
        "Reported",
        "Status",
      ],
    ],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [2, 0, 102], fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // 5. Add a Footer with the count
  const finalY = doc.lastAutoTable.finalY || 30;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Records Found: ${filtered.length}`, 14, finalY + 10);

  doc.save(`${title.replace(/\s+/g, "_")}_Report.pdf`);
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
      const filtered = window.foreclosureData.filter(
        (i) =>
          i.applicantName?.toLowerCase().includes(term) ||
          i.branch?.toLowerCase().includes(term),
      );
      render(filtered);
    });
  }

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
document.querySelector(".btn-cancel").addEventListener("click", closeModal);
function renderStatRow(label, count, pct, color) {
  return `
    <div>
      <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:4px;">
        <span><b>${label}:</b> ${count}</span>
        <span>${pct}%</span>
      </div>
      <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
        <div style="width:${pct}%; background:${color}; height:100%;"></div>
      </div>
    </div>`;
}
