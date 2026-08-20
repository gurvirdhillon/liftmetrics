import { authenticatedFetch, getAuthenticatedUser } from "./auth.js";

const list = document.getElementById("history-list");
const status = document.getElementById("history-status");
const filters = document.getElementById("history-filters");
let currentUserId;

function valueOrDash(value) {
  return value == null || value === "" ? "—" : value;
}

function formatSessionDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return valueOrDash(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatExercise(exercise) {
  const details = [];
  if (exercise.sets != null) details.push(`${exercise.sets} sets`);
  if (exercise.reps != null) details.push(`${exercise.reps} reps`);
  if (exercise.weight_value != null) details.push(`${exercise.weight_value} ${exercise.weight_unit || "kg"}`);
  return `${exercise.exercise_name}${details.length ? ` — ${details.join(" · ")}` : ""}`;
}

function createDetail(label, value) {
  const item = document.createElement("li");
  item.textContent = `${label}: ${valueOrDash(value)}`;
  return item;
}

function createWorkoutCard(workout) {
  const card = document.createElement("article");
  card.className = "history-card";
  const heading = document.createElement("h2");
  heading.textContent = `${formatSessionDate(workout.session_date)} · ${workout.workout_type}`;

  const details = document.createElement("ul");
  details.className = "history-details";
  details.append(
    createDetail("Duration", `${workout.duration_value} ${workout.duration_unit}`),
    createDetail("Effort", `${workout.feeling_score}/10`)
  );
  if (workout.distance_value != null) details.append(createDetail("Distance", `${workout.distance_value} ${workout.distance_unit || ""}`));
  if (workout.calories_burned != null) details.append(createDetail("Calories", workout.calories_burned));
  if (workout.avg_bpm != null) details.append(createDetail("Average BPM", workout.avg_bpm));

  const exerciseTitle = document.createElement("h3");
  exerciseTitle.textContent = "Exercises";
  const exercises = document.createElement("ul");
  exercises.className = "history-exercises";
  workout.exercises.forEach((exercise) => {
    const item = document.createElement("li");
    item.textContent = formatExercise(exercise);
    exercises.appendChild(item);
  });

  const actions = document.createElement("div");
  actions.className = "history-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Edit session";
  edit.addEventListener("click", () => showEditForm(card, workout));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "danger-button";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => deleteWorkout(workout.session_id));
  actions.append(edit, remove);
  card.append(heading, details, exerciseTitle, exercises, actions);
  return card;
}

function showEditForm(card, workout) {
  const form = document.createElement("form");
  form.className = "history-edit-form";
  form.innerHTML = `
    <label>Date <input name="session_date" type="date" value="${workout.session_date}" required></label>
    <label>Duration <input name="duration_value" type="number" min="0.1" step="0.1" value="${workout.duration_value}" required></label>
    <label>Unit <select name="duration_unit"><option ${workout.duration_unit === "mins" ? "selected" : ""}>mins</option><option ${workout.duration_unit === "hours" ? "selected" : ""}>hours</option></select></label>
    <label>Workout type <select name="workout_type">${["Strength", "Cardio", "HIIT", "Mobility", "Sports", "Recovery"].map((type) => `<option ${workout.workout_type === type ? "selected" : ""}>${type}</option>`).join("")}</select></label>
    <label>Effort (0–10) <input name="feeling_score" type="number" min="0" max="10" step="1" value="${workout.feeling_score}" required></label>
    <button type="submit">Save changes</button><button type="button">Cancel</button>`;
  form.querySelector('button[type="button"]').addEventListener("click", () => form.remove());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const response = await authenticatedFetch(`/api/workouts/${workout.session_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_date: data.get("session_date"),
        duration_value: Number(data.get("duration_value")),
        duration_unit: data.get("duration_unit"),
        workout_type: data.get("workout_type"),
        feeling_score: Number(data.get("feeling_score"))
      })
    });
    const result = await response.json();
    if (!response.ok) return alert(result.error || "Could not update workout.");
    loadHistory();
  });
  card.append(form);
}

async function deleteWorkout(sessionId) {
  if (!window.confirm("Delete this workout? This cannot be undone.")) return;
  const response = await authenticatedFetch(`/api/workouts/${sessionId}`, { method: "DELETE" });
  if (!response.ok) {
    const result = await response.json();
    return alert(result.error || "Could not delete workout.");
  }
  loadHistory();
}

async function loadHistory() {
  try {
    status.textContent = "Loading workouts…";
    const query = new URLSearchParams(new FormData(filters));
    query.set("limit", "50");
    const response = await authenticatedFetch(`/api/workouts?${query}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load workout history.");
    list.replaceChildren();
    if (!result.workouts.length) {
      status.textContent = "No workouts match these filters.";
      return;
    }
    status.textContent = `${result.workouts.length} workout${result.workouts.length === 1 ? "" : "s"} found.`;
    list.append(...result.workouts.map(createWorkoutCard));
  } catch (error) {
    status.textContent = error.message;
  }
}

filters.addEventListener("submit", (event) => {
  event.preventDefault();
  loadHistory();
});
document.getElementById("clear-filters").addEventListener("click", () => {
  filters.reset();
  loadHistory();
});

getAuthenticatedUser().then((user) => {
  if (!user?.sub) throw new Error("Please log in from your profile to view workout history.");
  currentUserId = user.sub;
  return loadHistory();
}).catch((error) => {
  status.textContent = error.message;
});
