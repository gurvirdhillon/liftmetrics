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

async function loadClients() {
  const response = await authenticatedFetch("/api/trainer/clients");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load clients.");
  document.getElementById("trainer-tools").hidden = false;
  list.replaceChildren(...data.clients.map((client) => {
    const card = document.createElement("button"); card.type = "button"; card.className = "trainer-client-card";
    card.innerHTML = `<strong>${client.username || "Client"}</strong><span>${workoutSummary(client)}</span>`;
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
  document.getElementById("client-workouts").textContent = data.workouts.length ? data.workouts.map((workout) => `${workout.session_date}: ${workout.workout_type} (${workout.duration_value || "—"} ${workout.duration_unit || ""})`).join("\n") : "No workouts logged yet.";
  document.getElementById("client-notes").textContent = data.notes.length ? data.notes.map((note) => `${new Date(note.created_at).toLocaleDateString()}: ${note.body}`).join("\n\n") : "No notes yet.";
}

document.getElementById("create-invite-btn").addEventListener("click", async () => { const response = await authenticatedFetch("/api/trainer/invites", { method: "POST" }); const data = await response.json(); if (!response.ok) return status.textContent = data.error || "Could not create invite."; const input = document.getElementById("invite-link"); input.value = `${location.origin}/profile.html?invite=${encodeURIComponent(data.inviteCode)}`; input.hidden = false; input.select(); status.textContent = "Invite link created. Copy and share it with your client."; });
document.getElementById("close-client-btn").addEventListener("click", () => { detail.hidden = true; list.hidden = false; document.getElementById("trainer-tools").hidden = false; });
document.getElementById("note-form").addEventListener("submit", async (event) => { event.preventDefault(); const response = await authenticatedFetch(`/api/trainer/clients/${encodeURIComponent(selectedClientId)}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: document.getElementById("note-body").value }) }); const data = await response.json(); if (!response.ok) return alert(data.error || "Could not save note."); document.getElementById("note-body").value = ""; loadClient(selectedClientId); });
document.getElementById("assign-plan-form").addEventListener("submit", async (event) => { event.preventDefault(); try { const plan = parsePlan(document.getElementById("assigned-title").value, document.getElementById("assigned-text").value); const response = await authenticatedFetch(`/api/trainer/clients/${encodeURIComponent(selectedClientId)}/plans`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not assign plan."); alert("Plan assigned to your client."); event.target.reset(); } catch (error) { alert(error.message); } });

getAuthenticatedUser().then((user) => { if (!user?.sub) throw new Error("Please log in from your profile to use the trainer portal."); return loadClients(); }).catch((error) => { status.textContent = error.message; });
