import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "streamlit"))

from personal_bests import cardio_podium, consistency_podium, strength_podium


def test_strength_podium_shows_weight_and_set_rep_prescription():
    exercises = pd.DataFrame([{"exercise_name": "Squat", "weight_value": 70, "weight_unit": "kg", "sets": 3, "reps": 12}])
    assert strength_podium(exercises) == ["🥇 Gold: Squat — 70 kg · 3 × 12"]


def test_cardio_podium_converts_miles_to_kilometres():
    workouts = pd.DataFrame([{"workout_type": "Cardio", "distance_value": 3, "distance_unit": "miles", "duration_value": 30, "duration_unit": "mins", "session_date": pd.Timestamp("2026-08-18")}])
    assert "4.8 km" in cardio_podium(workouts)[0]


def test_consistency_podium_ranks_busiest_week():
    workouts = pd.DataFrame({"session_date": pd.to_datetime(["2026-08-18", "2026-08-19", "2026-08-10"])})
    assert "2 sessions" in consistency_podium(workouts)[0]
