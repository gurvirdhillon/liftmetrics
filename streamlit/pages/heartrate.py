import streamlit as st
import pandas as pd
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
workout_csv_path = os.path.normpath(os.path.join(base_dir, "../../data/processed/workout_data_clean.csv"))

df = pd.read_csv(workout_csv_path)

st.set_page_config(page_title="Fitness levels", layout="wide")
st.title("Fitness levels")
st.write("Test your cardio to new limits.")

cardio_types = ["cardio", "hiit", "running", "cycling", "row"]
df_cardio = df[df["workout_type"].str.lower().isin(cardio_types)].copy()

df_cardio["session_duration_hr"] = pd.to_numeric(
    df_cardio["session_duration_hr"], errors="coerce"
)

df_cardio["duration_mins"] = df_cardio["session_duration_hr"] * 60

df_cardio["efficiency"] = df_cardio["duration_mins"] / df_cardio["avg_bpm"] # this sees how the duration of the workout matched the beats per minute and if the user has a higher or lower amount etc...

df_cardio["calories"] = pd.to_numeric(df_cardio["calories_burned"], errors="coerce")

def normalise(series):
    return (series - series.min()) / (series.max() - series.min())

df_cardio["norm_duration"] = normalise(df_cardio["duration_mins"])
df_cardio["norm_efficiency"] = normalise(df_cardio["efficiency"])
df_cardio["norm_calories"] = normalise(df_cardio["calories"].fillna(0))
df_cardio["norm_difficulty"] = normalise(10 - df_cardio["workout_difficulty"].fillna(5))

df_cardio["cardio_score"] = (
    df_cardio["norm_duration"] * 0.4 +
    df_cardio["norm_efficiency"] * 0.3 +
    df_cardio["norm_calories"] * 0.2 +
    df_cardio["norm_difficulty"] * 0.1
)

cardio_trend = (
    df_cardio.groupby(["user_id", "date"])["cardio_score"]
    .mean()
    .reset_index()
)


def cardio_recommendation(latest_score, prev_score, difficulty):
    change = latest_score - prev_score

    if change > 0.05 and difficulty <= 5:
        return "Increase duration or intensity"
    elif change > 0.05 and difficulty > 5:
        return "Maintain or slight increase"
    elif change < -0.05:
        return "Reduce intensity or take rest"
    else:
        return "Maintain current training"


user = st.selectbox("Select User", sorted(df_cardio["user_id"].astype(str).unique()))
user_cardio = df_cardio[df_cardio["user_id"].astype(str) == user].copy()
user_cardio = user_cardio.sort_values("date")

if len(user_cardio) < 2:
    st.warning("Not enough cardio sessions to make a recommendation.")
else:
    latest_row = user_cardio.iloc[-1]
    prev_row = user_cardio.iloc[-2]

    latest_score = latest_row["cardio_score"]
    prev_score = prev_row["cardio_score"]
    difficulty = latest_row["workout_difficulty"]

    recommendation = cardio_recommendation(latest_score, prev_score, difficulty)

    st.subheader("Cardio Recommendation")
    st.write(f"Latest cardio score: {latest_score:.2f}")
    st.write(f"Previous cardio score: {prev_score:.2f}")
    st.write(f"Last workout difficulty: {difficulty}/10")
    st.success(recommendation)

    st.subheader("Cardio Score Trend")
    trend = user_cardio.groupby("date", as_index=False)["cardio_score"].mean()
    st.line_chart(trend.set_index("date")["cardio_score"])
