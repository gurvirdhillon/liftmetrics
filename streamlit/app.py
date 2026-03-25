import streamlit as st
import pandas as pd
import os
import re

st.set_page_config(page_title="LiftMetrics", layout="wide")
st.title("Performance Metrics")
st.write("See how well you're performing overtime.")


base_dir = os.path.dirname(os.path.abspath(__file__))
workout_csv_path = os.path.normpath(os.path.join(base_dir, "../data/processed/workout_session.csv"))

df2 = pd.read_csv(workout_csv_path)


df2.columns = df2.columns.str.strip().str.lower()
df2["date"] = pd.to_datetime(df2["date"], errors="coerce")
df2["exercise"] = df2["exercise"].astype(str).str.strip().str.lower()
df2["user_id"] = df2["user_id"].astype(str).str.strip()

for col in ["weight_kg", "reps", "sets"]:
    df2[col] = pd.to_numeric(df2[col], errors="coerce")


def clean_difficulty(value):
    if pd.isna(value):
        return None

    value = str(value).strip().lower()

    if value in ["n/a", "na", "none", ""]:
        return None

    numbers = re.findall(r"\d+\.?\d*", value)
    if not numbers:
        return None

    nums = [float(n) for n in numbers]

    # if format like 4-10, take first number as the score
    score = nums[0]

    if 1 <= score <= 10:
        return score

    return None


df2["difficulty_clean"] = df2["workout_difficulty"].apply(clean_difficulty)

strength_exercises = ["bench press", "squat", "deadlift"]

df_strength = df2[df2["exercise"].isin(strength_exercises)].copy()
df_strength = df_strength.dropna(subset=["user_id", "date", "exercise", "weight_kg", "reps"])
df_strength = df_strength[(df_strength["weight_kg"] > 0) & (df_strength["reps"] > 0)]

df_strength["estimated_1rm"] = df_strength["weight_kg"] * (1 + df_strength["reps"] / 30)

daily_strength = (
    df_strength.groupby(["user_id", "date", "exercise"], as_index=False)
    .agg(
        estimated_1rm=("estimated_1rm", "max"),
        weight_kg=("weight_kg", "max"),
        difficulty_clean=("difficulty_clean", "mean")
    )
    .sort_values(["user_id", "exercise", "date"])
)

daily_strength["previous_1rm"] = (
    daily_strength.groupby(["user_id", "exercise"])["estimated_1rm"].shift(1)
)

user = st.selectbox(
    "Select User",
    sorted(daily_strength["user_id"].unique(), reverse=True)
)

user_data = daily_strength[daily_strength["user_id"] == user].copy()

if user_data.empty:
    st.warning("No strength data available for this user.")
    st.stop()

exercise = st.selectbox(
    "Select Exercise",
    sorted(user_data["exercise"].unique())
)

exercise_data = user_data[user_data["exercise"] == exercise].copy()
exercise_data = exercise_data.sort_values("date")

if exercise_data.empty:
    st.warning("No data for this exercise.")
    st.stop()

last_row = exercise_data.iloc[-1]

current_1rm = last_row["estimated_1rm"]
prev_1rm = last_row["previous_1rm"] if pd.notna(last_row["previous_1rm"]) else current_1rm
current_weight = last_row["weight_kg"]

# use average of last 3 difficulty scores where available
recent_difficulty = exercise_data["difficulty_clean"].dropna().tail(3)
difficulty = recent_difficulty.mean() if not recent_difficulty.empty else 5


def recommend_weight(current_weight, current_1rm, prev_1rm, difficulty):
    change = current_1rm - prev_1rm

    if change > 2 and difficulty <= 5:
        return current_weight * 1.05, "Increase weight slightly next session."
    elif change > 2 and difficulty > 5:
        return current_weight * 1.02, "Small increase recommended."
    elif -2 <= change <= 2:
        if difficulty >= 8:
            return current_weight * 0.95, "Reduce weight slightly to manage fatigue."
        else:
            return current_weight, "Maintain current weight."
    elif change < -2:
        return current_weight * 0.90, "Deload recommended."
    return current_weight, "Maintain current weight."

recommended_weight, recommendation_text = recommend_weight(
    current_weight=current_weight,
    current_1rm=current_1rm,
    prev_1rm=prev_1rm,
    difficulty=difficulty
)

improvement = current_1rm - exercise_data["estimated_1rm"].iloc[0]
best_1rm = exercise_data["estimated_1rm"].max()

col1, col2, col3 = st.columns(3)
col1.metric("Current Estimated 1RM", f"{current_1rm:.1f} kg")
col2.metric("Best Estimated 1RM", f"{best_1rm:.1f} kg")
col3.metric("Improvement", f"{improvement:.1f} kg")

st.line_chart(exercise_data.set_index("date")["estimated_1rm"])

st.subheader("Workout Recommendation")
st.write(f"Average recent workout difficulty: {difficulty:.1f}/10")
st.metric("Recommended Next Weight", f"{recommended_weight:.1f} kg")
st.write(recommendation_text)

with st.expander("Show processed strength data"):
    st.dataframe(exercise_data, use_container_width=True)
