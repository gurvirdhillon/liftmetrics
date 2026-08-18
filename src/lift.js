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

function updateExerciseOptions() {
  const workoutType = document.querySelector('select[name="workout_type"]').value;
  const exerciseSelect = document.querySelector('select[name="exercise"]');

  const exercises = exerciseOptions[workoutType] || ["Other"];

  exerciseSelect.innerHTML = '<option value="">Select Exercise</option>';

  exercises.forEach((exercise) => {
    const option = document.createElement("option");
    option.value = exercise;
    option.textContent = exercise;
    exerciseSelect.appendChild(option);
  });
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

workoutTypeSelect.addEventListener("change", () => {
  toggleWorkoutFields();
  updateExerciseOptions();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let userId;
  try {
    userId = await getAuthenticatedUserId();
  } catch (error) {
    alert(error.message);
    return;
  }

  const payload = {
    user_id: userId,
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
    exercises: [
      {
        exercise_name: document.querySelector('select[name="exercise"]').value,
        sets: optionalNumber('input[name="sets"]'),
        reps: optionalNumber('input[name="reps"]'),
        weight_value: optionalNumber('input[name="weight"]'),
        weight_unit: document.querySelector('select[name="weight_metric"]')?.value || null
      }
    ]
  };

  try {
    const response = await fetch("http://localhost:8080/api/workouts", {
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
      toggleWorkoutFields();
      updateExerciseOptions();
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
  updateExerciseOptions();
}

window.addEventListener("load", allFunctions);
import { getAuthenticatedUser } from "./auth.js";
