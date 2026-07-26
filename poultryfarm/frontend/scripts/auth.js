// auth.js - Talks to the Flask backend for real authentication.
// Passwords are hashed server-side (werkzeug) and a session cookie
// tracks login state, instead of storing plaintext passwords in localStorage.

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function apiGet(path) {
  const res = await fetch(path, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

let cachedUser = null;

async function fetchCurrentUser() {
  const { data } = await apiGet("/api/me");
  cachedUser = data.user || null;
  return cachedUser;
}

function getCurrentUser() {
  return cachedUser;
}

function isLoggedIn() {
  return cachedUser !== null;
}

function authShowToast(message, background = "#4CAF50") {
  const toast = document.createElement("div");
  toast.innerHTML = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: ${background};
    color: white;
    padding: 14px 20px;
    border-radius: 10px;
    z-index: 9999;
    box-shadow: 0 8px 20px rgba(0,0,0,0.18);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

async function registerUser(name, username, email, password, passwordConfirm) {
  if (
    !name.trim() ||
    !username.trim() ||
    !email.trim() ||
    !password.trim() ||
    !passwordConfirm.trim()
  ) {
    return { success: false, message: "Please complete all fields." };
  }
  const { ok, data } = await apiPost("/api/register", {
    name,
    username,
    email,
    password,
    password_confirm: passwordConfirm,
  });
  return { success: ok, message: data.message || data.error };
}

async function loginUser(email, password) {
  const { ok, data } = await apiPost("/api/login", { email, password });
  if (ok) {
    await fetchCurrentUser();
  }
  return { success: ok, message: data.message || data.error };
}

async function requestPasswordReset(email) {
  if (!email.trim()) {
    return { success: false, message: "Please enter your email address." };
  }
  const { ok, data } = await apiPost("/api/forgot-password", { email });
  return { success: ok, message: data.message || data.error };
}

async function resetPassword(token, password, passwordConfirm) {
  if (!token.trim() || !password.trim() || !passwordConfirm.trim()) {
    return { success: false, message: "Please complete all fields." };
  }
  const { ok, data } = await apiPost("/api/reset-password", {
    token,
    password,
    password_confirm: passwordConfirm,
  });
  return { success: ok, message: data.message || data.error };
}

function getNextRedirect(defaultPage = "shop.html") {
  const query = new URLSearchParams(window.location.search);
  return query.get("next") || defaultPage;
}

async function requireLogin(redirectTo = "login.html") {
  await fetchCurrentUser();
  if (!isLoggedIn()) {
    const nextPath = getNextRedirect(window.location.pathname);
    const encoded = encodeURIComponent(
      nextPath || window.location.pathname.replace(/^\//, ""),
    );
    window.location.href = `${redirectTo}?next=${encoded}`;
    return false;
  }
  return true;
}

async function logoutUser() {
  await apiPost("/api/logout");
  cachedUser = null;
  const navLink = document.getElementById("authLink");
  if (navLink) {
    navLink.textContent = "Login";
    navLink.href = "login.html";
  }
  window.location.href = "index.html";
}

function updateAuthNavUI() {
  const authLink = document.getElementById("authLink");
  const authUser = document.getElementById("authUser");
  if (!authLink) return;

  const currentUser = getCurrentUser();
  if (currentUser) {
    authLink.textContent = "Logout";
    authLink.href = "#";
    authLink.onclick = (e) => {
      e.preventDefault();
      logoutUser();
    };
    if (authUser) {
      authUser.textContent = `Hi, ${currentUser.name}`;
      authUser.style.display = "inline-block";
    }
  } else {
    authLink.textContent = "Login";
    authLink.href = "login.html";
    authLink.onclick = null;
    if (authUser) {
      authUser.textContent = "";
      authUser.style.display = "none";
    }
  }
}

function prefillCheckoutFromUser() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const fullName = document.getElementById("fullName");
  const email = document.getElementById("email");
  if (fullName) fullName.value = currentUser.name;
  if (email) email.value = currentUser.email;
}

async function initAuth() {
  await fetchCurrentUser();
  updateAuthNavUI();

  if (window.location.pathname.endsWith("checkout.html")) {
    const okToProceed = await requireLogin("login.html");
    if (!okToProceed) return;
    prefillCheckoutFromUser();
  }
}

// Other scripts (cart.js) can `await window.authReady` before calling
// isLoggedIn() to avoid a race where the session check hasn't finished yet.
window.authReady = new Promise((resolve) => {
  document.addEventListener("DOMContentLoaded", async () => {
    await initAuth();
    resolve();
  });
});
