const numericFields = [
  "duration_value",
  "feeling_score",
  "avg_bpm",
  "max_bpm",
  "water_intake_l",
  "distance_value",
  "calories_burned",
  "avg_pace"
];

export function validateWorkout(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["A workout payload is required."];
  }

  if (typeof payload.user_id !== "string" || !payload.user_id.trim() || payload.user_id.length > 100) {
    errors.push("A valid authenticated user ID is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.session_date || "") || Number.isNaN(Date.parse(payload.session_date))) {
    errors.push("A valid workout date is required.");
  }

  if (typeof payload.workout_type !== "string" || !payload.workout_type.trim()) {
    errors.push("A workout type is required.");
  }

  if (typeof payload.duration_value !== "number" || !Number.isFinite(payload.duration_value) || payload.duration_value <= 0) {
    errors.push("Duration must be a positive number.");
  }

  for (const field of numericFields.filter((field) => field !== "duration_value")) {
    if (payload[field] != null && (typeof payload[field] !== "number" || !Number.isFinite(payload[field]) || payload[field] < 0)) {
      errors.push(`${field} must be a non-negative number.`);
    }
  }

  if (payload.feeling_score != null && payload.feeling_score > 10) {
    errors.push("Feeling score cannot be greater than 10.");
  }

  if (!Array.isArray(payload.exercises) || payload.exercises.length === 0 || !payload.exercises[0]?.exercise_name?.trim()) {
    errors.push("At least one exercise is required.");
  }

  for (const exercise of payload.exercises || []) {
    if (typeof exercise.exercise_name !== "string" || !exercise.exercise_name.trim() || exercise.exercise_name.length > 100) {
      errors.push("exercise_name must be between 1 and 100 characters.");
    }
    if (exercise.exercise_external_id != null && (typeof exercise.exercise_external_id !== "string" || exercise.exercise_external_id.length > 100)) {
      errors.push("exercise_external_id must be no more than 100 characters.");
    }
    for (const field of ["sets", "reps", "weight_value"]) {
      if (exercise[field] != null && (typeof exercise[field] !== "number" || !Number.isFinite(exercise[field]) || exercise[field] < 0)) {
        errors.push(`${field} must be a non-negative number.`);
      }
    }
  }

  return errors;
}
