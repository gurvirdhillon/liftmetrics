import { getAuthenticatedUser, handleAuthRedirect, login, logout } from "./auth.js";

async function updateAuthUI() {
  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const user = await getAuthenticatedUser();

  if (loginBtn) loginBtn.disabled = Boolean(user);
  if (logoutBtn) logoutBtn.disabled = !user;

  const nameEl = document.getElementById("user-name");
  if (nameEl) nameEl.textContent = user?.name || user?.nickname || user?.email || "Guest";
}

function setupListeners() {
  document.getElementById("login")?.addEventListener("click", login);
  document.getElementById("logout")?.addEventListener("click", logout);
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
