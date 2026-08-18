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

export function coachInput(insights) {
  return JSON.stringify({
    recommendation: insights.recommendation,
    sessions_this_week: insights.sessionsThisWeek,
    average_effort: insights.averageEffort,
    quality_score: insights.qualityScore,
    top_progressions: insights.progressions.slice(0, 3),
    weekly_muscle_sets: insights.muscleBalance.slice(0, 5)
  });
}

export async function createCoachResponse(insights) {
  if (!process.env.OPENAI_API_KEY) throw new Error("AI coaching is not configured.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_COACH_MODEL || "gpt-5-mini",
    store: false,
    text: { format: { type: "json_schema", name: "liftmetrics_coach", strict: true, schema: coachSchema } },
    input: [
      { role: "system", content: "You are LiftMetrics Coach. Explain supplied training data in friendly, concise British English. Do not diagnose, treat injuries, prescribe rehabilitation, mention medical conditions, or override the supplied deterministic recommendation. Never recommend maximum lifts. Give one manageable workout alternative. Remind the user to stop if movement causes pain. Return only the requested JSON." },
      { role: "user", content: `Explain this verified training summary for its owner: ${coachInput(insights)}` }
    ]
  });
  return JSON.parse(response.output_text);
}
