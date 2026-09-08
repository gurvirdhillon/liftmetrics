import test from "node:test";
import assert from "node:assert/strict";
import { applyWellnessSafety } from "../server/wellness-safety.js";

const insights = {
  recommendation: { status: "progress", title: "Progress one main lift", detail: "Add a rep." },
  progressions: [{ exercise: "Squat", sets: 3, reps: 5, weight: 100, weight_unit: "kg", status: "improving", suggestion: "Add a rep." }]
};

test("uses low energy and sleep to choose recovery before coaching", () => {
  const result = applyWellnessSafety(insights, { sleep_hours: 5.5, sleep_quality: 2, energy_score: 1, soreness_score: 3, stress_score: 3 });
  assert.equal(result.insights.recommendation.status, "recover");
  assert.equal(result.insights.progressions.length, 0);
  assert.match(result.insights.recommendation.detail, /low energy/);
  assert.equal(result.wellness.mode, "recover");
});

test("keeps a manageable session when soreness is high", () => {
  const result = applyWellnessSafety(insights, { sleep_hours: 8, sleep_quality: 4, energy_score: 4, soreness_score: 4, stress_score: 2 });
  assert.equal(result.insights.recommendation.status, "progress");
  assert.equal(result.insights.progressions[0].status, "hold");
  assert.match(result.insights.recommendation.detail, /high soreness/);
  assert.equal(result.wellness.mode, "caution");
});

test("does not alter training guidance without a current wellness check-in", () => {
  assert.equal(applyWellnessSafety(insights, null).insights, insights);
});
