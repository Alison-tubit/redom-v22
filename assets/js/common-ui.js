/* =========================================================
   COMMON UI SYSTEM
   - Cart drawer
   - Three-dot side menu
   - Shared by index.html and details.html
========================================================= */
(function () {
  const cartBtn = document.querySelector('.cart-btn');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartClose = document.getElementById('cartClose');
  const applicationType = document.getElementById('applicationType');

  function openCart() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.add('show');
    cartOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.remove('show');
    cartOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (cartBtn) {
    cartBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openCart();
    });
  }

  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  document.querySelectorAll('.cart-tab').forEach(btn => {
    btn.addEventListener('click', function () {
      const parent = this.parentElement;
      if (!parent) return;

      parent.querySelectorAll('.cart-tab').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      if (!applicationType) return;
      if (this.dataset.tab === 'map') applicationType.style.display = 'none';
      if (this.dataset.tab === 'khatian') applicationType.style.display = 'block';
    });
  });

  const dotsIcon = document.querySelector('.dots-icon');
  const sideMenu = document.getElementById('sideMenu');
  const menuOverlay = document.getElementById('menuOverlay');

  function openSideMenu() {
    if (!sideMenu || !menuOverlay) return;
    sideMenu.classList.add('show');
    menuOverlay.classList.add('show');
    document.body.classList.add('menu-open');
  }

  function closeSideMenu() {
    if (!sideMenu || !menuOverlay) return;
    sideMenu.classList.remove('show');
    menuOverlay.classList.remove('show');
    document.body.classList.remove('menu-open');
  }

  if (dotsIcon) {
    dotsIcon.addEventListener('click', function (e) {
      e.preventDefault();
      if (sideMenu && sideMenu.classList.contains('show')) closeSideMenu();
      else openSideMenu();
    });
  }

  if (menuOverlay) menuOverlay.addEventListener('click', closeSideMenu);

  document.querySelectorAll('.menu-toggle').forEach(btn => {
    btn.addEventListener('click', function () {
      this.classList.toggle('active');
      const nextBox = this.nextElementSibling;
      if (nextBox) nextBox.classList.toggle('show');
    });
  });

  if (sideMenu) {
    sideMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeSideMenu);
    });
  }
})();
