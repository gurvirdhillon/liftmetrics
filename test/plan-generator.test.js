import test from "node:test";
import assert from "node:assert/strict";
import { generatePlan } from "../server/plan-generator.js";

const baseProfile = { days: ["Mon", "Wed", "Fri", "Sat"], timespent: "45", equipment: "gym", activity_level: "3", fitness_level: "intermediate" };

test("goals generate distinct plan focuses and exercises", () => {
  const strength = generatePlan({ ...baseProfile, goal: "strength" });
  const stamina = generatePlan({ ...baseProfile, goal: "stamina" });
  assert.notEqual(strength.title, stamina.title);
  assert.notEqual(strength.sessions[0].exercises[0].name, stamina.sessions[0].exercises[0].name);
});

test("plan uses only selected days and honours the session exercise limit", () => {
  const plan = generatePlan({ ...baseProfile, goal: "weight-loss", timespent: "30" });
  assert.ok(plan.sessions.every((session) => baseProfile.days.includes(session.day)));
  assert.ok(plan.sessions.every((session) => session.exercises.length <= 3));
});

test("honours up to six requested sessions and rotates strength workouts", () => {
  const profile = { ...baseProfile, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], activity_level: "6", goal: "strength" };
  const plan = generatePlan(profile);
  assert.equal(plan.sessions.length, 6);
  assert.deepEqual(plan.sessions.map((session) => session.day), profile.days);
  assert.deepEqual(plan.sessions.slice(0, 4).map((session) => session.name), ["Upper A", "Lower A", "Upper B", "Lower B"]);
});

test("reduces session volume when a deload is recommended", () => {
  const plan = generatePlan({ ...baseProfile, goal: "strength" }, { reduceVolume: true });
  assert.equal(plan.adaptation.mode, "deload");
  assert.ok(plan.sessions.every((session) => session.exercises.length <= 3));
});
