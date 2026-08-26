import { authenticatedFetch, getAuthenticatedUser } from "./auth.js";

function limitDate() {
  const today = new Date().toISOString().split("T")[0];
  document.querySelector("#DateInput").setAttribute("max", today);
}

async function getAuthenticatedUserId() {
  const user = await getAuthenticatedUser();
  if (!user?.sub) {
    throw new Error("Please log in before saving a workout.");
  }
  return user.sub;
}

function optionalNumber(selector) {
  const value = document.querySelector(selector)?.value;
  return value === "" || value == null ? null : Number(value);
}

const strengthExerciseFallback = [
    "Bench Press",
    "Squat",
    "Deadlift",
    "Overhead Press",
    "Barbell Row",
    "Pull Ups",
    "Lat Pulldown",
    "Bicep Curl",
    "Tricep Extension",
    "Leg Press",
    "Leg Curl",
    "Leg Extension",
    "Calf Raise",
  "Other"
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function localExerciseMatches(query) {
  const normalised = query.toLowerCase();
  return strengthExerciseFallback.filter((name) => name.toLowerCase().includes(normalised)).map((name) => ({ id: "", name, bodyPart: null, target: null, equipment: null }));
}

function toggleWorkoutFields() {
  const workoutType = document.querySelector('select[name="workout_type"]').value;

  const strengthFields = document.querySelector('.performance-strength');
  const cardioFields = document.querySelector('.performance-cardio');

  if (!strengthFields || !cardioFields) return;

  if (workoutType === "Strength") {
    strengthFields.style.display = "block";
    cardioFields.style.display = "none";
  } else {
    strengthFields.style.display = "none";
    cardioFields.style.display = "block";
  }
}

const form = document.querySelector("#workoutForm");
const workoutTypeSelect = document.querySelector('select[name="workout_type"]');

function exerciseEntry(exercise = {}) {
  const row = document.createElement("div");
  row.className = "exercise-entry performance_row";
  row.innerHTML = `<div class="input_group exercise-picker"><label>Exercise</label><input class="entry-exercise" type="search" value="${escapeHtml(exercise.exercise_name || "")}" placeholder="Search exercises" autocomplete="off" required aria-autocomplete="list" aria-expanded="false"><input class="entry-exercise-id" type="hidden" value="${escapeHtml(exercise.exercise_external_id || "")}"><div class="exercise-suggestions" role="listbox" hidden></div><p class="exercise-help">Search the library, or type a custom exercise.</p></div>
    <div class="input_group sets-group"><label>Sets</label><input class="entry-sets" type="number" min="1" value="${escapeHtml(exercise.sets ?? "")}" inputmode="numeric"></div>
    <div class="input_group reps-group"><label>Reps</label><input class="entry-reps" type="number" min="1" value="${escapeHtml(exercise.reps ?? "")}" inputmode="numeric"></div>
    <div class="input_group weight-group"><label>Weight</label><div class="weight_row"><input class="entry-weight" type="number" min="0" step="0.5" value="${escapeHtml(exercise.weight_value ?? "")}" inputmode="decimal"><select class="entry-unit"><option ${exercise.weight_unit === "lbs" ? "" : "selected"}>kg</option><option ${exercise.weight_unit === "lbs" ? "selected" : ""}>lbs</option></select></div></div>
    ${exercise.rest ? `<div class="entry-rest"><span>Rest: ${exercise.rest}</span><button type="button" class="start-rest">Start timer</button></div>` : ""}
    <button type="button" class="remove-exercise" aria-label="Remove exercise">×</button>`;
  row.querySelector(".remove-exercise").addEventListener("click", () => { if (document.querySelectorAll(".exercise-entry").length > 1) row.remove(); });
  row.querySelector(".start-rest")?.addEventListener("click", (event) => {
    const seconds = Number.parseInt(exercise.rest, 10);
    if (!Number.isFinite(seconds)) return;
    const button = event.currentTarget;
    button.disabled = true;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
      button.textContent = remaining ? `${remaining}s remaining` : "Rest complete";
      if (!remaining) { window.clearInterval(timer); button.disabled = false; }
    }, 250);
    const startedAt = Date.now();
    button.textContent = `${seconds}s remaining`;
  });
  initialiseExerciseSearch(row);
  return row;
}

function initialiseExerciseSearch(row) {
  const input = row.querySelector(".entry-exercise");
  const idInput = row.querySelector(".entry-exercise-id");
  const suggestions = row.querySelector(".exercise-suggestions");
  let timer;

  function selectExercise(exercise) {
    input.value = exercise.name;
    idInput.value = exercise.id || "";
    suggestions.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function renderSuggestions(exercises, query) {
    suggestions.replaceChildren();
    const uniqueExercises = exercises.filter((exercise, index, all) => all.findIndex((item) => item.name.toLowerCase() === exercise.name.toLowerCase()) === index);
    uniqueExercises.forEach((exercise) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "exercise-suggestion";
      button.setAttribute("role", "option");
      const details = [exercise.bodyPart, exercise.target, exercise.equipment].filter(Boolean).join(" · ");
      button.innerHTML = `<strong>${escapeHtml(exercise.name)}</strong>${details ? `<small>${escapeHtml(details)}</small>` : ""}`;
      button.addEventListener("mousedown", (event) => { event.preventDefault(); selectExercise(exercise); });
      suggestions.append(button);
    });
    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "exercise-suggestion exercise-suggestion--custom";
    custom.textContent = `Use “${query}” as a custom exercise`;
    custom.addEventListener("mousedown", (event) => { event.preventDefault(); selectExercise({ id: "", name: query }); });
    suggestions.append(custom);
    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  async function search(query) {
    if (query.length < 2) { suggestions.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
    let exercises = localExerciseMatches(query);
    try {
      const response = await authenticatedFetch(`/api/exercises?q=${encodeURIComponent(query)}`);
      if (response.ok) exercises = await response.json().then((data) => data.exercises || []);
    } catch { /* Local matches and custom entry remain available offline. */ }
    if (input.value.trim() === query) renderSuggestions(exercises, query);
  }

  input.addEventListener("input", () => {
    idInput.value = "";
    const query = input.value.trim();
    window.clearTimeout(timer);
    timer = window.setTimeout(() => search(query), 250);
  });
  input.addEventListener("blur", () => window.setTimeout(() => { suggestions.hidden = true; input.setAttribute("aria-expanded", "false"); }, 150));
}

function addExercise(exercise) { document.querySelector("#exercise-entries").append(exerciseEntry(exercise)); }

document.querySelector("#add-exercise")?.addEventListener("click", () => addExercise());
document.querySelector("#repeat-workout")?.addEventListener("click", async () => {
  try {
    await getAuthenticatedUserId();
    const response = await authenticatedFetch("/api/workouts?limit=1");
    const data = await response.json();
    const previous = data.workouts?.[0];
    if (!response.ok || !previous?.exercises?.length) throw new Error("No prior workout is available yet.");
    const container = document.querySelector("#exercise-entries"); container.replaceChildren();
    previous.exercises.forEach(addExercise);
    document.querySelector('select[name="workout_type"]').value = previous.workout_type || "Strength";
    toggleWorkoutFields();
  } catch (error) { alert(error.message); }
});

workoutTypeSelect.addEventListener("change", () => {
  toggleWorkoutFields();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await getAuthenticatedUserId();
  } catch (error) {
    alert(error.message);
    return;
  }

  const payload = {
    session_date: document.getElementById("DateInput").value,
    duration_value: optionalNumber('input[name="session_duration_hr"]'),
    duration_unit: document.querySelector('select[name="duration_metric"]').value,
    workout_type: document.querySelector('select[name="workout_type"]').value,
    feeling_score: Number(document.getElementById("feelingRange").value),
    avg_bpm: optionalNumber('input[name="avg_bpm"]'),
    max_bpm: optionalNumber('input[name="max_bpm"]'),
    water_intake_l: optionalNumber('input[name="water_intake"]'),
    distance_value: optionalNumber('input[name="distance"]'),
    distance_unit: document.querySelector('select[name="distance_unit"]')?.value || null,
    calories_burned: optionalNumber('input[name="calories"]'),
    avg_pace: optionalNumber('input[name="pace"]'),
    exercises: workoutTypeSelect.value === "Strength" ? [...document.querySelectorAll(".exercise-entry")].map((entry) => ({
      exercise_name: entry.querySelector(".entry-exercise").value,
      exercise_external_id: entry.querySelector(".entry-exercise-id").value || null,
      sets: entry.querySelector(".entry-sets").value === "" ? null : Number(entry.querySelector(".entry-sets").value),
      reps: entry.querySelector(".entry-reps").value === "" ? null : Number(entry.querySelector(".entry-reps").value),
      weight_value: entry.querySelector(".entry-weight").value === "" ? null : Number(entry.querySelector(".entry-weight").value),
      weight_unit: entry.querySelector(".entry-unit").value
    })) : [{ exercise_name: `${workoutTypeSelect.value} session` }]
  };
  const activeSession = JSON.parse(sessionStorage.getItem("liftmetrics_active_plan_session") || "null");
  if (activeSession?.planId != null) Object.assign(payload, { plan_id: activeSession.planId, plan_session_index: activeSession.sessionIndex });

  try {
    const response = await authenticatedFetch("/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      const completion = document.querySelector("#workout-completion");
      completion.hidden = !data.completion;
      completion.textContent = data.completion?.summary || "Workout saved successfully.";
      sessionStorage.removeItem("liftmetrics_active_plan_session");
      console.log(data);
      form.reset();
      document.querySelector("#exercise-entries").replaceChildren();
      addExercise();
      toggleWorkoutFields();
    } else {
      alert(data.errors?.join(" ") || data.error || "Failed to save workout");
      console.error(data);
    }
  } catch (error) {
    console.error("Error submitting workout:", error);
    alert("Server error. Could not save workout.");
  }
});

function allFunctions() {
  limitDate();
  toggleWorkoutFields();
  addExercise();
  const activeSession = JSON.parse(sessionStorage.getItem("liftmetrics_active_plan_session") || "null");
  if (activeSession?.session) {
    const banner = document.querySelector("#active-plan-session");
    banner.hidden = false;
    banner.textContent = `Following your plan: ${activeSession.session.day} · ${activeSession.session.name}. Targets are prefilled below.`;
    document.querySelector("#exercise-entries").replaceChildren();
    activeSession.session.exercises.forEach((exercise) => {
      const match = exercise.prescription.match(/(\d+)\s*x\s*(\d+)/i);
      addExercise({ exercise_name: exercise.name, sets: match?.[1] || null, reps: match?.[2] || null, rest: exercise.rest });
    });
  }
}

window.addEventListener("load", allFunctions);
