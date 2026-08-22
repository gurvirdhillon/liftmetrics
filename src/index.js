import { getAuthenticatedUser, handleAuthRedirect, login, logout } from "./auth.js";

let isAuthenticated = false;

async function updateAuthUI() {
  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const user = await getAuthenticatedUser();
  const loginPrompt = document.getElementById("login-prompt");
  isAuthenticated = Boolean(user);

  if (loginBtn) loginBtn.disabled = isAuthenticated;
  if (logoutBtn) logoutBtn.disabled = !isAuthenticated;
  if (loginPrompt) loginPrompt.hidden = isAuthenticated;

  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = user?.name || user?.nickname || user?.email || "Guest";
}

function setupListeners() {
  document.getElementById("login")?.addEventListener("click", login);
  document.getElementById("logout")?.addEventListener("click", logout);

  document.querySelectorAll("[data-auth-required]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (isAuthenticated) return;

      event.preventDefault();
      window.alert("Please log in before using LiftMetrics features.");
    });
  });
}

window.addEventListener("load", async () => {
  try {
    await handleAuthRedirect();
    setupListeners();
    await updateAuthUI();
  } catch (error) {
    console.error("Auth setup failed:", error);
  }
});
