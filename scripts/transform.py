import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(base_dir)
exercise_mdata = os.path.join(base_dir, "data", "raw", "exercise_metadata.csv")
heartrate_data = os.path.join(base_dir, "data", "raw", "heart_rate_zones.csv")
users_metadata = os.path.join(base_dir, "data", "raw", "users_metadata_messy.csv")
workout_data = os.path.join(base_dir, "data", "raw", "workout_sessions_messy.csv")

def standardise_data(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = (
        df.columns.str
        .strip()
        .upper()
    )
    return df


def drop_dup_data(): # dropping duplicate data function
    pass


def drop_na():
    pass

def transform_raw_data():
    print("Hello")
    return


if __name__ == "__main__":
    data = transform_raw_data()
       