/* =========================================================
   FIREBASE DYNAMIC DETAILS PAGE
   - QR link format: details.html?id=UNIQUE_ID
   - Database path: khatian_records/UNIQUE_ID
========================================================= */

import { ref, get } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { db } from "./firebase/database.js";

const loader = document.getElementById("detailsLoader");
const card = document.getElementById("detailsCard");
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

function showError(message) {
  if (loader) {
    loader.innerHTML = `<div class="details-error">${message}</div>`;
    loader.style.display = "block";
  }
  if (card) card.style.display = "none";
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) element.textContent = value || "-";
}

async function loadDetails() {
  if (!loader || !card) return;

  if (!id) {
    showError("কোনো তথ্য ID পাওয়া যায়নি। QR Code অথবা লিংকটি সঠিক নয়।");
    return;
  }

  try {
    const snapshot = await get(ref(db, `khatian_records/${id}`));

    if (!snapshot.exists()) {
      showError("এই ID অনুযায়ী কোনো তথ্য পাওয়া যায়নি।");
      return;
    }

    const data = snapshot.val();
    setText("khatianTitle", "খতিয়ান নং - " + (data.khatianNo || ""));
    setText("ownerName", data.ownerName);
    setText("dagNo", data.dagNo);
    setText("survey", data.survey);
    setText("mouza", data.mouza);
    setText("upazila", data.upazila);
    setText("district", data.district);
    setText("division", data.division);
    setText("recordDate", data.recordDate);

    loader.style.display = "none";
    card.style.display = "block";
  } catch (error) {
    console.error(error);
    showError("Firebase থেকে তথ্য লোড করা যায়নি। Firebase config / database rules চেক করুন।");
  }
}

loadDetails();
