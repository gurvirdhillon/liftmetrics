import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from data_access import load_user_workouts, require_authenticated_user


st.set_page_config(page_title="LiftMetrics cardio", layout="wide")
user_id = require_authenticated_user()
st.title("Your cardio and heart-rate trends")

try:
    workouts, _ = load_user_workouts(user_id)
except Exception:
    st.error("We could not load your workout data. Check the database connection and try again.")
    st.stop()

if workouts.empty:
    st.info("Log cardio workouts with heart-rate data to see trends here.")
    st.stop()

workouts["session_date"] = pd.to_datetime(workouts["session_date"])
workouts["avg_bpm"] = pd.to_numeric(workouts["avg_bpm"], errors="coerce")
workouts["max_bpm"] = pd.to_numeric(workouts["max_bpm"], errors="coerce")
cardio = workouts[workouts["workout_type"].str.lower().isin(["cardio", "hiit", "sports"])].dropna(subset=["avg_bpm"])

if cardio.empty:
    st.info("No cardio or HIIT sessions with heart-rate data yet.")
    st.stop()

st.subheader("Average heart rate")
st.line_chart(cardio.set_index("session_date")[["avg_bpm", "max_bpm"]])

st.subheader("Cardio sessions")
st.dataframe(
    cardio.sort_values("session_date", ascending=False)[["session_date", "workout_type", "avg_bpm", "max_bpm", "duration_value", "duration_unit"]],
    use_container_width=True,
    hide_index=True,
)
