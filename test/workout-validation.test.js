import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkout } from "../server/workout-validation.js";

const validWorkout = {
  user_id: "auth0|example-user",
  session_date: "2026-08-10",
  duration_value: 45,
  workout_type: "Strength",
  feeling_score: 5,
  exercises: [{ exercise_name: "Squat" }]
};

test("accepts a complete workout", () => {
  assert.deepEqual(validateWorkout(validWorkout), []);
});

test("rejects a workout without authenticated identity", () => {
  assert.match(validateWorkout({ ...validWorkout, user_id: "" }).join(" "), /authenticated user ID/);
});

test("rejects invalid numeric values", () => {
  assert.match(validateWorkout({ ...validWorkout, duration_value: 0 }).join(" "), /Duration/);
});

test("requires a feeling score from zero to ten", () => {
  assert.match(validateWorkout({ ...validWorkout, feeling_score: null }).join(" "), /Feeling score/);
  assert.match(validateWorkout({ ...validWorkout, feeling_score: 11 }).join(" "), /Feeling score/);
});

test("rejects invalid exercise values", () => {
  const workout = { ...validWorkout, exercises: [{ exercise_name: "Squat", sets: -1 }] };
  assert.match(validateWorkout(workout).join(" "), /sets/);
});

test("accepts decimal exercise weights", () => {
  const workout = { ...validWorkout, exercises: [{ exercise_name: "Squat", weight_value: 72.5 }] };
  assert.deepEqual(validateWorkout(workout), []);
});

test("accepts an ExerciseDB identifier and rejects an oversized one", () => {
  assert.deepEqual(validateWorkout({ ...validWorkout, exercises: [{ exercise_name: "Squat", exercise_external_id: "0001" }] }), []);
  assert.match(validateWorkout({ ...validWorkout, exercises: [{ exercise_name: "Squat", exercise_external_id: "x".repeat(101) }] }).join(" "), /exercise_external_id/);
});
