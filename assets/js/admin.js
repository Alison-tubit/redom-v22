/* =========================================================
   ADMIN PANEL FIREBASE SYSTEM
   - Password login from Firebase path: admin_settings/password
   - Add, edit, delete and search khatian records
   - Generate QR link for each saved record
   - This file uses Firebase compat SDK so admin login also works
     when the project is opened directly or hosted online.
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCMA0cJhgirtlHpVK0FOGh4adVlic0UhXs",
  authDomain: "https-dlrms-land.firebaseapp.com",
  databaseURL: "https://https-dlrms-land-default-rtdb.firebaseio.com",
  projectId: "https-dlrms-land",
  storageBucket: "https-dlrms-land.firebasestorage.app",
  messagingSenderId: "599998500889",
  appId: "1:599998500889:web:f61f91d07e21ba89f4da88",
  measurementId: "G-SSYZY4W4MT"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const recordsRef = db.ref("khatian_records");
const passwordRef = db.ref("admin_settings/password");
const $ = (id) => document.getElementById(id);

let allRecords = {};
let recordsListenerStarted = false;
let activeQrId = null;
const SESSION_KEY = "qr_admin_logged_in";

function setLoginStatus(message, isSuccess = false) {
  const status = $("loginStatus");
  status.textContent = message;
  status.style.color = isSuccess ? "#08733a" : "#c62828";
}

function unlockAdmin() {
  $("loginScreen").classList.add("hidden");
  $("adminApp").classList.remove("is-locked");
  sessionStorage.setItem(SESSION_KEY, "yes");
  startRecordsListener();
}

function lockAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
  $("loginScreen").classList.remove("hidden");
  $("adminApp").classList.add("is-locked");
  $("adminPassword").value = "";
  setLoginStatus("");
}

async function checkPassword(inputPassword) {
  const snapshot = await passwordRef.once("value");
  const savedPassword = snapshot.val();

  if (savedPassword === null || savedPassword === undefined || savedPassword === "") {
    throw new Error("Firebase path admin_settings/password খালি আছে বা পাওয়া যায়নি।");
  }

  return String(inputPassword).trim() === String(savedPassword).trim();
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("adminPassword").value.trim();

  if (!password) {
    setLoginStatus("Password লিখুন।");
    return;
  }

  setLoginStatus("Password check হচ্ছে...");

  try {
    const isValid = await checkPassword(password);
    if (isValid) {
      setLoginStatus("Login successful", true);
      unlockAdmin();
    } else {
      setLoginStatus("Password ভুল। Admin Panel খোলা যাবে না।");
    }
  } catch (error) {
    console.error(error);
    setLoginStatus(error.message || "Firebase password read করা যায়নি। Rules/config চেক করুন।");
  }
});

$("togglePassword").addEventListener("click", () => {
  const input = $("adminPassword");
  input.type = input.type === "password" ? "text" : "password";
});

$("logoutBtn").addEventListener("click", lockAdmin);

function getFormData() {
  return {
    khatianNo: $("khatianNo").value.trim(),
    ownerName: $("ownerName").value.trim(),
    dagNo: $("dagNo").value.trim(),
    survey: $("survey").value.trim(),
    mouza: $("mouza").value.trim(),
    upazila: $("upazila").value.trim(),
    district: $("district").value.trim(),
    division: $("division").value.trim(),
    recordDate: $("recordDate").value.trim(),
    updatedAt: new Date().toISOString()
  };
}

function fillForm(id, data = {}) {
  $("recordId").value = id;
  ["khatianNo", "ownerName", "dagNo", "survey", "mouza", "upazila", "district", "division", "recordDate"]
    .forEach((key) => {
      $(key).value = data[key] || "";
    });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm(options = {}) {
  $("recordForm").reset();
  $("recordId").value = "";
  if (!options.keepStatus) {
    $("statusText").textContent = "";
  }
}

function safeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRecordTitle(id) {
  const record = allRecords[id] || {};
  const khatian = record.khatianNo ? `খতিয়ান: ${record.khatianNo}` : "নতুন QR Code";
  const owner = record.ownerName ? ` — ${record.ownerName}` : "";
  return `${khatian}${owner}`;
}

function makeDetailsLink(id) {
  const basePath = location.pathname.replace(/admin\.html$/, "");
  return `${location.origin}${basePath}details.html?id=${id}`;
}

function resetQRPreview() {
  activeQrId = null;
  $("qrcode").innerHTML = "";
  $("generatedLink").textContent = "";
  $("qrRecordTitle").textContent = "Save অথবা QR বাটনে ক্লিক করলে এখানে QR Code দেখা যাবে।";
  $("qrBox").classList.remove("is-active");
}

function showQR(id) {
  const link = makeDetailsLink(id);
  const qrBox = $("qrBox");
  const qrContainer = $("qrcode");

  activeQrId = id;
  qrBox.classList.add("is-active");
  $("generatedLink").textContent = link;
  $("qrRecordTitle").textContent = getRecordTitle(id);
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: link,
    width: 180,
    height: 180,
    correctLevel: QRCode.CorrectLevel.H
  });

  // qrcodejs sometimes creates both canvas and img. Keep only one visible/usable QR.
  const qrImage = qrContainer.querySelector("img");
  if (qrImage) qrImage.remove();
  const qrCanvas = qrContainer.querySelector("canvas");
  if (qrCanvas) {
    qrCanvas.setAttribute("aria-label", "Generated QR Code");
    qrCanvas.style.display = "block";
  }

  qrBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("recordForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = $("recordId").value;
  const data = getFormData();

  try {
    if (id) {
      await db.ref(`khatian_records/${id}`).update(data);
      $("statusText").textContent = "তথ্য Update হয়েছে";
      showQR(id);
    } else {
      const newRef = recordsRef.push();
      await newRef.set({
        ...data,
        createdAt: new Date().toISOString()
      });
      $("statusText").textContent = "নতুন তথ্য Save হয়েছে এবং QR Code তৈরি হয়েছে";
      showQR(newRef.key);
      clearForm({ keepStatus: true });
    }
  } catch (error) {
    console.error(error);
    $("statusText").textContent = "Save করা যায়নি। Firebase config / database rules চেক করুন।";
  }
});

function renderRecords() {
  const query = $("searchInput").value.toLowerCase().trim();
  const rows = Object.entries(allRecords)
    .filter(([, data]) => JSON.stringify(data).toLowerCase().includes(query))
    .reverse();

  $("recordCount").textContent = `${rows.length} Records`;

  if (!rows.length) {
    $("recordsBody").innerHTML = '<tr><td colspan="5">কোনো তথ্য নেই</td></tr>';
    return;
  }

  $("recordsBody").innerHTML = rows.map(([id, data]) => `
    <tr>
      <td>${safeText(data.khatianNo || "-")}</td>
      <td>${safeText((data.ownerName || "-").slice(0, 90))}</td>
      <td>${safeText(data.dagNo || "-")}</td>
      <td>${safeText(data.mouza || "-")}, ${safeText(data.upazila || "-")}, ${safeText(data.district || "-")}</td>
      <td>
        <button class="action-btn edit" data-edit="${id}">Edit</button>
        <button class="action-btn qr" data-qr="${id}">QR</button>
        <button class="action-btn delete" data-del="${id}">Delete</button>
      </td>
    </tr>
  `).join("");
}

function startRecordsListener() {
  if (recordsListenerStarted) return;
  recordsListenerStarted = true;

  recordsRef.on("value", (snapshot) => {
    allRecords = snapshot.val() || {};
    renderRecords();
  }, (error) => {
    console.error(error);
    $("recordsBody").innerHTML = '<tr><td colspan="5">Firebase থেকে data load করা যায়নি।</td></tr>';
  });
}

document.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-edit], [data-del], [data-qr]");
  if (!actionButton) return;

  const editId = actionButton.dataset.edit;
  const deleteId = actionButton.dataset.del;
  const qrId = actionButton.dataset.qr;

  if (editId) fillForm(editId, allRecords[editId]);
  if (qrId) showQR(qrId);

  if (deleteId && confirm("এই তথ্য Delete করবেন?")) {
    await db.ref(`khatian_records/${deleteId}`).remove();
  }
});

$("searchInput").addEventListener("input", renderRecords);
$("resetBtn").addEventListener("click", () => {
  clearForm();
  resetQRPreview();
});
function resetAdminView() {
  clearForm();
  $("searchInput").value = "";
  resetQRPreview();
  renderRecords();
  $("statusText").textContent = "Admin Panel refresh হয়েছে";
}

$("refreshBtn").addEventListener("click", resetAdminView);
$("copyLinkBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("generatedLink").textContent);
    $("statusText").textContent = "Link copy হয়েছে";
  } catch (error) {
    $("statusText").textContent = "Link copy করা যায়নি।";
  }
});

if (sessionStorage.getItem(SESSION_KEY) === "yes") {
  unlockAdmin();
}


function downloadCurrentQR() {
  const qrCanvas = $("qrcode").querySelector("canvas");
  const linkText = $("generatedLink").textContent.trim();

  if (!linkText || !qrCanvas) {
    $("statusText").textContent = "আগে Save অথবা QR বাটনে ক্লিক করে QR Code তৈরি করুন।";
    return;
  }

  const record = allRecords[activeQrId] || {};
  const cleanName = String(record.khatianNo || activeQrId || Date.now()).replace(/[^a-zA-Z0-9ঀ-৿_-]/g, "-");
  const downloadLink = document.createElement("a");
  downloadLink.download = `qr-code-${cleanName}.png`;
  downloadLink.href = qrCanvas.toDataURL("image/png");
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  $("statusText").textContent = "একটি QR Code download হয়েছে";
}

$("downloadQrBtn").addEventListener("click", downloadCurrentQR);
