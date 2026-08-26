import test from "node:test";
import assert from "node:assert/strict";
import { searchExerciseDb } from "../server/exercise-db.js";

test("searches and normalises ExerciseDB results", async () => {
  const originalKey = process.env.EXERCISE_DB_API_KEY;
  process.env.EXERCISE_DB_API_KEY = "test-key";
  const results = await searchExerciseDb("bench", {
    fetchImpl: async (url, options) => {
      assert.match(url, /exercises\/name\/bench/);
      assert.equal(options.headers["X-RapidAPI-Key"], "test-key");
      return { ok: true, json: async () => [{ id: "001", name: "Bench Press", bodyPart: "chest", target: "pectorals", equipment: "barbell" }] };
    }
  });
  assert.deepEqual(results, [{ id: "001", name: "Bench Press", bodyPart: "chest", target: "pectorals", equipment: "barbell" }]);
  if (originalKey === undefined) delete process.env.EXERCISE_DB_API_KEY;
  else process.env.EXERCISE_DB_API_KEY = originalKey;
});

test("requires configuration before calling ExerciseDB", async () => {
  const originalKey = process.env.EXERCISE_DB_API_KEY;
  delete process.env.EXERCISE_DB_API_KEY;
  await assert.rejects(() => searchExerciseDb("squat"), { code: "EXERCISE_DB_NOT_CONFIGURED" });
  if (originalKey !== undefined) process.env.EXERCISE_DB_API_KEY = originalKey;
});
