import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from data_access import load_user_workouts, require_authenticated_user
from personal_bests import cardio_podium, consistency_podium, strength_podium


st.set_page_config(page_title="LiftMetrics personal bests", layout="wide")
user_id = require_authenticated_user()

st.title("Your personal bests")
st.caption("Choose a category to see your top three achievements.")

try:
    workouts, exercises = load_user_workouts(user_id)
except Exception:
    st.error("We could not load your workout data. Check the database connection and try again.")
    st.stop()

if workouts.empty:
    st.info("Log workouts in LiftMetrics to unlock your personal bests.")
    st.stop()

category = st.selectbox("Personal-best category", ["Strength", "Cardio", "Consistency"])
categories = {
    "Strength": ("Heaviest logged working sets", strength_podium(exercises)),
    "Cardio": ("Longest distance, or longest session when distance is unavailable", cardio_podium(workouts)),
    "Consistency": ("Your busiest training weeks", consistency_podium(workouts)),
}
description, results = categories[category]
st.subheader(category)
st.caption(description)

def podium_card(column, medal, result, height):
    with column:
        st.markdown(f"<div style='height:{height}px'></div>", unsafe_allow_html=True)
        with st.container(border=True):
            st.markdown(f"<div style='font-size:5rem; font-weight:800; line-height:1.2; padding:0.5rem 0'>{medal}</div>", unsafe_allow_html=True)
            if result:
                st.write(result.split(": ", 1)[-1])
            else:
                st.caption("Keep logging to claim this place.")

silver, gold, bronze = st.columns([1, 1.15, 1])
podium_card(silver, "🥈 Silver", results[1] if len(results) > 1 else None, 72)
podium_card(gold, "🥇 Gold", results[0] if results else None, 0)
podium_card(bronze, "🥉 Bronze", results[2] if len(results) > 2 else None, 120)
