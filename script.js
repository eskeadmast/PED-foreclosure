/**
 * ELITE REGISTRY - COMPLETE SYSTEM SCRIPT
 * Full Code: Auth + API + Render + Mobile + Amended Reports + PDF
 */

// --- 1. GATEKEEPER ---
(function gatekeeper() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const path = window.location.pathname;
  const page = path.split("/").pop();
  const isAtLogin =
    page === "" || page === "index.html" || page === "index.html";

  if (!isLoggedIn && !isAtLogin) {
    window.location.replace("index.html");
  } else if (isLoggedIn && isAtLogin) {
    window.location.replace("dashboard.html");
  }
})();

let editId = null;
let foreclosureData = [];

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

// --- 3. INITIALIZATION ---
window.onload = async () => {
  updateAvatarUI();
  // Check which view we are in to load data
  if (
    document.getElementById("desktop-body") ||
    document.getElementById("mobile-cards-container") ||
    document.getElementById("active-report-display")
  ) {
    await loadDataFromDB();
  }
};

// --- 4. AUTHENTICATION ---
const login = async (username, password) => {
  try {
    const response = await fetch("http://localhost:3000/api/v1/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include",
    });
    if (!response.ok) throw new Error("Auth Failed");
    const result = await response.json();

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userFullName", result.data?.user?.fullName || "User");
    window.location.replace("dashboard.html");
  } catch (error) {
    alert("Authentication Failed. Please check your credentials.");
  }
};

window.logout = function () {
  localStorage.clear();
  window.location.replace("index.html");
};

function updateAvatarUI() {
  const fullName = localStorage.getItem("userFullName") || "User";
  const container = document.getElementById("user-avatar-container");
  if (container) {
    const parts = fullName.trim().split(" ");
    const initials =
      parts.length > 1
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].substring(0, 2);
    container.innerHTML = `<div class="avatar-circle" title="${fullName}">${initials.toUpperCase()}</div>`;
  }
}

// --- 5. API OPERATIONS ---
async function loadDataFromDB() {
  try {
    const response = await fetch("http://localhost:3000/api/v1/foreclosures", {
      credentials: "include",
    });
    if (response.status === 401) return logout();
    const result = await response.json();

    // Support different API response structures
    foreclosureData = result.data?.data || result.data || [];
    render();
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

async function deleteData(id) {
  if (!confirm("Are you sure you want to delete this record?")) return;
  try {
    const resp = await fetch(
      `http://localhost:3000/api/v1/foreclosures/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (resp.ok) loadDataFromDB();
  } catch (err) {
    console.error("Delete error:", err);
  }
}

async function openEdit(id) {
  editId = id;
  const item = foreclosureData.find((x) => (x._id || x.id) === id);
  if (!item) return;

  document.getElementById("modalTitle").textContent = "Edit Record";
  document.getElementById("applicant").value = item.applicantName || "";
  document.getElementById("branch").value = item.branch || "";
  document.getElementById("location").value = item.siteLocation || "";
  document.getElementById("collateral-type").value = item.collateralType || "";
  document.getElementById("num-collateral").value =
    item.numberOfCollaterals || 0;
  document.getElementById("req-date").value = item.dateOfRequest
    ? item.dateOfRequest.split("T")[0]
    : "";

  // Optional field visibility
  const progSection = document.getElementById("progressiveSection");
  if (progSection) progSection.style.display = "block";

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
}

// --- 6. RENDER ENGINE (Desktop & Mobile) ---
function render() {
  const desktopTableBody = document.getElementById("desktop-body");
  const mobileContainer = document.getElementById("mobile-cards-container");

  if (desktopTableBody) desktopTableBody.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";

  let stats = {
    total: 0,
    reported: 0,
    "in-progress": 0,
    pending: 0,
    canceled: 0,
  };

  foreclosureData
    .slice()
    .reverse()
    .forEach((item) => {
      stats.total++;
      const statusRaw = (item.reportStatus || "pending").toLowerCase().trim();
      const s = statusRaw.replace(/\s+/g, "-");
      if (stats.hasOwnProperty(s)) stats[s]++;
      const id = item._id || item.id;

      // Desktop Row
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

      // Mobile Card
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
            <b>Type:</b> ${item.collateralType} (${item.numberOfCollaterals})<br>
            <b>Requested:</b> ${formatDate(item.dateOfRequest)}
          </div>
          <div class="actions">
            <button class="act-btn e-btn" onclick="openEdit('${id}')">Edit</button>
            <button class="act-btn d-btn" onclick="deleteData('${id}')">Delete</button>
          </div>
        </div>`;
      }
    });

  // Update Counters
  ["total", "reported", "pending", "canceled", "in-progress"].forEach((k) => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.innerText = stats[k];
  });
}

// --- 7. AMENDED STATUS REPORTS (Fixed Totals & Smaller Button) ---
window.runCustomReport = function (reportTitle) {
  const startVal = document.getElementById("start-date").value;
  const endVal = document.getElementById("end-date").value;
  const display = document.getElementById("active-report-display");

  if (!startVal || !endVal) return alert("Please select a valid date range.");

  // Robust filtering for both ISO and plain date strings
  const filtered = foreclosureData.filter((item) => {
    if (!item.dateOfRequest) return false;
    const itemDate = item.dateOfRequest.includes("T")
      ? item.dateOfRequest.split("T")[0]
      : item.dateOfRequest;
    return itemDate >= startVal && itemDate <= endVal;
  });

  const total = filtered.length;
  let counts = { reported: 0, pending: 0, canceled: 0, inProgress: 0 };

  filtered.forEach((i) => {
    const s = (i.reportStatus || "").toLowerCase();
    if (s.includes("reported") || s.includes("complete")) counts.reported++;
    else if (s.includes("cancel")) counts.canceled++;
    else if (s.includes("progress")) counts.inProgress++;
    else counts.pending++;
  });

  const getPct = (c) => (total > 0 ? ((c / total) * 100).toFixed(1) : "0.0");

  display.innerHTML = `
    <div class="summary-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2 style="margin:0; font-size: 1.2rem;">${reportTitle}</h2>
          <button class="act-btn e-btn" style="min-width: 90px; font-size: 9px; height: 26px; padding: 0 8px;" 
                  onclick="exportToPDF('${reportTitle}', '${startVal}', '${endVal}')">
              DOWNLOAD PDF
          </button>
      </div>
      <p style="font-size: 0.75rem; color: #64748b; margin-bottom: 12px;">Period: ${formatDate(startVal)} to ${formatDate(endVal)}</p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 15px;">
      <div class="summary-line"><b>Total Requests:</b> ${total}</div>
      <div class="summary-line"><b>Completed:</b> ${counts.reported} (${getPct(counts.reported)}%)</div>
      <div class="summary-line"><b>In-Progress:</b> ${counts.inProgress} (${getPct(counts.inProgress)}%)</div>
      <div class="summary-line"><b>Pending:</b> ${counts.pending} (${getPct(counts.pending)}%)</div>
      <div class="summary-line"><b>Canceled:</b> ${counts.canceled} (${getPct(counts.canceled)}%)</div>
    </div>`;
};

// --- 8. ORIGINAL PDF REPORT CODE ---
window.exportToPDF = function (title, startDate, endDate) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");

  const filtered = foreclosureData.filter((item) => {
    if (!item.dateOfRequest) return false;
    const d = item.dateOfRequest.includes("T")
      ? item.dateOfRequest.split("T")[0]
      : item.dateOfRequest;
    return d >= startDate && d <= endDate;
  });

  doc.setFontSize(18);
  doc.text(`PED Foreclosure Management - ${title}`, 14, 20);
  doc.setFontSize(11);
  doc.text(
    `Report Period: ${formatDate(startDate)} to ${formatDate(endDate)}`,
    14,
    28,
  );

  doc.autoTable({
    startY: 35,
    head: [
      [
        "Applicant Name",
        "Branch",
        "Location",
        "Collateral Type",
        "Qty",
        "Req Date",
        "Report Date",
        "Status",
      ],
    ],
    body: filtered.map((item) => [
      item.applicantName,
      item.branch,
      item.siteLocation,
      item.collateralType,
      item.numberOfCollaterals,
      formatDate(item.dateOfRequest),
      formatDate(item.dateOfReport),
      item.reportStatus,
    ]),
    headStyles: { fillColor: [1, 0, 102] },
    styles: { fontSize: 9 },
  });

  doc.save(`${title}_${startDate}.pdf`);
};

// --- 9. MODAL & UI UTILITIES ---
window.closeModal = () => {
  document.getElementById("modalOverlay").style.display = "none";
  editId = null;
};

// Handle clicks outside modal to close
window.onclick = function (event) {
  const modal = document.getElementById("modalOverlay");
  if (event.target == modal) {
    closeModal();
  }
};
