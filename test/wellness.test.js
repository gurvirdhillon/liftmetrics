import test from "node:test";
import assert from "node:assert/strict";
import { calculateReadiness, validateWellnessCheckin } from "../server/wellness.js";

test("calculates a high readiness score from restorative sleep and recovery", () => {
  assert.equal(calculateReadiness({ sleep_hours: 8, sleep_quality: 4, energy_score: 5, soreness_score: 1, stress_score: 1 }), 4.6);
});

test("rejects incomplete or out-of-range wellness check-ins", () => {
  assert.equal(validateWellnessCheckin({ sleep_hours: 25, sleep_quality: 3, energy_score: 3, soreness_score: 3, stress_score: 3 }), false);
  assert.equal(validateWellnessCheckin({ sleep_hours: 7, sleep_quality: 3, energy_score: 3, soreness_score: 3, stress_score: 3 }), true);
});
