import OpenAI from "openai";

const coachSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "recommendation", "why", "alternative", "safety_note"],
  properties: {
    headline: { type: "string" },
    recommendation: { type: "string" },
    why: { type: "string" },
    alternative: { type: "string" },
    safety_note: { type: "string" }
  }
};

export function coachInput(insights, safety = {}) {
  return JSON.stringify({
    recommendation: insights.recommendation,
    sessions_this_week: insights.sessionsThisWeek,
    average_effort: insights.averageEffort,
    quality_score: insights.qualityScore,
    next_session_exercises: insights.progressions.slice(0, 3).map(({ exercise, sets, reps, weight, weight_unit, suggestion }) => ({ exercise, sets, reps, weight, weight_unit, suggestion })),
    weekly_muscle_sets: insights.muscleBalance.slice(0, 5),
    injury_safety: safety.mode === "none" ? undefined : { mode: safety.mode, restricted_movements: safety.restrictedMovements, instruction: safety.detail }
  });
}

export async function createCoachResponse(insights, safety) {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI coaching is not configured.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_COACH_MODEL || "gpt-5-mini",
    store: false,
    text: { format: { type: "json_schema", name: "liftmetrics_coach", strict: true, schema: coachSchema } },
    input: [
      { role: "system", content: "You are LiftMetrics Coach. Explain supplied training data in friendly, concise British English. Focus on practical sets, reps and working weights. Do not use the terms 1RM, e1RM, volume, quality score, or training load. Do not diagnose, treat injuries, prescribe rehabilitation, mention medical conditions, or override the supplied deterministic recommendation. Never recommend maximum lifts. Give one manageable workout alternative. Remind the user to stop if movement causes pain. Return only the requested JSON." },
      { role: "user", content: `Explain this verified training summary for its owner: ${coachInput(insights, safety)}` }
    ]
  });
  return JSON.parse(response.output_text);
}
