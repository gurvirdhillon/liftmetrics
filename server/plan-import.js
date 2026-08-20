const MAX_SESSIONS = 14;
const MAX_EXERCISES_PER_SESSION = 20;
const MAX_TEXT_LENGTH = 120;

function cleanText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_TEXT_LENGTH);
}

export function validateImportedPlan(input) {
  if (!input || typeof input !== "object") throw new Error("A workout plan is required.");
  const title = cleanText(input.title, "Plan title");
  if (!Array.isArray(input.sessions) || !input.sessions.length || input.sessions.length > MAX_SESSIONS) {
    throw new Error(`Include between 1 and ${MAX_SESSIONS} sessions.`);
  }

  const sessions = input.sessions.map((session, sessionIndex) => {
    const exercises = Array.isArray(session?.exercises) ? session.exercises : [];
    if (!exercises.length || exercises.length > MAX_EXERCISES_PER_SESSION) {
      throw new Error(`Session ${sessionIndex + 1} must include between 1 and ${MAX_EXERCISES_PER_SESSION} exercises.`);
    }
    return {
      day: cleanText(session.day || "Unscheduled", "Session day"),
      name: cleanText(session.name, "Session name"),
      exercises: exercises.map((exercise) => ({
        name: cleanText(exercise?.name, "Exercise name"),
        prescription: cleanText(exercise?.prescription || "As prescribed", "Exercise prescription"),
        rest: cleanText(exercise?.rest || "Not specified", "Exercise rest")
      }))
    };
  });

  return {
    title,
    goal: "imported",
    focus: "Your imported workout plan.",
    durationMinutes: null,
    source: "uploaded",
    adaptation: { mode: "imported", note: "Imported plans are shown as provided. Review any exercise that conflicts with your injury restrictions." },
    sessions
  };
}

export function findRestrictedExercises(plan, restrictedMovements) {
  const movements = String(restrictedMovements || "").split(",").map((movement) => movement.trim().toLowerCase()).filter(Boolean);
  if (!movements.length) return [];
  return plan.sessions.flatMap((session) => session.exercises
    .filter((exercise) => movements.some((movement) => exercise.name.toLowerCase().includes(movement) || movement.includes(exercise.name.toLowerCase())))
    .map((exercise) => exercise.name));
}
