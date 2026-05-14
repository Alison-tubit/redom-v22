/* =========================================================
   BANGLA DATE SYSTEM
   - Shows Bangla calendar date and English date in top bar
   - Used by both index.html and details.html
========================================================= */
(function () {
  const autoDate = document.getElementById('autoDate');
  if (!autoDate) return;

  function toBn(n) {
    return String(n).replace(/[0-9]/g, d => ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][d]);
  }

  const bnDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const enMBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const bnM = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];

  function getBD(date) {
    let y = date.getFullYear();
    let start = new Date(y, 3, 14);
    let by = y - 593;

    if (date < start) {
      y--;
      start = new Date(y, 3, 14);
      by = y - 593;
    }

    let d = Math.floor((date - start) / 86400000) + 1;
    let mi = 0;

    for (const l of [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30]) {
      if (d > l) {
        d -= l;
        mi++;
      } else {
        break;
      }
    }

    return { day: d, month: bnM[mi], year: by };
  }

  const t = new Date();
  const bd = getBD(t);

  autoDate.textContent = `${bnDays[t.getDay()]}, ${toBn(bd.day)} ${bd.month} ${toBn(bd.year)}, ${toBn(t.getDate())} ${enMBn[t.getMonth()]} ${toBn(t.getFullYear())}`;
})();
