let installPrompt = null;

function isAppleMobile() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function showInstallUI() {
  if (isStandalone()) return;
  const container = document.createElement("section");
  container.className = "pwa-install";
  container.setAttribute("aria-live", "polite");
  container.hidden = true;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Install LiftMetrics";
  button.hidden = true;
  const message = document.createElement("p");
  message.hidden = true;
  container.append(button, message);
  document.body.append(container);

  if (isAppleMobile()) {
    container.hidden = false;
    button.hidden = true;
    message.hidden = false;
    message.textContent = "To install LiftMetrics, choose Share, then Add to Home Screen.";
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    container.hidden = false;
    button.hidden = false;
  });

  button.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") button.hidden = true;
    installPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    container.remove();
    installPrompt = null;
  });
}

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker registration failed:", error));
  }
  showInstallUI();
});
