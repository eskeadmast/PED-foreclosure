/**
 * ELITE REGISTRY - COMPLETE SYSTEM SCRIPT
 * Full Unomitted Code: Gatekeeper + Auth + CRUD + Reports + Mobile Menu Fix
 */

// --- 1. GATEKEEPER ---
// This handles session security and prevents unauthorized page access.
(function gatekeeper() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const path = window.location.pathname;
  const isAtLogin =
    path.endsWith("index.html") || path === "/" || path.endsWith("/");

  if (!isLoggedIn && !isAtLogin) {
    window.location.replace("index.html");
  } else if (isLoggedIn && isAtLogin) {
    window.location.replace("dashboard.html");
  }
})();

// Global State Variables
let editId = null;
let foreclosureData = [];
const API_BASE_URL = "https://ped-foreclosure-back.onrender.com/api/v1";

// --- 2. UTILITY: DATE FORMATTER ---
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// --- 3. AUTHENTICATION ---
const login = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Auth Failed");

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userFullName", result.data?.user?.name || "User");
    window.location.replace("dashboard.html");
  } catch (error) {
    alert("Authentication Failed: " + error.message);
  }
};

window.logout = function () {
  localStorage.clear();
  window.location.replace("index.html");
};

function updateAvatarUI() {
  const fullName = localStorage.getItem("name") || "User";
  const container = document.getElementById("user-avatar-container");
  if (container) {
    const parts = fullName.trim().split(" ");
    const initials =
      parts.length > 1
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].substring(0, 2);
    // Ensuring it renders as a styled circle via the class avatar-circle
    container.innerHTML = `<div class="avatar-circle" title="${fullName}">${initials.toUpperCase()}</div>`;
  }
}

// --- 4. API OPERATIONS (CRUD) ---
window.loadDataFromDB = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/foreclosures`, {
      credentials: "include",
    });
    if (response.status === 401) return logout();
    const result = await response.json();
    foreclosureData = result.data?.data || result.data || [];
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

    if (resp.ok) {
      await window.loadDataFromDB();
    } else {
      const errData = await resp.json();
      alert("Delete failed: " + (errData.message || "Unknown error"));
    }
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

    alert(editId ? "Record Updated!" : "New Record Added!");
    window.closeModal();
    await window.loadDataFromDB();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// --- 5. RENDER ENGINE ---
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
            <div>
                <h3 class="card-title">${item.applicantName}</h3>
                <div class="card-subtitle">${item.branch} | ${item.siteLocation}</div>
            </div>
            <span class="pill ${s}">${s}</span>
          </div>
          <div class="card-meta">
             <b>Collateral:</b> ${item.collateralType} (${item.numberOfCollaterals})<br>
             <b>Date Req:</b> ${formatDate(item.dateOfRequest)}
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
  });
  ["total", "reported", "pending", "canceled", "in-progress"].forEach((k) => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.innerText = stats[k];
  });
}

// --- FULL REPORT LOGIC: START DATE TO END DATE ---
window.runCustomReport = function (reportTitle) {
  const startInput = document.getElementById("start-date").value; // e.g., "2026-02-17"
  const endInput = document.getElementById("end-date").value; // e.g., "2026-02-18"
  const display = document.getElementById("active-report-display");

  if (!startInput || !endInput) {
    return alert(
      "Please select both a start and end date to generate the report.",
    );
  }

  // 1. NORMALIZE DATE RANGE
  // We set start to 00:00:00 and end to 23:59:59 to capture the FULL days
  const startDate = new Date(startInput);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(endInput);
  endDate.setHours(23, 59, 59, 999);

  // 2. FILTER DATA (Mapping specifically to your 'dateOfRequest')
  const filtered = foreclosureData.filter((item) => {
    if (!item.dateOfRequest) return false;

    // Parse ISO string from DB: "2026-02-17T00:00:00.000+00:00"
    const itemDate = new Date(item.dateOfRequest);

    // Check if item falls WITHIN the selected range
    return itemDate >= startDate && itemDate <= endDate;
  });

  const total = filtered.length;

  // 3. HANDLE EMPTY STATE
  if (total === 0) {
    display.innerHTML = `
      <div class="summary-card" style="border-left: 6px solid #f59e0b;">
        <h3 style="color:#b45309; margin-top:0;">No Records in Selected Range</h3>
        <p>We checked <b>${foreclosureData.length}</b> records. None matched <b>${formatDate(startInput)}</b> to <b>${formatDate(endInput)}</b>.</p>
        <p style="font-size:0.85rem; color:#64748b;"><i>Tip: Try setting the start date one day earlier to account for UTC time differences.</i></p>
      </div>`;
    return;
  }

  // 4. CALCULATE STATUS COUNTS & PERCENTAGES
  let counts = { reported: 0, pending: 0, canceled: 0, "in-progress": 0 };

  filtered.forEach((item) => {
    const status = (item.reportStatus || "pending").toLowerCase().trim();

    if (status.includes("reported") || status === "completed") {
      counts.reported++;
    } else if (status.includes("progress")) {
      counts["in-progress"]++;
    } else if (status.includes("cancel")) {
      counts.canceled++;
    } else {
      counts.pending++;
    }
  });

  // Percentage Helper
  const getPct = (count) =>
    total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

  // 5. RENDER THE FINAL REPORT
  display.innerHTML = `
    <div class="summary-card animate-in">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">
        <div>
          <h2 style="margin:0; color:var(--primary);">${reportTitle}</h2>
          <span style="font-size:0.85rem; color:#64748b;">Range: ${formatDate(startInput)} — ${formatDate(endInput)}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase;">Generated On</div>
          <div style="font-size:0.85rem; font-weight:bold;">${formatDate(new Date())}</div>
        </div>
      </div>

      <div style="background:var(--primary); color:white; padding:20px; border-radius:12px; text-align:center; margin-bottom:25px; box-shadow: 0 4px 12px rgba(2,0,102,0.15);">
        <div style="font-size:0.8rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">Total Requests in Period</div>
        <div style="font-size:2.8rem; font-weight:800;">${total}</div>
      </div>

      <div style="display:grid; gap:15px;">
        ${renderStatRow("Completed / Reported", counts.reported, getPct(counts.reported), "#16a34a")}
        ${renderStatRow("In Progress", counts["in-progress"], getPct(counts["in-progress"]), "#ca8a04")}
        ${renderStatRow("Pending", counts.pending, getPct(counts.pending), "#2563eb")}
        ${renderStatRow("Canceled", counts.canceled, getPct(counts.canceled), "#dc2626")}
      </div>

      <div style="margin-top:30px; display:flex; gap:10px;">
        <button class="btn btn-add" style="flex:2; height:50px; font-weight:bold;" onclick="exportToPDF('${reportTitle}', '${startInput}', '${endInput}')">
          DOWNLOAD PDF
        </button>
        <button class="btn btn-util" style="flex:1;" onclick="window.print()">
          PRINT
        </button>
      </div>
    </div>
  `;
};

// --- HELPER FOR VISUAL BARS ---
function renderStatRow(label, count, percent, color) {
  return `
    <div>
      <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:6px;">
        <span><b>${label}:</b> ${count}</span>
        <span style="font-weight:700; color:#475569;">${percent}%</span>
      </div>
      <div style="width:100%; background:#f1f5f9; height:12px; border-radius:6px; overflow:hidden; border:1px solid #e2e8f0;">
        <div style="width:${percent}%; background:${color}; height:100%; transition: width 0.5s ease-out;"></div>
      </div>
    </div>`;
}

window.exportToPDF = function (title, startDate, endDate) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");

  const filtered = foreclosureData.filter((item) => {
    const d = item.dateOfRequest?.split("T")[0];
    return d >= startDate && d <= endDate;
  });

  // Header Section
  doc.setFontSize(18);
  doc.setTextColor(2, 0, 102); // Primary Blue
  doc.text(`Foreclosure Management System - ${title}`, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Report Period: ${formatDate(startDate)} to ${formatDate(endDate)} | Total Records: ${filtered.length}`,
    14,
    22,
  );

  // Table Generation
  doc.autoTable({
    startY: 28,
    head: [
      ["Applicant", "Branch", "Location", "Collateral", "Status", "Req Date"],
    ],
    body: filtered.map((i) => [
      i.applicantName,
      i.branch,
      i.siteLocation,
      `${i.collateralType} (${i.numberOfCollaterals})`,
      i.reportStatus.toUpperCase(),
      formatDate(i.dateOfRequest),
    ]),
    theme: "grid",
    headStyles: { fillColor: [2, 0, 102] },
  });

  doc.save(`${title}_${startDate}.pdf`);
};

// --- 7. UI CONTROLS & INITIALIZATION ---
window.closeModal = () => {
  document.getElementById("modalOverlay").style.display = "none";
  editId = null;
};

document.addEventListener("DOMContentLoaded", () => {
  updateAvatarUI();

  const menuBtn = document.getElementById("mobile-menu-btn");
  const navLinks = document.getElementById("nav-links");

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navLinks.classList.toggle("active");
      menuBtn.classList.toggle("active"); // Fix for X-animation
    });

    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && e.target !== menuBtn) {
        navLinks.classList.remove("active");
        menuBtn.classList.remove("active");
      }
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

  const addBtn = document.getElementById("openAddModal");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
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
  const cancelBtn = document.querySelector(".btn-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  const searchTxt = document.getElementById("find-txt");
  const dateFrom = document.getElementById("find-from");
  const dateTo = document.getElementById("find-to");

  const filterHandler = () => {
    const term = searchTxt?.value.toLowerCase() || "";
    const from = dateFrom?.value || "";
    const to = dateTo?.value || "";

    const filtered = foreclosureData.filter((item) => {
      const name = item.applicantName?.toLowerCase() || "";
      const branch = item.branch?.toLowerCase() || "";
      const matchesSearch = name.includes(term) || branch.includes(term);
      const itemDate = item.dateOfRequest?.split("T")[0];
      const matchesDate =
        (!from || itemDate >= from) && (!to || itemDate <= to);
      return matchesSearch && matchesDate;
    });
    render(filtered);
  };

  if (searchTxt) searchTxt.addEventListener("input", filterHandler);
  if (dateFrom) dateFrom.addEventListener("change", filterHandler);
  if (dateTo) dateTo.addEventListener("change", filterHandler);

  if (
    document.getElementById("desktop-body") ||
    document.getElementById("mobile-cards-container")
  ) {
    window.loadDataFromDB();
  }
});

window.onclick = function (event) {
  const modal = document.getElementById("modalOverlay");
  if (event.target == modal) window.closeModal();
};
