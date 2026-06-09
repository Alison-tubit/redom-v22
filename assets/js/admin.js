/* =========================================================
   ADMIN PANEL FIREBASE SYSTEM  v3
   - Modal-based তথ্য ইনপুট ফর্ম (header button থেকে open)
   - Force logout: password change হলে সব ডিভাইস logout
   - তারিখ সহ record table (createdAt + recordDate)
   - Compact QR (120×120) — প্রিন্ট-ফ্রেন্ডলি
   - Toast notification system
   - Dashboard summary cards
   - Notification bell (3-day alert)
   - Mobile card layout
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
const recordsRef   = db.ref("khatian_records");
const passwordRef  = db.ref("admin_settings/password");
const sessionTokenRef = db.ref("admin_settings/session_token");

const $ = (id) => document.getElementById(id);

let allRecords = {};
let recordsListenerStarted = false;
let activeQrId = null;
let passwordWatcher = null;
let currentSessionToken = null;

const SESSION_KEY        = "qr_admin_logged_in";
const SESSION_TOKEN_KEY  = "qr_admin_session_token";
const NOTIF_KEY          = "qr_admin_notifs_read";

/* ── Toast System ───────────────────────────────────────── */
let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
}

function showToast(message, isError = false, duration = 3200) {
  ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = "toast" + (isError ? " toast-error" : "");
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

/* ── Notifications ─────────────────────────────────────── */
function getReadNotifs() {
  try { return JSON.parse(sessionStorage.getItem(NOTIF_KEY) || "[]"); } catch { return []; }
}
function markNotifsRead(ids) {
  const existing = getReadNotifs();
  sessionStorage.setItem(NOTIF_KEY, JSON.stringify([...new Set([...existing, ...ids])]));
}

function getAgeDays(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (isNaN(created)) return null;
  return Math.floor((Date.now() - created.getTime()) / 86400000);
}

function buildNotifications() {
  const readIds = getReadNotifs();
  const notifications = [];

  Object.entries(allRecords).forEach(([id, data]) => {
    const age = getAgeDays(data.createdAt);
    if (age !== null && age >= 3) notifications.push({ id, data, age });
  });

  notifications.sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));

  const unread = notifications.filter(n => !readIds.includes(n.id));
  const badge  = $("notifBadge");

  if (unread.length > 0) {
    badge.textContent = unread.length > 99 ? "99+" : unread.length;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }

  const list = $("notifList");
  if (!notifications.length) {
    list.innerHTML = '<li class="notif-empty">কোনো notification নেই।</li>';
    return;
  }

  list.innerHTML = notifications.map(({ id, data, age }) => {
    const isUnread = !readIds.includes(id);
    const khatian  = data.khatianNo ? `খতিয়ান ${data.khatianNo}` : "একটি পর্চা";
    const owner    = data.ownerName ? ` (${data.ownerName.slice(0, 30)})` : "";
    return `
      <li class="notif-item${isUnread ? " notif-unread" : ""}" data-notif-id="${id}">
        <div class="notif-item-icon"><i class="fa-solid fa-bell"></i></div>
        <div class="notif-item-body">
          <div class="notif-item-text">${khatian}${owner}-এর বয়স ${age} দিন। সিলেক্টের জন্য প্রস্তুত।</div>
          <div class="notif-item-meta">${age} দিন আগে তৈরি হয়েছে</div>
        </div>
      </li>`;
  }).join("");
}

$("notifBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("notifPanel").classList.toggle("open");
});

document.addEventListener("click", (e) => {
  if (!$("notifWrapper").contains(e.target)) $("notifPanel").classList.remove("open");
});

$("clearNotifBtn").addEventListener("click", () => {
  const allIds = Object.keys(allRecords).filter(id => {
    const age = getAgeDays(allRecords[id].createdAt);
    return age !== null && age >= 3;
  });
  markNotifsRead(allIds);
  buildNotifications();
});

/* ── Dashboard Stats ───────────────────────────────────── */
function updateDashboard() {
  const records = Object.values(allRecords);
  const today   = new Date(); today.setHours(0,0,0,0);
  let total = records.length, todayCount = 0, ready = 0, pending = 0;

  records.forEach(data => {
    const age = getAgeDays(data.createdAt);
    if (data.createdAt) {
      const d = new Date(data.createdAt);
      if (!isNaN(d)) {
        const dDay = new Date(d); dDay.setHours(0,0,0,0);
        if (dDay.getTime() === today.getTime()) todayCount++;
      }
    }
    if (age === null) { pending++; return; }
    if (age >= 3) ready++; else pending++;
  });

  $("statTotal").textContent   = total;
  $("statToday").textContent   = todayCount;
  $("statReady").textContent   = ready;
  $("statPending").textContent = pending;
}

/* ── Modal Form ────────────────────────────────────────── */
function openFormModal() {
  $("formOverlay").classList.add("is-open");
  $("formOverlay").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // Focus first input
  setTimeout(() => { $("khatianNo").focus(); }, 120);
}

function closeFormModal() {
  $("formOverlay").classList.remove("is-open");
  $("formOverlay").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$("inputToggleBtn").addEventListener("click", () => {
  clearForm();
  resetQRPreview();
  openFormModal();
});

$("modalCloseBtn").addEventListener("click", closeFormModal);

// Close on overlay click (outside modal)
$("formOverlay").addEventListener("click", (e) => {
  if (e.target === $("formOverlay")) closeFormModal();
});

// Close on Escape key (form modal + QR modal)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("formOverlay").classList.contains("is-open")) closeFormModal();
    if ($("qrModalOverlay") && $("qrModalOverlay").classList.contains("is-open")) closeQrModal();
  }
});

/* ── Login ─────────────────────────────────────────────── */
function setLoginStatus(message, isSuccess = false) {
  const status  = $("loginStatus");
  status.textContent = message;
  status.style.color = isSuccess ? "#08733a" : "#c62828";
}

function generateToken() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function unlockAdmin(skipTokenWrite = false) {
  $("loginScreen").classList.add("hidden");
  $("adminApp").classList.remove("is-locked");
  sessionStorage.setItem(SESSION_KEY, "yes");

  if (!skipTokenWrite) {
    // Write a new session token to Firebase and store locally
    currentSessionToken = generateToken();
    sessionStorage.setItem(SESSION_TOKEN_KEY, currentSessionToken);
    await sessionTokenRef.set(currentSessionToken);
  } else {
    // Restore token from sessionStorage
    currentSessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  }

  startRecordsListener();
  startPasswordWatcher();
  startSessionTokenWatcher();
}

function lockAdmin(forceMessage) {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(NOTIF_KEY);
  currentSessionToken = null;

  $("loginScreen").classList.remove("hidden");
  $("adminApp").classList.add("is-locked");
  $("adminPassword").value = "";
  setLoginStatus("");
  $("notifPanel").classList.remove("open");
  closeFormModal();

  // Stop watchers
  if (passwordWatcher) {
    passwordRef.off("value", passwordWatcher);
    passwordWatcher = null;
  }

  if (forceMessage) {
    const banner = document.createElement("div");
    banner.className = "force-logout-banner";
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${forceMessage}`;
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 5500);
  }
}

async function checkPassword(inputPassword) {
  const snapshot = await passwordRef.once("value");
  const savedPassword = snapshot.val();
  if (savedPassword === null || savedPassword === undefined || savedPassword === "") {
    throw new Error("Firebase path admin_settings/password খালি আছে বা পাওয়া যায়নি।");
  }
  return String(inputPassword).trim() === String(savedPassword).trim();
}

/* ── Force-Logout Watchers ─────────────────────────────── */

/*
  Password watcher: যদি পাসওয়ার্ড পরিবর্তন হয় তাহলে
  সব লগইন করা ডিভাইস কে force logout করতে হবে।
  এর জন্য আমরা password change এর সাথে সাথে
  Firebase-এ একটি নতুন session_token লিখি,
  এবং প্রতিটি লগইন করা ডিভাইস সেই token watch করে।
  Token মিলে না গেলে logout।
*/
let savedPasswordSnapshot = null;

function startPasswordWatcher() {
  if (passwordWatcher) return;
  // Store the current password value at login time
  passwordRef.once("value").then(snap => {
    savedPasswordSnapshot = snap.val();
  });

  passwordWatcher = passwordRef.on("value", (snap) => {
    if (savedPasswordSnapshot === null) {
      savedPasswordSnapshot = snap.val();
      return;
    }
    if (snap.val() !== savedPasswordSnapshot) {
      lockAdmin("পাসওয়ার্ড পরিবর্তন হয়েছে। নিরাপত্তার জন্য আপনাকে Logout করা হয়েছে। নতুন পাসওয়ার্ড দিয়ে Login করুন।");
    }
  });
}

function startSessionTokenWatcher() {
  sessionTokenRef.on("value", (snap) => {
    const token = snap.val();
    if (!currentSessionToken) return;
    // If the stored token differs, another device changed it → force logout
    if (token && token !== currentSessionToken) {
      lockAdmin("অন্য ডিভাইস থেকে পাসওয়ার্ড পরিবর্তন করা হয়েছে। নিরাপত্তার জন্য আপনাকে Logout করা হয়েছে।");
    }
  });
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("adminPassword").value.trim();
  if (!password) { setLoginStatus("Password লিখুন।"); return; }

  const loginBtn = $("loginForm").querySelector(".login-btn");
  loginBtn.disabled = true;
  setLoginStatus("Password check হচ্ছে...");

  try {
    const isValid = await checkPassword(password);
    if (isValid) {
      setLoginStatus("Login successful", true);
      await unlockAdmin(false);
    } else {
      setLoginStatus("Password ভুল। Admin Panel খোলা যাবে না।");
    }
  } catch (error) {
    console.error(error);
    setLoginStatus(error.message || "Firebase password read করা যায়নি।");
  } finally {
    loginBtn.disabled = false;
  }
});

$("togglePassword").addEventListener("click", () => {
  const input = $("adminPassword");
  const icon  = $("togglePassword").querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    icon.className = "fa-regular fa-eye-slash";
  } else {
    input.type = "password";
    icon.className = "fa-regular fa-eye";
  }
});

$("logoutBtn").addEventListener("click", () => lockAdmin());

/* ── Form Data ─────────────────────────────────────────── */
function getFormData() {
  return {
    khatianNo:  $("khatianNo").value.trim(),
    ownerName:  $("ownerName").value.trim(),
    dagNo:      $("dagNo").value.trim(),
    survey:     $("survey").value.trim(),
    mouza:      $("mouza").value.trim(),
    upazila:    $("upazila").value.trim(),
    district:   $("district").value.trim(),
    division:   $("division").value.trim(),
    recordDate: $("recordDate").value.trim(),
    updatedAt:  new Date().toISOString()
  };
}

function fillForm(id, data = {}) {
  $("recordId").value = id;
  ["khatianNo","ownerName","dagNo","survey","mouza","upazila","district","division","recordDate"]
    .forEach(key => { $(key).value = data[key] || ""; });
  const badge = $("formBadge");
  if (badge) badge.textContent = "Edit মোড";
  const titleText = $("formModalTitleText");
  if (titleText) titleText.textContent = "তথ্য Edit করুন";
  openFormModal();
}

function clearForm(options = {}) {
  $("recordForm").reset();
  $("recordId").value = "";
  const badge = $("formBadge");
  if (badge) badge.textContent = "নতুন তথ্য";
  const titleText = $("formModalTitleText");
  if (titleText) titleText.textContent = "নতুন তথ্য যোগ করুন";
  if (!options.keepStatus) $("statusText").textContent = "";
}

function safeText(value = "") {
  return String(value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

/* ── Date Formatting ───────────────────────────────────── */
function formatDateBangla(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d)) return "—";
  const day    = d.getDate();
  const months = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
                  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── QR Modal System ───────────────────────────────────────── */

const QR_SIZES    = { small: 256, medium: 512, large: 1024 };
const QR_PREF_KEY = "qr_download_size_pref";

let qrSelectedSize    = "medium";
let qrSelectedCustomW = 800;
let qrSelectedCustomH = 800;

// Restore saved preference
(function restoreQrSizePref() {
  try {
    const saved = JSON.parse(localStorage.getItem(QR_PREF_KEY) || "{}");
    if (saved.size)    qrSelectedSize    = saved.size;
    if (saved.customW) qrSelectedCustomW = saved.customW;
    if (saved.customH) qrSelectedCustomH = saved.customH;
    setTimeout(() => {
      if (saved.customW && $("qrCustomW")) $("qrCustomW").value = saved.customW;
      if (saved.customH && $("qrCustomH")) $("qrCustomH").value = saved.customH;
    }, 0);
  } catch {}
})();

function saveQrSizePref() {
  try {
    localStorage.setItem(QR_PREF_KEY, JSON.stringify({
      size: qrSelectedSize, customW: qrSelectedCustomW, customH: qrSelectedCustomH
    }));
  } catch {}
}

function applyQrSizeUI(size) {
  qrSelectedSize = size;
  document.querySelectorAll(".qr-size-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.size === size);
  });
  const customRow = $("qrCustomRow");
  if (customRow) customRow.classList.toggle("is-visible", size === "custom");
  saveQrSizePref();
}

document.querySelectorAll(".qr-size-btn").forEach(btn => {
  btn.addEventListener("click", () => applyQrSizeUI(btn.dataset.size));
});

$("qrCustomW") && $("qrCustomW").addEventListener("change", (e) => {
  qrSelectedCustomW = Math.max(100, Math.min(4000, parseInt(e.target.value) || 800));
  e.target.value = qrSelectedCustomW;
  saveQrSizePref();
});
$("qrCustomH") && $("qrCustomH").addEventListener("change", (e) => {
  qrSelectedCustomH = Math.max(100, Math.min(4000, parseInt(e.target.value) || 800));
  e.target.value = qrSelectedCustomH;
  saveQrSizePref();
});

setTimeout(() => applyQrSizeUI(qrSelectedSize), 0);

/* Modal open / close */
function openQrModal() {
  $("qrModalOverlay").classList.add("is-open");
  $("qrModalOverlay").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeQrModal() {
  $("qrModalOverlay").classList.remove("is-open");
  $("qrModalOverlay").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  $("qrcode").innerHTML = "";
  $("generatedLink").textContent = "";
  activeQrId = null;
}

$("qrModalCloseBtn").addEventListener("click", closeQrModal);
$("qrModalOverlay").addEventListener("click", (e) => {
  if (e.target === $("qrModalOverlay")) closeQrModal();
});

/* QR helper functions */
function getRecordTitle(id) {
  const record  = allRecords[id] || {};
  const khatian = record.khatianNo ? `খতিয়ান: ${record.khatianNo}` : "নতুন QR Code";
  const owner   = record.ownerName ? ` — ${record.ownerName}` : "";
  return `${khatian}${owner}`;
}

function makeDetailsLink(id) {
  const basePath = location.pathname.replace(/admin\.html$/, "");
  return `${location.origin}${basePath}details.html?id=${id}`;
}

function resetQRPreview() {
  activeQrId = null;
}

function showQR(id) {
  const link = makeDetailsLink(id);
  activeQrId = id;

  $("qrModalTitleText").textContent = getRecordTitle(id);
  $("generatedLink").textContent = link;

  const qrContainer = $("qrcode");
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: link,
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.H
  });

  const qrImage = qrContainer.querySelector("img");
  if (qrImage) qrImage.remove();
  const qrCanvas = qrContainer.querySelector("canvas");
  if (qrCanvas) {
    qrCanvas.setAttribute("aria-label", "Generated QR Code");
    qrCanvas.style.cssText = "display:block !important;width:200px !important;height:200px !important;";
  }

  openQrModal();
}

/* ── QR Download (High Resolution) ──────────────────────────── */
function downloadCurrentQR() {
  const qrCanvas = $("qrcode").querySelector("canvas");
  const linkText = $("generatedLink").textContent.trim();

  if (!linkText || !qrCanvas) {
    showToast("আগে QR বাটনে ক্লিক করে QR Code তৈরি করুন।", true);
    return;
  }

  let exportW, exportH;
  if (qrSelectedSize === "custom") {
    exportW = qrSelectedCustomW || 800;
    exportH = qrSelectedCustomH || 800;
  } else {
    const px = QR_SIZES[qrSelectedSize] || 512;
    exportW = px; exportH = px;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width  = exportW;
  exportCanvas.height = exportH;
  const ctx = exportCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, exportW, exportH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, 0, 0, exportW, exportH);

  const record    = allRecords[activeQrId] || {};
  const cleanName = String(record.khatianNo || activeQrId || Date.now())
    .replace(/[^a-zA-Z0-9ঀ-৿_-]/g, "-");

  const a = document.createElement("a");
  a.download = `qr-${cleanName}-${exportW}x${exportH}.jpg`;
  a.href     = exportCanvas.toDataURL("image/jpeg", 0.97);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast(`✓ QR Code ${exportW}×${exportH}px download হয়েছে`);
}

$("downloadQrBtn").addEventListener("click", downloadCurrentQR);

/* ── Save / Update ─────────────────────────────────────── */
$("recordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id   = $("recordId").value;
  const data = getFormData();

  const saveBtn = $("recordForm").querySelector(".btn-primary");
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Save হচ্ছে...';

  try {
    if (id) {
      await db.ref(`khatian_records/${id}`).update(data);
      showToast("✓ তথ্য Update হয়েছে");
      showQR(id);
      closeFormModal();
    } else {
      const newRef = recordsRef.push();
      await newRef.set({ ...data, createdAt: new Date().toISOString() });
      showToast("✓ নতুন তথ্য Save হয়েছে এবং QR Code তৈরি হয়েছে");
      showQR(newRef.key);
      clearForm({ keepStatus: true });
      closeFormModal();
    }
  } catch (error) {
    console.error(error);
    showToast("Save করা যায়নি। Firebase config / database rules চেক করুন।", true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save করুন';
  }
});

/* ── Render Records ────────────────────────────────────── */
function getStatusHTML(data) {
  const age = getAgeDays(data.createdAt);
  if (age === null) return '<span class="status-badge pending"><i class="fa-solid fa-clock"></i> Pending</span>';
  if (age >= 3)     return `<span class="status-badge ready"><i class="fa-solid fa-circle-check"></i> প্রস্তুত</span>`;
  return `<span class="status-badge pending"><i class="fa-solid fa-clock"></i> Pending</span>`;
}

function getAgeLine(data) {
  const age = getAgeDays(data.createdAt);
  if (age === null) return '<span class="age-text">তারিখ নেই</span>';
  return `<span class="age-text">${age} দিন আগে</span>`;
}

function getDateCellHTML(data) {
  const userDate    = data.recordDate ? safeText(data.recordDate) : "—";
  const createdDate = data.createdAt  ? formatDateBangla(data.createdAt) : "—";
  return `
    <div class="date-cell">
      <div>${userDate}</div>
      <div class="date-created">তৈরি: ${createdDate}</div>
    </div>`;
}

function renderRecords() {
  const query = $("searchInput").value.toLowerCase().trim();
  const rows  = Object.entries(allRecords)
    .filter(([, data]) => JSON.stringify(data).toLowerCase().includes(query))
    .reverse();

  $("recordCount").textContent = `${rows.length} Records`;

  if (!rows.length) {
    $("recordsBody").innerHTML = '<tr><td colspan="7">কোনো তথ্য নেই</td></tr>';
    $("mobileCards").innerHTML = '<p style="padding:16px;color:var(--muted);text-align:center;">কোনো তথ্য নেই</p>';
    return;
  }

  // Desktop table (7 columns now: added date column)
  $("recordsBody").innerHTML = rows.map(([id, data]) => `
    <tr>
      <td>${safeText(data.khatianNo || "—")}</td>
      <td>${safeText((data.ownerName || "—").slice(0, 90))}</td>
      <td>${safeText(data.dagNo || "—")}</td>
      <td>${safeText(data.mouza || "—")}, ${safeText(data.upazila || "—")}, ${safeText(data.district || "—")}</td>
      <td>${getDateCellHTML(data)}</td>
      <td>${getStatusHTML(data)}${getAgeLine(data)}</td>
      <td>
        <button class="action-btn edit"   data-edit="${id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button class="action-btn qr"     data-qr="${id}"><i class="fa-solid fa-qrcode"></i> QR</button>
        <button class="action-btn delete" data-del="${id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("");

  // Mobile cards
  $("mobileCards").innerHTML = rows.map(([id, data]) => `
    <div class="m-card">
      <div class="m-card-header">
        <div>
          <div class="m-card-khatian">খতিয়ান: ${safeText(data.khatianNo || "—")}</div>
          <div class="m-card-owner">${safeText((data.ownerName || "—").slice(0, 80))}</div>
        </div>
        ${getStatusHTML(data)}
      </div>
      <div class="m-card-meta">
        <span class="m-card-tag"><i class="fa-solid fa-hashtag" style="font-size:10px"></i> দাগ: ${safeText(data.dagNo || "—")}</span>
        <span class="m-card-tag"><i class="fa-solid fa-location-dot" style="font-size:10px"></i> ${safeText(data.mouza || "—")}</span>
        <span class="m-card-tag">${safeText(data.upazila || "—")}, ${safeText(data.district || "—")}</span>
      </div>
      <div class="m-card-date">
        <i class="fa-regular fa-calendar"></i>
        ${data.recordDate ? safeText(data.recordDate) : "—"}
        ${data.createdAt ? ` · তৈরি: ${formatDateBangla(data.createdAt)}` : ""}
      </div>
      <div class="m-card-actions">
        <button class="action-btn edit"   data-edit="${id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
        <button class="action-btn qr"     data-qr="${id}"><i class="fa-solid fa-qrcode"></i> QR</button>
        <button class="action-btn delete" data-del="${id}"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    </div>
  `).join("");
}

/* ── Firebase Listener ─────────────────────────────────── */
function startRecordsListener() {
  if (recordsListenerStarted) return;
  recordsListenerStarted = true;

  recordsRef.on("value", (snapshot) => {
    allRecords = snapshot.val() || {};
    renderRecords();
    updateDashboard();
    buildNotifications();
  }, (error) => {
    console.error(error);
    $("recordsBody").innerHTML = '<tr><td colspan="7">Firebase থেকে data load করা যায়নি।</td></tr>';
  });
}

/* ── Event Delegation ──────────────────────────────────── */
document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-edit], [data-del], [data-qr]");
  if (!btn) return;

  const editId   = btn.dataset.edit;
  const deleteId = btn.dataset.del;
  const qrId     = btn.dataset.qr;

  if (editId)   fillForm(editId, allRecords[editId]);
  if (qrId)     showQR(qrId);
  if (deleteId && confirm("এই তথ্য Delete করবেন?")) {
    try {
      await db.ref(`khatian_records/${deleteId}`).remove();
      showToast("✓ তথ্য Delete হয়েছে");
      if (activeQrId === deleteId) resetQRPreview();
    } catch (err) {
      showToast("Delete করা যায়নি।", true);
    }
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
  showToast("Admin Panel refresh হয়েছে");
}

$("refreshBtn").addEventListener("click", resetAdminView);

$("copyLinkBtn").addEventListener("click", async () => {
  const link = $("generatedLink").textContent.trim();
  if (!link) { showToast("আগে QR Code তৈরি করুন।", true); return; }
  try {
    await navigator.clipboard.writeText(link);
    showToast("✓ Link copy হয়েছে");
  } catch {
    showToast("Link copy করা যায়নি।", true);
  }
});

/* ── QR Download as JPG ────────────────────────────────── */
function downloadCurrentQR() {
  const qrCanvas  = $("qrcode").querySelector("canvas");
  const linkText  = $("generatedLink").textContent.trim();

  if (!linkText || !qrCanvas) {
    showToast("আগে QR বাটনে ক্লিক করে QR Code তৈরি করুন।", true);
    return;
  }

  // Export at 200×200 for crisp print quality (despite 120×120 preview)
  const exportCanvas = document.createElement("canvas");
  const size = 200;
  exportCanvas.width  = size;
  exportCanvas.height = size;
  const ctx = exportCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrCanvas, 0, 0, size, size);

  const record    = allRecords[activeQrId] || {};
  const cleanName = String(record.khatianNo || activeQrId || Date.now())
    .replace(/[^a-zA-Z0-9ঀ-৿_-]/g, "-");

  const a = document.createElement("a");
  a.download = `qr-code-${cleanName}.jpg`;
  a.href     = exportCanvas.toDataURL("image/jpeg", 0.95);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast("✓ QR Code JPG ফরম্যাটে download হয়েছে");
}

/* ── Session Restore ───────────────────────────────────── */
if (sessionStorage.getItem(SESSION_KEY) === "yes") {
  // Restore session without writing a new token
  unlockAdmin(true);
}
