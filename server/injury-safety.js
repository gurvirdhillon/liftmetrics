function movements(injury) {
  return String(injury?.restricted_movements || "").split(",").map((movement) => movement.trim().toLowerCase()).filter(Boolean);
}

export function applyInjurySafety(insights, injury) {
  if (!injury) return { insights, safety: { mode: "none", restrictedMovements: [] } };
  const restrictedMovements = movements(injury);
  const painScore = Number(injury.pain_score);
  const mode = painScore >= 5 ? "stop" : painScore >= 3 ? "caution" : "avoid";
  const isRestricted = (exercise) => restrictedMovements.some((movement) => exercise.toLowerCase().includes(movement) || movement.includes(exercise.toLowerCase()));
  const safeProgressions = insights.progressions.filter((item) => !isRestricted(item.exercise));
  const detail = mode === "stop"
    ? "You reported pain at 5/10 or above. Do not continue with a workout recommendation today; seek appropriate clinical advice before returning to exercise."
    : mode === "caution"
      ? "You reported moderate pain. Do not increase load or reps for the affected area; use only pain-free, approved movements."
      : "Avoid the movements you marked as restricted and use only pain-free, approved movements.";
  return {
    insights: {
      ...insights,
      progressions: mode === "stop" ? [] : safeProgressions,
      recommendation: mode === "stop" ? { status: "stop", title: "Pause today’s workout", detail } : { ...insights.recommendation, detail: `${insights.recommendation.detail} ${detail}` }
    },
    safety: { mode, affectedArea: injury.affected_area, painScore, restrictedMovements, detail }
  };
}
