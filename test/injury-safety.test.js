import test from "node:test";
import assert from "node:assert/strict";
import { applyInjurySafety } from "../server/injury-safety.js";

const baseInsights = { recommendation: { status: "ready", title: "Train", detail: "Normal guidance." }, progressions: [{ exercise: "Bench Press" }, { exercise: "Squat" }] };

test("removes user-restricted movements from the next session", () => {
  const result = applyInjurySafety(baseInsights, { affected_area: "Shoulder", pain_score: 2, restricted_movements: "bench press" });
  assert.equal(result.safety.mode, "avoid");
  assert.deepEqual(result.insights.progressions.map((item) => item.exercise), ["Squat"]);
});

test("pauses training recommendations for high reported pain", () => {
  const result = applyInjurySafety(baseInsights, { affected_area: "Knee", pain_score: 5, restricted_movements: "squat" });
  assert.equal(result.safety.mode, "stop");
  assert.equal(result.insights.recommendation.status, "stop");
  assert.equal(result.insights.progressions.length, 0);
});
