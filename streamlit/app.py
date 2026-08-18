import pandas as pd
import streamlit as st

from data_access import load_user_workouts, require_authenticated_user


st.set_page_config(page_title="LiftMetrics insights", layout="wide")
user_id = require_authenticated_user()

st.title("Your performance insights")
st.caption(f"Private dashboard for {st.user.get('name') or st.user.get('email') or 'your account'}")

try:
    workouts, exercises = load_user_workouts(user_id)
except Exception:
    st.error("We could not load your workout data. Check the database connection and try again.")
    st.stop()

if workouts.empty:
    st.info("No workouts recorded yet. Log your first workout in LiftMetrics to start tracking progress.")
    st.stop()

workouts["session_date"] = pd.to_datetime(workouts["session_date"])
workouts["duration_value"] = pd.to_numeric(workouts["duration_value"], errors="coerce")
workouts["feeling_score"] = pd.to_numeric(workouts["feeling_score"], errors="coerce")

latest_date = workouts["session_date"].max().strftime("%d %b %Y")
total_minutes = workouts.apply(
    lambda row: row["duration_value"] * 60 if row["duration_unit"] == "hours" else row["duration_value"], axis=1
).sum()

metric_one, metric_two, metric_three = st.columns(3)
metric_one.metric("Sessions logged", len(workouts))
metric_two.metric("Training time", f"{total_minutes:.0f} mins")
metric_three.metric("Latest session", latest_date)

st.subheader("Training consistency")
sessions_by_day = workouts.groupby("session_date").size().rename("sessions")
st.line_chart(sessions_by_day)

if workouts["feeling_score"].notna().any():
    st.subheader("Session difficulty")
    st.line_chart(workouts.set_index("session_date")["feeling_score"])

if not exercises.empty:
    exercises["weight_value"] = pd.to_numeric(exercises["weight_value"], errors="coerce")
    exercises["reps"] = pd.to_numeric(exercises["reps"], errors="coerce")
    exercises["estimated_1rm"] = exercises["weight_value"] * (1 + exercises["reps"] / 30)
    strength = exercises.dropna(subset=["estimated_1rm", "exercise_name"])

    if not strength.empty:
        st.subheader("Strength progress")
        exercise = st.selectbox("Exercise", sorted(strength["exercise_name"].unique()))
        progress = strength[strength["exercise_name"] == exercise].sort_values("session_date")
        st.line_chart(progress.set_index("session_date")["estimated_1rm"])

st.subheader("Recent activity")
st.dataframe(
    workouts.sort_values("session_date", ascending=False)[["session_date", "workout_type", "duration_value", "duration_unit", "feeling_score"]],
    use_container_width=True,
    hide_index=True,
)
