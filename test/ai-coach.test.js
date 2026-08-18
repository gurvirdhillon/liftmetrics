import test from "node:test";
import assert from "node:assert/strict";
import { coachInput } from "../server/ai-coach.js";

test("coach input includes only the compact training summary", () => {
  const data = JSON.parse(coachInput({ recommendation: { status: "ready" }, sessionsThisWeek: 2, averageEffort: 5, qualityScore: 80, progressions: [{ exercise: "Squat" }], muscleBalance: [{ muscle: "Quads" }] }));
  assert.equal(data.sessions_this_week, 2);
  assert.equal(data.top_progressions[0].exercise, "Squat");
  assert.equal(data.user_id, undefined);
});
