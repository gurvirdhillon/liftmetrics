import pandas as pd


MEDALS = ("🥇 Gold", "🥈 Silver", "🥉 Bronze")


def strength_podium(exercises):
    entries = exercises.copy()
    entries["weight_value"] = pd.to_numeric(entries["weight_value"], errors="coerce")
    entries["sets"] = pd.to_numeric(entries["sets"], errors="coerce")
    entries["reps"] = pd.to_numeric(entries["reps"], errors="coerce")
    entries = entries.dropna(subset=["exercise_name", "weight_value"])
    entries = entries[entries["weight_value"] > 0].sort_values("weight_value", ascending=False).head(3)
    return [
        f"{medal}: {row.exercise_name} — {row.weight_value:g} {row.weight_unit if pd.notna(row.weight_unit) else 'kg'} · {row.sets:g} × {row.reps:g}"
        for medal, (_, row) in zip(MEDALS, entries.iterrows())
    ]


def cardio_podium(workouts):
    cardio = workouts[workouts["workout_type"].str.lower().isin(["cardio", "hiit", "sports"])].copy()
    cardio["distance_value"] = pd.to_numeric(cardio["distance_value"], errors="coerce")
    cardio["duration_value"] = pd.to_numeric(cardio["duration_value"], errors="coerce")
    cardio["distance_km"] = cardio.apply(lambda row: row.distance_value * 1.60934 if row.distance_unit == "miles" else row.distance_value, axis=1)
    distance = cardio.dropna(subset=["distance_km"]).sort_values("distance_km", ascending=False).head(3)
    if not distance.empty:
        return [f"{medal}: {row.distance_km:.1f} km · {row.workout_type} ({row.session_date.strftime('%d %b')})" for medal, (_, row) in zip(MEDALS, distance.iterrows())]
    cardio["duration_minutes"] = cardio.apply(lambda row: row.duration_value * 60 if row.duration_unit == "hours" else row.duration_value, axis=1)
    duration = cardio.dropna(subset=["duration_minutes"]).sort_values("duration_minutes", ascending=False).head(3)
    return [f"{medal}: {row.duration_minutes:.0f} mins · {row.workout_type} ({row.session_date.strftime('%d %b')})" for medal, (_, row) in zip(MEDALS, duration.iterrows())]


def consistency_podium(workouts):
    dates = pd.to_datetime(workouts["session_date"])
    weeks = dates.dt.to_period("W-MON").value_counts().sort_values(ascending=False).head(3)
    return [f"{medal}: {count} sessions · week of {week.start_time.strftime('%d %b')}" for medal, (week, count) in zip(MEDALS, weeks.items())]
