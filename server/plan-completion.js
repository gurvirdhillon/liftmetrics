export function comparePlanCompletion(plannedSession, completedExercises) {
  const planned = plannedSession?.exercises || [];
  const completedNames = new Set((completedExercises || []).map((exercise) => exercise.exercise_name?.trim().toLowerCase()).filter(Boolean));
  const matched = planned.filter((exercise) => completedNames.has(exercise.name?.trim().toLowerCase()));
  const skipped = planned.filter((exercise) => !completedNames.has(exercise.name?.trim().toLowerCase()));
  const extra = (completedExercises || []).filter((exercise) => exercise.exercise_name && !planned.some((target) => target.name?.trim().toLowerCase() === exercise.exercise_name.trim().toLowerCase()));
  return {
    plannedExercises: planned.length,
    completedAsPlanned: matched.length,
    skippedExercises: skipped.map((exercise) => exercise.name),
    extraExercises: extra.map((exercise) => exercise.exercise_name),
    summary: skipped.length
      ? `Completed ${matched.length} of ${planned.length} planned exercises. ${skipped.length} skipped: ${skipped.map((exercise) => exercise.name).join(", ")}.`
      : `Completed all ${planned.length} planned exercises${extra.length ? ` and added ${extra.length} extra` : ""}.`
  };
}
