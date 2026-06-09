/* =========================================================
   ADMIN PANEL FIREBASE SYSTEM  v4
   - Modal-based তথ্য ইনপুট ফর্ম (header button থেকে open)
   - Force logout: password change হলে সব ডিভাইস logout
   - তারিখ সহ record table (createdAt + recordDate)
   - QR Download: Fixed high-res PNG (small/medium/large/custom)
   - Toast notification system
   - Dashboard summary cards
   - Notification bell (3-day alert)
   - Mobile card layout
   - Performance-optimized, bug-free
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
const recordsRef      = db.ref("khatian_records");
const passwordRef     = db.ref("admin_settings/password");
const sessionTokenRef = db.ref("admin_settings/session_token");

const $ = (id) => document.getElementById(id);

let allRecords = {};
let recordsListenerStarted = false;
let activeQrId = null;
let passwordWatcher = null;
let currentSessionToken = null;
let renderDebounceTimer = null;

const SESSION_KEY       = "qr_admin_logged_in";
const SESSION_TOKEN_KEY = "qr_admin_session_token";
const NOTIF_KEY         = "qr_admin_notifs_read";

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
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 280);
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
    const khatian  = data.khatianNo ? `খতিয়ান ${safeText(data.khatianNo)}` : "একটি পর্চা";
    const owner    = data.ownerName ? ` (${safeText(data.ownerName.slice(0, 30))})` : "";
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
    const age = getAgeDays(allRecords[id]?.createdAt);
    return age !== null && age >= 3;
  });
  markNotifsRead(allIds);
  buildNotifications();
  showToast("✓ সব notification পড়া হয়েছে হিসেবে mark করা হয়েছে");
});

/* ── Dashboard Stats ───────────────────────────────────── */
function updateDashboard() {
  const records = Object.values(allRecords);
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  let total = records.length, todayCount = 0, ready = 0, pending = 0;

  records.forEach(data => {
    const age = getAgeDays(data.createdAt);
    if (data.createdAt) {
      const d = new Date(data.createdAt);
      if (!isNaN(d)) {
        const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
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
  setTimeout(() => { const el = $("khatianNo"); if (el) el.focus(); }, 120);
}

function closeFormModal() {
  $("formOverlay").classList.remove("is-open");
  $("formOverlay").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$("inputToggleBtn").addEventListener("click", () => {
  clearForm();
  openFormModal();
});

$("modalCloseBtn").addEventListener("click", closeFormModal);

$("formOverlay").addEventListener("click", (e) => {
  if (e.target === $("formOverlay")) closeFormModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("formOverlay").classList.contains("is-open")) closeFormModal();
    if ($("qrModalOverlay") && $("qrModalOverlay").classList.contains("is-open")) closeQrModal();
  }
});

/* ── Login ─────────────────────────────────────────────── */
function setLoginStatus(message, isSuccess = false) {
  const status = $("loginStatus");
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
    currentSessionToken = generateToken();
    sessionStorage.setItem(SESSION_TOKEN_KEY, currentSessionToken);
    await sessionTokenRef.set(currentSessionToken);
  } else {
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

  if (passwordWatcher) {
    passwordRef.off("value", passwordWatcher);
    passwordWatcher = null;
  }

  if (forceMessage) {
    const banner = document.createElement("div");
    banner.className = "force-logout-banner";
    banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${forceMessage}`;
    document.body.prepend(banner);
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 5500);
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
let savedPasswordSnapshot = null;

function startPasswordWatcher() {
  if (passwordWatcher) return;

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
    if (token && token !== currentSessionToken) {
      lockAdmin("অন্য ডিভাইস থেকে Login করা হয়েছে। নিরাপত্তার জন্য আপনাকে Logout করা হয়েছে।");
    }
  });
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("adminPassword").value.trim();
  if (!password) { setLoginStatus("Password লিখুন।"); return; }

  const loginBtn = $("loginForm").querySelector(".login-btn");
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> যাচাই হচ্ছে...';
  setLoginStatus("Password check হচ্ছে...", true);

  try {
    const isValid = await checkPassword(password);
    if (isValid) {
      setLoginStatus("Login সফল হয়েছে!", true);
      await unlockAdmin(false);
    } else {
      setLoginStatus("Password ভুল। Admin Panel খোলা যাবে না।");
    }
  } catch (error) {
    console.error(error);
    setLoginStatus(error.message || "Firebase password read করা যায়নি।");
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Login করুন';
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
    .forEach(key => { const el = $(key); if (el) el.value = data[key] || ""; });

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
  if (!options.keepStatus) {
    const st = $("statusText");
    if (st) st.textContent = "";
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

/* ── Date Formatting ───────────────────────────────────── */
function formatDateBangla(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d)) return "—";
  const months = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন",
                  "জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── QR Modal System ───────────────────────────────────── */

const QR_SIZES    = { small: 256, medium: 512, large: 1024 };
const QR_PREF_KEY = "qr_download_size_pref";

let qrSelectedSize    = "medium";
let qrSelectedCustomW = 800;
let qrSelectedCustomH = 800;
let currentQrLink     = "";

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

const qrCustomW = $("qrCustomW");
const qrCustomH = $("qrCustomH");

if (qrCustomW) qrCustomW.addEventListener("change", (e) => {
  qrSelectedCustomW = Math.max(100, Math.min(4000, parseInt(e.target.value) || 800));
  e.target.value = qrSelectedCustomW;
  saveQrSizePref();
});

if (qrCustomH) qrCustomH.addEventListener("change", (e) => {
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
  currentQrLink = "";
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
  currentQrLink = "";
}

function showQR(id) {
  const link = makeDetailsLink(id);
  activeQrId   = id;
  currentQrLink = link;

  $("qrModalTitleText").textContent = getRecordTitle(id);
  $("generatedLink").textContent    = link;

  const qrContainer = $("qrcode");
  qrContainer.innerHTML = "";

  // Generate QR at 200×200 for preview (crisp display)
  new QRCode(qrContainer, {
    text:         link,
    width:        200,
    height:       200,
    correctLevel: QRCode.CorrectLevel.H
  });

  // Hide the img fallback, keep only the canvas
  setTimeout(() => {
    const qrImg = qrContainer.querySelector("img");
    if (qrImg) qrImg.remove();
    const qrCanvas = qrContainer.querySelector("canvas");
    if (qrCanvas) {
      qrCanvas.setAttribute("aria-label", "Generated QR Code");
    }
  }, 50);

  openQrModal();
}

/* ── QR Download: High-Resolution PNG ─────────────────────
   Strategy: regenerate QR at the exact export size using a
   fresh QRCode instance in a hidden container so the download
   is always sharp regardless of the preview size.
──────────────────────────────────────────────────────────── */
function downloadCurrentQR() {
  const linkText = currentQrLink || $("generatedLink").textContent.trim();

  if (!linkText) {
    showToast("আগে QR বাটনে ক্লিক করে QR Code তৈরি করুন।", true);
    return;
  }

  let exportW, exportH;
  if (qrSelectedSize === "custom") {
    exportW = qrSelectedCustomW || 800;
    exportH = qrSelectedCustomH || 800;
  } else {
    const px = QR_SIZES[qrSelectedSize] || 512;
    exportW  = px;
    exportH  = px;
  }

  // Use the max side for QR generation (it must be square)
  const qrSize = Math.max(exportW, exportH);

  // Create a hidden off-screen container for the high-res QR
  const hiddenDiv = document.createElement("div");
  hiddenDiv.style.cssText = "position:absolute;top:-9999px;left:-9999px;width:" + qrSize + "px;height:" + qrSize + "px;";
  document.body.appendChild(hiddenDiv);

  const downloadBtn = $("downloadQrBtn");
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> তৈরি হচ্ছে...';
  }

  try {
    const hiResQR = new QRCode(hiddenDiv, {
      text:         linkText,
      width:        qrSize,
      height:       qrSize,
      correctLevel: QRCode.CorrectLevel.H
    });

    // QRCode.js renders synchronously when using canvas mode
    setTimeout(() => {
      try {
        const hiCanvas = hiddenDiv.querySelector("canvas");

        if (!hiCanvas) {
          // Fallback: scale up from preview canvas
          const previewCanvas = $("qrcode").querySelector("canvas");
          if (!previewCanvas) {
            showToast("QR Code canvas পাওয়া যায়নি।", true);
            return;
          }
          scaleAndDownload(previewCanvas, exportW, exportH, linkText);
        } else {
          // If exportW !== exportH, draw to a final canvas at exact dimensions
          if (exportW === exportH) {
            triggerDownload(hiCanvas, exportW, exportH, linkText);
          } else {
            scaleAndDownload(hiCanvas, exportW, exportH, linkText);
          }
        }
      } finally {
        if (hiddenDiv.parentNode) hiddenDiv.remove();
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download QR';
        }
      }
    }, 100);

  } catch (err) {
    console.error("QR generation error:", err);
    if (hiddenDiv.parentNode) hiddenDiv.remove();
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download QR';
    }
    showToast("QR Code তৈরিতে সমস্যা হয়েছে।", true);
  }
}

function scaleAndDownload(sourceCanvas, exportW, exportH, linkText) {
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width  = exportW;
  finalCanvas.height = exportH;
  const ctx = finalCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, exportW, exportH);
  ctx.drawImage(sourceCanvas, 0, 0, exportW, exportH);
  triggerDownload(finalCanvas, exportW, exportH, linkText);
}

function triggerDownload(canvas, w, h, linkText) {
  const record    = allRecords[activeQrId] || {};
  const cleanName = String(record.khatianNo || activeQrId || Date.now())
    .replace(/[^a-zA-Z0-9ঀ-৿_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const a = document.createElement("a");
  a.download = `qr-${cleanName}-${w}x${h}.png`;
  a.href     = canvas.toDataURL("image/png");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast(`✓ QR Code ${w}×${h}px PNG ফরম্যাটে download হয়েছে`);
}

$("downloadQrBtn").addEventListener("click", downloadCurrentQR);

/* ── Save / Update ─────────────────────────────────────── */
$("recordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id   = $("recordId").value;
  const data = getFormData();

  // Basic validation
  if (!data.khatianNo || !data.ownerName || !data.dagNo) {
    showToast("খতিয়ান নং, মালিকের নাম এবং দাগ নং আবশ্যক।", true);
    return;
  }

  const saveBtn = $("recordForm").querySelector(".btn-primary");
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Save হচ্ছে...';

  try {
    if (id) {
      await db.ref(`khatian_records/${id}`).update(data);
      showToast("✓ তথ্য Update হয়েছে");
      closeFormModal();
      showQR(id);
    } else {
      const newRef = recordsRef.push();
      await newRef.set({ ...data, createdAt: new Date().toISOString() });
      showToast("✓ নতুন তথ্য Save হয়েছে এবং QR Code তৈরি হয়েছে");
      clearForm({ keepStatus: true });
      closeFormModal();
      showQR(newRef.key);
    }
  } catch (error) {
    console.error("Save error:", error);
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
    .filter(([, data]) => {
      if (!query) return true;
      return [data.khatianNo, data.ownerName, data.dagNo, data.district, data.mouza, data.upazila]
        .some(v => v && String(v).toLowerCase().includes(query));
    })
    .reverse();

  $("recordCount").textContent = `${rows.length} Records`;

  if (!rows.length) {
    const emptyMsg = query
      ? `"${safeText(query)}" — কোনো তথ্য পাওয়া যায়নি`
      : "কোনো তথ্য নেই";
    $("recordsBody").innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--muted);">${emptyMsg}</td></tr>`;
    $("mobileCards").innerHTML = `<p style="padding:20px;color:var(--muted);text-align:center;">${emptyMsg}</p>`;
    return;
  }

  // Desktop table
  $("recordsBody").innerHTML = rows.map(([id, data]) => `
    <tr>
      <td><strong>${safeText(data.khatianNo || "—")}</strong></td>
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

/* Debounced search rendering */
function scheduleRender() {
  clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(renderRecords, 180);
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
    console.error("Firebase listener error:", error);
    $("recordsBody").innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--danger);">Firebase থেকে data load করা যায়নি। Database rules চেক করুন।</td></tr>';
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

  if (deleteId) {
    if (!confirm("এই তথ্য Delete করবেন? এই কাজ undo করা যাবে না।")) return;
    try {
      btn.disabled = true;
      await db.ref(`khatian_records/${deleteId}`).remove();
      showToast("✓ তথ্য Delete হয়েছে");
      if (activeQrId === deleteId) closeQrModal();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Delete করা যায়নি।", true);
      btn.disabled = false;
    }
  }
});

$("searchInput").addEventListener("input", scheduleRender);

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
  const link = currentQrLink || $("generatedLink").textContent.trim();
  if (!link) { showToast("আগে QR Code তৈরি করুন।", true); return; }
  try {
    await navigator.clipboard.writeText(link);
    showToast("✓ Link copy হয়েছে");
  } catch {
    // Fallback for older browsers
    const ta = document.createElement("textarea");
    ta.value = link;
    ta.style.cssText = "position:fixed;top:-999px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("✓ Link copy হয়েছে");
    } catch {
      showToast("Link copy করা যায়নি। ম্যানুয়ালি কপি করুন।", true);
    }
    document.body.removeChild(ta);
  }
});

/* ── Session Restore ───────────────────────────────────── */
if (sessionStorage.getItem(SESSION_KEY) === "yes") {
  unlockAdmin(true);
}
