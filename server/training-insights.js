const MS_PER_DAY = 86_400_000;

const muscleGroups = {
  "Bench Press": ["Chest", "Triceps"], "Overhead Press": ["Shoulders", "Triceps"],
  "Barbell Row": ["Back", "Biceps"], "Pull Ups": ["Back", "Biceps"],
  "Lat Pulldown": ["Back", "Biceps"], "Bicep Curl": ["Biceps"],
  "Tricep Extension": ["Triceps"], "Tricep Pressdown": ["Triceps"],
  "Squat": ["Quads", "Glutes"], "Leg Press": ["Quads", "Glutes"],
  "Leg Extension": ["Quads"], "Deadlift": ["Hamstrings", "Back"],
  "Romanian Deadlift": ["Hamstrings", "Glutes"], "Leg Curl": ["Hamstrings"],
  "Calf Raise": ["Calves"], "Hip Thrust": ["Glutes"]
};

function asDate(value) { return new Date(`${String(value).slice(0, 10)}T00:00:00Z`); }
function daysSince(value, now) { return Math.floor((now - asDate(value)) / MS_PER_DAY); }
function volume(entry) { return Number(entry.sets || 0) * Number(entry.reps || 0) * Number(entry.weight_value || 0); }
function estimatedOneRepMax(entry) { return Number(entry.weight_value || 0) * (1 + Number(entry.reps || 0) / 30); }

export function buildTrainingInsights(workouts, now = new Date()) {
  const sorted = [...workouts].sort((a, b) => asDate(b.session_date) - asDate(a.session_date));
  const recent = sorted.filter((workout) => daysSince(workout.session_date, now) <= 7);
  const lastThree = sorted.slice(0, 3);
  const averageEffort = lastThree.length ? lastThree.reduce((sum, workout) => sum + Number(workout.feeling_score || 0), 0) / lastThree.length : null;
  const latest = sorted[0];
  const daysRested = latest ? daysSince(latest.session_date, now) : null;
  const highFatigue = averageEffort !== null && averageEffort >= 8;
  const recommendation = !latest
    ? { status: "ready", title: "Log your baseline workout", detail: "Your first session gives LiftMetrics a starting point for personalised progression." }
    : highFatigue
      ? { status: "recover", title: "Choose recovery or a deload", detail: `Your last ${lastThree.length} sessions averaged ${averageEffort.toFixed(1)}/10 effort. Reduce load or volume by about 20% today.` }
      : daysRested >= 4
        ? { status: "ready", title: "Return with a manageable session", detail: `You have had ${daysRested} days away from training. Start with your previous working weights and leave 2–3 reps in reserve.` }
        : { status: "progress", title: "Progress one main lift", detail: "Your recent recovery looks manageable. Add one rep per set, or the smallest available load increase, if technique stays solid." };

  const exerciseHistory = new Map();
  const muscleVolume = {};
  for (const workout of sorted) {
    for (const entry of workout.exercises || []) {
      if (!entry.exercise_name) continue;
      const key = entry.exercise_name;
      const item = { ...entry, session_date: workout.session_date, oneRm: estimatedOneRepMax(entry), volume: volume(entry) };
      exerciseHistory.set(key, [...(exerciseHistory.get(key) || []), item]);
      if (daysSince(workout.session_date, now) <= 7) {
        for (const muscle of muscleGroups[key] || []) muscleVolume[muscle] = (muscleVolume[muscle] || 0) + Number(entry.sets || 0);
      }
    }
  }
  const progressions = [...exerciseHistory.entries()].map(([exercise, entries]) => {
    const chronological = [...entries].sort((a, b) => asDate(a.session_date) - asDate(b.session_date));
    const latestEntry = chronological.at(-1);
    const previous = chronological.at(-2);
    const improvement = previous && latestEntry.oneRm > previous.oneRm ? "improving" : previous ? "hold" : "baseline";
    const suggestion = improvement === "improving" ? "Keep progressing gradually." : previous ? "Repeat the load and aim for cleaner reps or one extra rep." : "Use this as your baseline.";
    return { exercise, estimated_1rm: Number(latestEntry.oneRm.toFixed(1)), volume: Number(latestEntry.volume.toFixed(1)), status: improvement, suggestion };
  }).sort((a, b) => b.estimated_1rm - a.estimated_1rm);
  const totalVolume = recent.flatMap((w) => w.exercises || []).reduce((sum, entry) => sum + volume(entry), 0);
  const consistency = Math.min(100, recent.length * 25);
  const recovery = averageEffort === null ? 50 : Math.max(0, Math.round((10 - averageEffort) * 10));
  const qualityScore = Math.round(consistency * 0.45 + recovery * 0.35 + (progressions.some((p) => p.status === "improving") ? 20 : 10));
  const weeklyReview = recent.length
    ? `You logged ${recent.length} session${recent.length === 1 ? "" : "s"} this week${totalVolume ? ` and completed ${Math.round(totalVolume).toLocaleString()} kg of tracked volume` : ""}. ${recommendation.detail}`
    : "No sessions logged in the last seven days. A short, comfortable return workout is a good place to restart.";
  return { recommendation, qualityScore: Math.min(100, qualityScore), averageEffort: averageEffort && Number(averageEffort.toFixed(1)), sessionsThisWeek: recent.length, muscleBalance: Object.entries(muscleVolume).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets), progressions, weeklyReview };
}
