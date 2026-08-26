const DEFAULT_BASE_URL = "https://exercisedb.p.rapidapi.com";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function normaliseExercise(exercise) {
  if (!exercise || typeof exercise.name !== "string" || !exercise.name.trim()) return null;
  return {
    id: String(exercise.id || ""),
    name: exercise.name.trim(),
    bodyPart: typeof exercise.bodyPart === "string" ? exercise.bodyPart : null,
    target: typeof exercise.target === "string" ? exercise.target : null,
    equipment: typeof exercise.equipment === "string" ? exercise.equipment : null
  };
}

export async function searchExerciseDb(query, { fetchImpl = fetch } = {}) {
  const search = String(query || "").trim();
  if (search.length < 2) return [];
  if (!process.env.EXERCISE_DB_API_KEY) {
    const error = new Error("ExerciseDB is not configured.");
    error.code = "EXERCISE_DB_NOT_CONFIGURED";
    throw error;
  }

  const cacheKey = search.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.exercises;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const baseUrl = (process.env.EXERCISE_DB_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
    const response = await fetchImpl(`${baseUrl}/exercises/name/${encodeURIComponent(search)}?limit=10`, {
      headers: {
        "X-RapidAPI-Key": process.env.EXERCISE_DB_API_KEY,
        "X-RapidAPI-Host": process.env.EXERCISE_DB_RAPIDAPI_HOST || "exercisedb.p.rapidapi.com"
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`ExerciseDB request failed with status ${response.status}.`);
    const data = await response.json();
    const exercises = (Array.isArray(data) ? data : []).map(normaliseExercise).filter(Boolean).slice(0, 10);
    cache.set(cacheKey, { exercises, expiresAt: Date.now() + CACHE_TTL_MS });
    return exercises;
  } finally {
    clearTimeout(timeout);
  }
}
