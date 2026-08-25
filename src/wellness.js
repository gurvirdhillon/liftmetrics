import { authenticatedFetch, getAuthenticatedUser } from "./auth.js";

const labels = {
  sleep_quality: ["Very poor", "Poor", "Okay", "Good", "Excellent"],
  energy_score: ["Very low", "Low", "Okay", "Good", "High"],
  soreness_score: ["None", "Mild", "Moderate", "High", "Very high"],
  stress_score: ["Very low", "Low", "Moderate", "High", "Very high"]
};

function renderScores() {
  Object.entries(labels).forEach(([name, options]) => {
    const group = document.querySelector(`[data-score-group="${name}"]`);
    group.innerHTML = options.map((label, index) => `<label><input type="radio" name="${name}" value="${index + 1}" ${index === 2 ? "checked" : ""}><span>${index + 1}</span><small>${label}</small></label>`).join("");
  });
}

function readinessText(checkin) {
  const score = Number(checkin.readiness_score);
  if (score >= 4) return { title: "Ready", detail: "You look set for your planned workout." };
  if (score >= 2.8) return { title: "Steady", detail: "A normal session is fine—listen to your body." };
  return { title: "Recover", detail: "Consider lighter activity or rest today." };
}

function showReadiness(checkin) {
  const container = document.getElementById("wellness-readiness");
  const { title, detail } = readinessText(checkin);
  container.hidden = false;
  container.innerHTML = `<p>Today’s readiness</p><strong>${title}</strong><span>${detail}</span>`;
}

async function loadToday() {
  const response = await authenticatedFetch("/api/wellness/today");
  if (!response.ok) return;
  const { checkin } = await response.json();
  if (!checkin) return;
  document.getElementById("sleep-hours").value = checkin.sleep_hours;
  ["sleep_quality", "energy_score", "soreness_score", "stress_score"].forEach((name) => {
    document.querySelector(`input[name="${name}"][value="${checkin[name]}"]`).checked = true;
  });
  document.getElementById("wellness-notes").value = checkin.notes || "";
  showReadiness(checkin);
}

window.addEventListener("load", async () => {
  if (!await getAuthenticatedUser()) { window.location.replace("index.html"); return; }
  renderScores();
  await loadToday();
  document.getElementById("wellness-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    ["sleep_hours", "sleep_quality", "energy_score", "soreness_score", "stress_score"].forEach((key) => { payload[key] = Number(payload[key]); });
    const status = document.getElementById("wellness-status");
    status.textContent = "Saving…";
    const response = await authenticatedFetch("/api/wellness/today", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) { status.textContent = data.error || "Could not save your check-in."; return; }
    showReadiness(data.checkin);
    status.textContent = "Check-in saved.";
  });
});
