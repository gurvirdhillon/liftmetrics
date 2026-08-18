import os
from pathlib import Path

import pandas as pd
import psycopg2
import streamlit as st
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)


def require_authenticated_user():
    if not st.user.is_logged_in:
        st.title("LiftMetrics insights")
        st.write("Log in with your LiftMetrics account to view your private progress.")
        if st.button("Log in with Auth0"):
            st.login("auth0")
        st.stop()

    user_id = st.user.get("sub")
    if not user_id:
        st.error("Your identity did not include a user ID. Please log out and sign in again.")
        st.stop()
    return user_id


def get_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=os.environ["DB_PORT"],
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def load_user_workouts(user_id):
    workout_query = """
        SELECT session_id, session_date, duration_value, duration_unit, workout_type,
               feeling_score, calories_burned, avg_bpm, max_bpm, water_intake_l,
               distance_value, distance_unit, avg_pace
        FROM workout_sessions
        WHERE user_id = %(user_id)s
        ORDER BY session_date
    """
    exercise_query = """
        SELECT ws.session_date, ws.workout_type, ee.exercise_name, ee.sets, ee.reps,
               ee.weight_value, ee.weight_unit
        FROM exercise_entries ee
        JOIN workout_sessions ws ON ws.session_id = ee.session_id
        WHERE ws.user_id = %(user_id)s
        ORDER BY ws.session_date
    """
    with get_connection() as connection:
        workouts = pd.read_sql_query(workout_query, connection, params={"user_id": user_id})
        exercises = pd.read_sql_query(exercise_query, connection, params={"user_id": user_id})
    return workouts, exercises
