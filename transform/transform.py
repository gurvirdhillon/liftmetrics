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
        .strip().str
        .upper()
    )
    return df


files = {
    "exercise_mdata": exercise_mdata,
    "heartrate_data": heartrate_data,
    "users_metadata": users_metadata,
    "workout_data": workout_data
}

def drop_dup_data(df, subset=None): # dropping duplicate data function
    return df.drop_duplicates(subset=subset)


for name, path in files.items():
    df = pd.read_csv(path)
    df = drop_dup_data(df)
    print(f"{name}: {len(df)} rows after deduplication")

    
def drop_na(df, subset=None):
    return df.dropna(subset=subset)

for name, path in files.items():
    df = pd.read_csv(path)
    df = drop_na(df)
    print(f"In {name}: dropped na's")


def transform_raw_data():
    cleaned_data = {}
    
    for name, path in files.items():
        df = pd.read_csv(path)
        df = standardise_data(df)
        df = drop_na(df)
        df = drop_dup_data(df)
        cleaned_data[name] = df
    return cleaned_data

if __name__ == "__main__":
    data = transform_raw_data()
