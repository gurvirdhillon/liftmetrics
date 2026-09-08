import { calculateReadiness } from "./wellness.js";

function signals(checkin) {
  const result = [];
  if (Number(checkin.sleep_hours) < 6.5) result.push("limited sleep");
  if (Number(checkin.energy_score) <= 2) result.push("low energy");
  if (Number(checkin.soreness_score) >= 4) result.push("high soreness");
  if (Number(checkin.stress_score) >= 4) result.push("high stress");
  return result;
}

function holdProgression(progression) {
  return {
    ...progression,
    status: "hold",
    suggestion: `Repeat ${progression.sets} sets of ${progression.reps} reps at ${progression.weight} ${progression.weight_unit}; stop with 2–3 reps still in reserve.`
  };
}

export function applyWellnessSafety(insights, checkin) {
  if (!checkin) return { insights, wellness: { mode: "none" } };

  const readinessScore = calculateReadiness(checkin);
  const wellbeingSignals = signals(checkin);
  const recoveryFirst = readinessScore < 2.8 || Number(checkin.energy_score) <= 2 || Number(checkin.sleep_hours) < 5;
  const caution = recoveryFirst || readinessScore < 3.5 || Number(checkin.soreness_score) >= 4 || Number(checkin.stress_score) >= 4 || Number(checkin.sleep_hours) < 6.5;
  const evidence = {
    mode: recoveryFirst ? "recover" : caution ? "caution" : "ready",
    readiness_score: readinessScore,
    sleep_hours: Number(checkin.sleep_hours),
    sleep_quality: Number(checkin.sleep_quality),
    energy_score: Number(checkin.energy_score),
    soreness_score: Number(checkin.soreness_score),
    stress_score: Number(checkin.stress_score),
    signals: wellbeingSignals
  };

  if (recoveryFirst) {
    const reason = wellbeingSignals.length ? wellbeingSignals.join(", ") : "a low readiness score";
    return {
      insights: {
        ...insights,
        progressions: [],
        recommendation: { status: "recover", title: "Choose a recovery-first session", detail: `Today’s wellness check-in shows ${reason}. Choose gentle mobility, an easy walk, or rest rather than progressing your lifts.` }
      },
      wellness: evidence
    };
  }

  if (caution) {
    const reason = wellbeingSignals.length ? wellbeingSignals.join(", ") : "a middling readiness score";
    return {
      insights: {
        ...insights,
        progressions: insights.progressions.map(holdProgression),
        recommendation: { ...insights.recommendation, detail: `${insights.recommendation.detail} Today’s wellness check-in shows ${reason}, so keep the session manageable and do not add load or reps.` }
      },
      wellness: evidence
    };
  }

  return { insights, wellness: evidence };
}
