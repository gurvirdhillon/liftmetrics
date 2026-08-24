import test from "node:test";
import assert from "node:assert/strict";
import { comparePlanCompletion } from "../server/plan-completion.js";

test("compares completed exercises with the selected planned session", () => {
  const result = comparePlanCompletion({ exercises: [{ name: "Squat" }, { name: "Leg Press" }] }, [{ exercise_name: "Squat" }, { exercise_name: "Calf Raise" }]);
  assert.equal(result.completedAsPlanned, 1);
  assert.deepEqual(result.skippedExercises, ["Leg Press"]);
  assert.deepEqual(result.extraExercises, ["Calf Raise"]);
});
