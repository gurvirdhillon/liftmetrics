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

const exerciseOptions = {
  Strength: [
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
  ],
  Cardio: [
    "Treadmill",
    "Running",
    "Cycling",
    "Rowing",
    "Elliptical",
    "Stairmaster",
    "Walking",
    "Swimming",
    "Other"
  ],
  HIIT: [
    "Burpees",
    "Mountain Climbers",
    "Jump Rope",
    "Battle Ropes",
    "Sprints",
    "Circuit Training",
    "Other"
  ],
  Mobility: [
    "Stretching",
    "Yoga",
    "Foam Rolling",
    "Dynamic Warmup",
    "Mobility Flow",
    "Other"
  ],
  Recovery: [
    "Walking",
    "Light Cycling",
    "Stretching",
    "Foam Rolling",
    "Recovery Jog",
    "Other"
  ],
  Sports: [
    "Football",
    "Basketball",
    "Tennis",
    "Boxing",
    "Rugby",
    "Cricket",
    "Swimming",
    "Other"
  ]
};

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
  row.innerHTML = `<div class="input_group"><label>Exercise</label><select class="entry-exercise" required>${exerciseOptions.Strength.map((name) => `<option ${name === exercise.exercise_name ? "selected" : ""}>${name}</option>`).join("")}</select></div>
    <div class="input_group"><label>Sets</label><input class="entry-sets" type="number" min="1" value="${exercise.sets ?? ""}" inputmode="numeric"></div>
    <div class="input_group"><label>Reps</label><input class="entry-reps" type="number" min="1" value="${exercise.reps ?? ""}" inputmode="numeric"></div>
    <div class="input_group weight-group"><label>Weight</label><div class="weight_row"><input class="entry-weight" type="number" min="0" step="0.5" value="${exercise.weight_value ?? ""}" inputmode="decimal"><select class="entry-unit"><option ${exercise.weight_unit === "lbs" ? "" : "selected"}>kg</option><option ${exercise.weight_unit === "lbs" ? "selected" : ""}>lbs</option></select></div></div>
    <button type="button" class="remove-exercise" aria-label="Remove exercise">×</button>`;
  row.querySelector(".remove-exercise").addEventListener("click", () => { if (document.querySelectorAll(".exercise-entry").length > 1) row.remove(); });
  return row;
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
      sets: entry.querySelector(".entry-sets").value === "" ? null : Number(entry.querySelector(".entry-sets").value),
      reps: entry.querySelector(".entry-reps").value === "" ? null : Number(entry.querySelector(".entry-reps").value),
      weight_value: entry.querySelector(".entry-weight").value === "" ? null : Number(entry.querySelector(".entry-weight").value),
      weight_unit: entry.querySelector(".entry-unit").value
    })) : [{ exercise_name: `${workoutTypeSelect.value} session` }]
  };

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
      alert("Workout saved successfully");
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
}

window.addEventListener("load", allFunctions);
