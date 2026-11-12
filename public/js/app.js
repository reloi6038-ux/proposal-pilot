// Shared helpers for the app-shell pages

(function () {
  // Insert the app navbar on pages with <div id="app-nav"></div>
  function renderAppNav(activePage) {
    const host = document.getElementById('app-nav');
    if (!host) return;
    const user = (typeof getStoredUser === 'function' && getStoredUser()) || {};

    host.className = 'app-nav';
    host.innerHTML = `
      <div class="app-nav-inner">
        <a href="/dashboard.html" class="app-brand">
          <span class="dot">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l6-16 4 10 6-6-4 12z"/></svg>
          </span>
          ProposalPilot
        </a>
        <div class="app-nav-links">
          <a href="/dashboard.html" data-page="dashboard">Dashboard</a>
          <a href="/generate.html" data-page="generate">Generate</a>
          <a href="/history.html" data-page="history">History</a>
          <a href="/buy-credits.html" data-page="buy">Buy Credits</a>
          <a href="/profile.html" data-page="profile">Profile</a>
        </div>
        <div class="app-user">
          <span class="pill" id="nav-credit-pill">${user.credits ?? 0} credits</span>
          <a href="#" class="logout" id="app-logout">Logout</a>
        </div>
      </div>
    `;

    const link = host.querySelector(`[data-page="${activePage}"]`);
    if (link) link.classList.add('active');

    host.querySelector('#app-logout').addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof clearAuth === 'function') clearAuth();
      window.location.href = '/login.html';
    });
  }

  // Toast helper
  let toastTimer = null;
  function showToast(message, type = 'success') {
    let el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleString(); }
    catch { return iso; }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    return Promise.resolve();
  }

  window.renderAppNav = renderAppNav;
  window.showToast = showToast;
  window.escapeHtml = escapeHtml;
  window.formatDate = formatDate;
  window.copyToClipboard = copyToClipboard;
})();