import { authenticatedFetch, getAuthenticatedUser } from "./auth.js";

const status = document.getElementById("trainer-status");
const list = document.getElementById("client-list");
const detail = document.getElementById("client-detail");
let selectedClientId;

function parsePlan(title, text) {
  const grouped = new Map();
  text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => {
    const [day, name, exercise, prescription, rest] = line.split("|").map((part) => part.trim());
    if (!day || !name || !exercise || !prescription) throw new Error("Each plan line needs Day | Session | Exercise | Sets/reps.");
    const key = `${day}\u0000${name}`;
    if (!grouped.has(key)) grouped.set(key, { day, name, exercises: [] });
    grouped.get(key).exercises.push({ name: exercise, prescription, rest: rest || "Not specified" });
  });
  if (!grouped.size) throw new Error("Add at least one exercise.");
  return { title: title.trim(), sessions: [...grouped.values()] };
}

function workoutSummary(client) {
  return `${client.workout_count} workouts logged · Last workout: ${client.last_workout_date || "not yet logged"}`;
}

function formatDate(value) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No sessions yet";
}

function recentWorkouts(client) {
  const lastWorkout = client.last_workout_date ? Math.floor((Date.now() - new Date(`${client.last_workout_date}T00:00:00`)) / 86400000) : null;
  return lastWorkout === null ? "No workout logged yet" : lastWorkout === 0 ? "Trained today" : lastWorkout === 1 ? "Trained yesterday" : `Last trained ${lastWorkout} days ago`;
}

async function loadClients() {
  const response = await authenticatedFetch("/api/trainer/clients");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load clients.");
  document.getElementById("trainer-tools").hidden = false;
  list.replaceChildren(...data.clients.map((client) => {
    const card = document.createElement("button"); card.type = "button"; card.className = "trainer-client-card";
    const name = document.createElement("strong"); name.textContent = client.username || "Client";
    const detail = document.createElement("span"); detail.textContent = workoutSummary(client);
    const activity = document.createElement("small"); activity.textContent = recentWorkouts(client);
    card.append(name, detail, activity);
    card.addEventListener("click", () => loadClient(client.client_id)); return card;
  }));
  status.textContent = data.clients.length ? `${data.clients.length} connected client${data.clients.length === 1 ? "" : "s"}.` : "No clients yet. Create an invite link to get started.";
}

async function loadClient(clientId) {
  const response = await authenticatedFetch(`/api/trainer/clients/${encodeURIComponent(clientId)}`);
  const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load client.");
  selectedClientId = clientId; detail.hidden = false; list.hidden = true; document.getElementById("trainer-tools").hidden = true;
  document.getElementById("client-name").textContent = data.client.username || "Client";
  document.getElementById("client-summary").textContent = workoutSummary(data.client);
  const workouts = data.workouts || [];
  const weeklyCount = workouts.filter((workout) => (Date.now() - new Date(`${workout.session_date}T00:00:00`)) <= 7 * 86400000).length;
  const averageEffort = workouts.length ? Math.round(workouts.reduce((total, workout) => total + Number(workout.feeling_score || 0), 0) / workouts.length) : null;
  document.getElementById("client-metrics").replaceChildren(...[
    ["Last session", formatDate(workouts[0]?.session_date)],
    ["Last 7 days", `${weeklyCount} session${weeklyCount === 1 ? "" : "s"}`],
    ["Average effort", averageEffort === null ? "—" : `${averageEffort}/10`]
  ].map(([label, value]) => { const metric = document.createElement("div"); metric.innerHTML = `<span>${label}</span><strong>${value}</strong>`; return metric; }));
  const chart = document.getElementById("client-progress-chart");
  chart.replaceChildren(...[...workouts].reverse().map((workout) => {
    const bar = document.createElement("div"); bar.className = "client-progress-bar";
    const duration = Number(workout.duration_value) || 0;
    bar.style.setProperty("--bar-height", `${Math.max(14, Math.min(100, duration))}%`);
    bar.title = `${formatDate(workout.session_date)}: ${duration || "—"} ${workout.duration_unit || ""}`;
    bar.innerHTML = `<span>${formatDate(workout.session_date)}</span>`; return bar;
  }));
  document.getElementById("client-workouts").textContent = workouts.length ? workouts.map((workout) => `${formatDate(workout.session_date)} · ${workout.workout_type} · ${workout.duration_value || "—"} ${workout.duration_unit || ""} · Effort ${workout.feeling_score ?? "—"}/10`).join("\n") : "No workouts logged yet.";
  document.getElementById("client-notes").textContent = data.notes.length ? data.notes.map((note) => `${new Date(note.created_at).toLocaleDateString()}: ${note.body}`).join("\n\n") : "No notes yet.";
}

document.getElementById("create-invite-btn").addEventListener("click", async () => { const response = await authenticatedFetch("/api/trainer/invites", { method: "POST" }); const data = await response.json(); if (!response.ok) return status.textContent = data.error || "Could not create invite."; const input = document.getElementById("invite-link"); input.value = `${location.origin}/profile.html?invite=${encodeURIComponent(data.inviteCode)}`; input.hidden = false; input.select(); status.textContent = "Invite link created. Copy and share it with your client."; });
document.getElementById("close-client-btn").addEventListener("click", () => { detail.hidden = true; list.hidden = false; document.getElementById("trainer-tools").hidden = false; });
document.getElementById("note-form").addEventListener("submit", async (event) => { event.preventDefault(); const response = await authenticatedFetch(`/api/trainer/clients/${encodeURIComponent(selectedClientId)}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: document.getElementById("note-body").value }) }); const data = await response.json(); if (!response.ok) return alert(data.error || "Could not save note."); document.getElementById("note-body").value = ""; loadClient(selectedClientId); });
document.getElementById("assign-plan-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const plan = parsePlan(document.getElementById("assigned-title").value, document.getElementById("assigned-text").value); const response = await authenticatedFetch(`/api/trainer/clients/${encodeURIComponent(selectedClientId)}/plans`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not assign plan."); alert("Plan assigned to your client."); event.target.reset(); } catch (error) { alert(error.message); } });

getAuthenticatedUser().then((user) => { if (!user?.sub) throw new Error("Please log in from your profile to use the trainer portal."); return loadClients(); }).catch((error) => { status.textContent = error.message; });
