const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const templates = {
  strength: {
    title: "Strength foundation",
    focus: "Build strength with compound movements and gradual load increases.",
    gym: [
      { name: "Upper A", exercises: [["Bench Press", "4 x 5", "90 sec"], ["Barbell Row", "4 x 6", "90 sec"], ["Overhead Press", "3 x 8", "75 sec"], ["Lat Pulldown", "3 x 10", "60 sec"], ["Bicep Curl", "2 x 12", "45 sec"]] },
      { name: "Lower A", exercises: [["Squat", "4 x 5", "90 sec"], ["Romanian Deadlift", "3 x 8", "90 sec"], ["Leg Press", "3 x 10", "75 sec"], ["Leg Curl", "3 x 12", "60 sec"], ["Calf Raise", "2 x 15", "45 sec"]] },
      { name: "Upper B", exercises: [["Incline Dumbbell Press", "4 x 8", "75 sec"], ["Seated Cable Row", "4 x 8", "75 sec"], ["Lateral Raise", "3 x 12", "45 sec"], ["Chest-supported Row", "3 x 10", "60 sec"], ["Tricep Pressdown", "2 x 12", "45 sec"]] },
      { name: "Lower B", exercises: [["Deadlift", "3 x 5", "90 sec"], ["Bulgarian Split Squat", "3 x 8", "75 sec"], ["Hip Thrust", "3 x 10", "75 sec"], ["Leg Extension", "3 x 12", "60 sec"], ["Calf Raise", "2 x 15", "45 sec"]] },
      { name: "Conditioning and core", exercises: [["Bike or rower", "15 mins", "Moderate"], ["Cable Woodchop", "3 x 10", "45 sec"], ["Plank", "3 x 30 sec", "30 sec"], ["Farmer Carry", "3 x 30 sec", "45 sec"]] },
      { name: "Mobility recovery", exercises: [["Mobility flow", "15 mins", "Easy"], ["Easy cardio", "15 mins", "Easy"], ["Breathing practice", "3 mins", "Relaxed"]] }
    ],
    home: [
      { name: "Upper A", exercises: [["Push-up", "4 x 8-12", "75 sec"], ["Backpack Row", "4 x 10", "75 sec"], ["Pike Push-up", "3 x 8", "60 sec"], ["Band Pull-apart", "3 x 15", "45 sec"]] },
      { name: "Lower A", exercises: [["Split Squat", "4 x 8", "75 sec"], ["Backpack Romanian Deadlift", "3 x 10", "75 sec"], ["Glute Bridge", "3 x 12", "60 sec"], ["Calf Raise", "3 x 15", "45 sec"]] },
      { name: "Upper B", exercises: [["Incline Push-up", "4 x 10", "75 sec"], ["Band Row", "4 x 12", "75 sec"], ["Chair Dip", "3 x 8", "60 sec"], ["Bicep Curl", "3 x 12", "45 sec"]] },
      { name: "Lower B", exercises: [["Reverse Lunge", "4 x 8", "75 sec"], ["Single-leg Glute Bridge", "3 x 10", "60 sec"], ["Step-up", "3 x 10", "60 sec"], ["Calf Raise", "3 x 15", "45 sec"]] },
      { name: "Conditioning and core", exercises: [["Fast walk or cycle", "15 mins", "Moderate"], ["Mountain Climber", "3 x 30 sec", "45 sec"], ["Dead Bug", "3 x 10", "45 sec"], ["Side Plank", "3 x 20 sec", "30 sec"]] },
      { name: "Mobility recovery", exercises: [["Mobility flow", "15 mins", "Easy"], ["Easy walk", "15 mins", "Easy"], ["Breathing practice", "3 mins", "Relaxed"]] }
    ]
  },
  "weight-loss": {
    title: "Fitness and fat-loss",
    focus: "Use full-body resistance work and steady conditioning to support sustainable energy expenditure.",
    gym: [{ name: "Full body circuit", exercises: [["Goblet Squat", "3 x 12", "45 sec"], ["Chest Press", "3 x 12", "45 sec"], ["Seated Row", "3 x 12", "45 sec"], ["Treadmill Incline Walk", "12 mins", "Easy-moderate"], ["Plank", "3 x 30 sec", "30 sec"]] }],
    home: [{ name: "Full body circuit", exercises: [["Bodyweight Squat", "3 x 15", "45 sec"], ["Push-up", "3 x 8-12", "45 sec"], ["Backpack Row", "3 x 12", "45 sec"], ["Brisk Walk", "12 mins", "Easy-moderate"], ["Plank", "3 x 30 sec", "30 sec"]] }]
  },
  stamina: {
    title: "Stamina builder",
    focus: "Develop aerobic capacity with a mix of steady work, intervals, and recovery movement.",
    gym: [
      { name: "Steady cardio", exercises: [["Treadmill, bike, or rower", "25 mins", "Conversational pace"], ["Easy mobility", "10 mins", "Controlled"]] },
      { name: "Cardio intervals", exercises: [["Warm-up", "5 mins", "Easy"], ["Bike or rower intervals", "8 x 1 min", "1 min easy between"], ["Cool-down", "8 mins", "Easy"], ["Core", "2 x 10", "45 sec"]] }
    ],
    home: [
      { name: "Steady cardio", exercises: [["Brisk walk, run, or cycle", "25 mins", "Conversational pace"], ["Easy mobility", "10 mins", "Controlled"]] },
      { name: "Cardio intervals", exercises: [["Warm-up walk", "5 mins", "Easy"], ["Run or fast-walk intervals", "8 x 1 min", "1 min easy between"], ["Cool-down", "8 mins", "Easy"], ["Core", "2 x 10", "45 sec"]] }
    ]
  },
  wellbeing: {
    title: "Wellbeing and movement",
    focus: "Build a consistent, lower-stress movement habit with strength, mobility, and light cardio.",
    gym: [
      { name: "Mobility and full body", exercises: [["Dynamic warm-up", "5 mins", "Easy"], ["Leg Press", "3 x 10", "60 sec"], ["Chest Press", "3 x 10", "60 sec"], ["Cable Row", "3 x 10", "60 sec"], ["Easy cardio", "10 mins", "Easy"]] },
      { name: "Recovery cardio", exercises: [["Easy cycle or walk", "20 mins", "Easy"], ["Mobility flow", "15 mins", "Controlled"], ["Breathing practice", "3 mins", "Relaxed"]] }
    ],
    home: [
      { name: "Mobility and full body", exercises: [["Dynamic warm-up", "5 mins", "Easy"], ["Bodyweight Squat", "3 x 10", "60 sec"], ["Push-up", "3 x 8", "60 sec"], ["Backpack Row", "3 x 10", "60 sec"], ["Easy walk", "10 mins", "Easy"]] },
      { name: "Recovery cardio", exercises: [["Easy walk", "20 mins", "Easy"], ["Mobility flow", "15 mins", "Controlled"], ["Breathing practice", "3 mins", "Relaxed"]] }
    ]
  }
};

function selectDays(days, count) {
  const available = [...new Set(days)].filter((day) => dayOrder.includes(day)).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  if (available.length <= count) return available;

  return Array.from({ length: count }, (_, index) => available[Math.round(index * (available.length - 1) / (count - 1))]);
}

export function generatePlan(profile, adaptation = {}) {
  const template = templates[profile.goal];
  if (!template) throw new Error("A supported goal is required to generate a plan.");

  const activityLevel = Number(profile.activity_level) || Math.min(profile.days.length, 3);
  const sessionCount = Math.min(profile.days.length, Math.max(1, Math.min(activityLevel, 6)));
  const equipment = profile.equipment === "home" ? "home" : "gym";
  const exerciseLimit = Number(profile.timespent) <= 30 ? 3 : Number(profile.timespent) <= 45 ? 4 : 5;

  return {
    title: template.title,
    goal: profile.goal,
    focus: template.focus,
    durationMinutes: Number(profile.timespent),
    fitnessLevel: profile.fitness_level,
    adaptation: adaptation.reduceVolume
      ? { mode: "deload", note: "Your recent effort was high, so this plan starts with reduced volume. Keep 2–3 reps in reserve." }
      : { mode: "progress", note: "Progress one main lift only when form and recovery both feel solid." },
    sessions: selectDays(profile.days, sessionCount).map((day, index) => {
      const session = template[equipment][index % template[equipment].length];
      const adjustedLimit = adaptation.reduceVolume ? Math.max(2, exerciseLimit - 1) : exerciseLimit;
      return { day, name: session.name, exercises: session.exercises.slice(0, adjustedLimit).map(([name, prescription, rest]) => ({ name, prescription, rest })) };
    })
  };
}
