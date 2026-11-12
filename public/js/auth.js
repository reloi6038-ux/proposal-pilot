// Shared auth + API helper for all pages

const TOKEN_KEY = 'pp_token';
const USER_KEY = 'pp_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); }
  catch { return null; }
}

function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  if (getToken()) {
    window.location.href = '/dashboard.html';
  }
}

/**
 * Wrapper around fetch that attaches the JWT and parses JSON.
 * Redirects to login on 401.
 */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login.html';
    return { ok: false, status: 401, data: { message: 'Session expired' } };
  }

  let data = null;
  try { data = await res.json(); } catch (_) { /* empty body */ }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Update the navbar to show user email and logout button.
 * Call on every authenticated page.
 */
function renderNavbar() {
  const user = getStoredUser();
  const emailEl = document.getElementById('nav-email');
  const logoutEl = document.getElementById('nav-logout');
  const loginEl = document.getElementById('nav-login');
  const registerEl = document.getElementById('nav-register');

  if (user) {
    if (emailEl) emailEl.textContent = user.email;
    if (logoutEl) {
      logoutEl.classList.remove('hidden');
      logoutEl.addEventListener('click', (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = '/login.html';
      });
    }
    if (loginEl) loginEl.classList.add('hidden');
    if (registerEl) registerEl.classList.add('hidden');
  } else {
    if (logoutEl) logoutEl.classList.add('hidden');
    if (emailEl) emailEl.classList.add('hidden');
  }
}

/**
 * Show a message inside an alert element.
 */
function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'alert';
}