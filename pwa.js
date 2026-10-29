// ================================================================
// pwa.js - Perilaku khusus PWA (dimuat setelah script utama index.html)
//  - Registrasi service worker
//  - Banner offline
//  - Latar gelap sidebar
//  - Bottom navigation Handphone
//  - Tombol "Pasang Aplikasi" (Android/Chrome & petunjuk iOS)
// ================================================================
(function () {
  'use strict';

  // ---------- Service worker ----------
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (e) { console.warn('SW gagal:', e); });
    });
  }

  // ---------- Banner offline ----------
  var banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.textContent = '⚠️ Tidak ada koneksi internet';
  document.body.appendChild(banner);
  function updateOnline() { banner.classList.toggle('show', navigator.onLine === false); }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  // ---------- Latar gelap saat sidebar terbuka (Handphone) ----------
  var sidebar = document.getElementById('sidebar');
  if (sidebar && window.MutationObserver) {
    new MutationObserver(function () {
      document.body.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
    }).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
  }

  // ---------- Pasang aplikasi ----------
  // Logika instal (beforeinstallprompt, tombol di panel login, panduan manual) ada di index.html
  // (window.installApp). Di sini hanya item "Pasang Aplikasi" di menu samping.
  function isStandalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }

  var footer = document.querySelector('.sidebar-footer');
  if (footer && !isStandalone()) {
    var item = document.createElement('div');
    item.className = 'nav-item';
    item.id = 'installNavItem';
    item.innerHTML = '<span class="icon">📲</span><span>Pasang Aplikasi</span>';
    item.addEventListener('click', function () { if (typeof window.installApp === 'function') window.installApp(); });
    footer.insertBefore(item, footer.firstChild);
  }
  window.addEventListener('appinstalled', function () {
    var a = document.getElementById('installNavItem');
    if (a) a.style.display = 'none';
  });

  // ---------- Bottom navigation ----------
  var appContainer = document.getElementById('appContainer');
  var nav = document.createElement('nav');
  nav.id = 'bottomNav';
  nav.setAttribute('aria-label', 'Navigasi utama');
  (appContainer || document.body).appendChild(nav);

  function navItems() {
    if (typeof isJemaat === 'function' && isJemaat()) return [];
    var canCheckin = typeof hasPermission === 'function' && hasPermission('attendance.create');
    return [
      { id: 'dashboard', icon: '📊', label: 'Beranda' },
      { id: 'members', icon: '👥', label: 'Jemaat' },
      canCheckin ? { id: 'checkin', icon: '🙋', label: 'Check-in' } : { id: 'attendance', icon: '📈', label: 'Kehadiran' },
      { id: '__menu', icon: '☰', label: 'Menu' }
    ];
  }

  function renderBottomNav() {
    var items = navItems();
    var page = (window.APP && APP.currentPage) || '';
    nav.innerHTML = items.map(function (it) {
      var active = it.id === page ? ' active' : '';
      return '<button type="button" class="' + active.trim() + '" data-nav="' + it.id + '">' +
        '<span class="bn-icon">' + it.icon + '</span><span>' + it.label + '</span></button>';
    }).join('');
  }

  nav.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-nav]');
    if (!b) return;
    var id = b.getAttribute('data-nav');
    if (id === '__menu') {
      e.stopPropagation(); // jangan langsung ditutup oleh handler klik-luar
      document.getElementById('sidebar').classList.toggle('open');
    } else {
      navigateTo(id);
    }
  });

  // Sinkronkan bottom nav setiap kali sidebar dirender ulang (login, pindah halaman, sync).
  if (typeof window.renderSidebar === 'function') {
    var originalRenderSidebar = window.renderSidebar;
    window.renderSidebar = function () {
      originalRenderSidebar.apply(this, arguments);
      renderBottomNav();
    };
  }
  renderBottomNav();
})();
