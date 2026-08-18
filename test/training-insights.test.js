import test from "node:test";
import assert from "node:assert/strict";
import { buildTrainingInsights } from "../server/training-insights.js";

const now = new Date("2026-08-18T12:00:00Z");

test("recommends recovery after consistently high effort", () => {
  const workouts = ["2026-08-17", "2026-08-15", "2026-08-13"].map((session_date) => ({ session_date, feeling_score: 9, exercises: [{ exercise_name: "Squat", sets: 3, reps: 5, weight_value: 100 }] }));
  const insights = buildTrainingInsights(workouts, now);
  assert.equal(insights.recommendation.status, "recover");
  assert.equal(insights.muscleBalance[0].muscle, "Quads");
  assert.ok(insights.progressions[0].estimated_1rm > 100);
});

test("does not show cardio-only entries as strength prescriptions", () => {
  const insights = buildTrainingInsights([{ session_date: "2026-08-17", feeling_score: 5, exercises: [{ exercise_name: "Running", sets: null, reps: null, weight_value: null }] }], now);
  assert.equal(insights.progressions.length, 0);
});

test("gives a baseline recommendation when no workouts exist", () => {
  assert.equal(buildTrainingInsights([], now).recommendation.status, "ready");
});
