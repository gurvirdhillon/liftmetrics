import test from "node:test";
import assert from "node:assert/strict";
import { findRestrictedExercises, validateImportedPlan } from "../server/plan-import.js";

const plan = { title: "Coach plan", sessions: [{ day: "Mon", name: "Upper", exercises: [{ name: "Bench press", prescription: "3 x 8", rest: "90 sec" }] }] };

test("normalises an imported workout plan", () => {
  const result = validateImportedPlan(plan);
  assert.equal(result.source, "uploaded");
  assert.equal(result.sessions[0].exercises[0].name, "Bench press");
});

test("rejects empty imported sessions", () => {
  assert.throws(() => validateImportedPlan({ ...plan, sessions: [{ day: "Mon", name: "Upper", exercises: [] }] }), /must include/);
});

test("flags imported exercises that match a saved restriction without changing the plan", () => {
  const result = findRestrictedExercises(validateImportedPlan(plan), "bench press, overhead press");
  assert.deepEqual(result, ["Bench press"]);
});
