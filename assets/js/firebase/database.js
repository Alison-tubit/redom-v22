/* =========================================================
   FIREBASE DATABASE INITIALIZATION
   - Initializes Firebase App once.
   - Exports Realtime Database instance for all pages.
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { firebaseConfig } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Analytics only works in supported browser environments.
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch(() => {
  // Analytics support check failed; database features will still work.
});
