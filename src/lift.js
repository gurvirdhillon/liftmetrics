function limitDate() {
  const today = new Date().toISOString().split("T")[0];
  document.querySelector("#DateInput").setAttribute("max", today);
}

function getOrMakeUserId() {
  let userId = localStorage.getItem("liftmetrics_user_id");
  if (!userId) {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    userId = `${randomNumber}`;
    localStorage.setItem("liftmetrics_user_id", userId);
  }
  return userId;
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

  const payload = {
    user_id: getOrMakeUserId(),
    session_date: document.getElementById("DateInput").value,
    duration_value: document.querySelector('input[name="session_duration_hr"]').value,
    duration_unit: document.querySelector('select[name="duration_metric"]').value,
    workout_type: document.querySelector('select[name="workout_type"]').value,
    feeling_score: document.getElementById("feelingRange").value,
    avg_bpm: document.querySelector('input[name="avg_bpm"]').value || null,
    max_bpm: document.querySelector('input[name="max_bpm"]').value || null,
    water_intake_l: document.querySelector('input[name="water_intake"]').value || null,
    exercises: [
      {
        exercise_name: document.querySelector('select[name="exercise"]').value,
        sets: document.querySelector('input[name="sets"]')?.value || null,
        reps: document.querySelector('input[name="reps"]')?.value || null,
        weight_value: document.querySelector('input[name="weight"]')?.value || null,
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
      alert(data.error || "Failed to save workout");
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