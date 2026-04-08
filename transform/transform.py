import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(base_dir)

exercise_mdata = os.path.join(base_dir, "data", "raw", "exercise_metadata.csv")
heartrate_data = os.path.join(base_dir, "data", "raw", "heart_rate_zones.csv")
users_metadata = os.path.join(base_dir, "data", "raw", "users_metadata_messy.csv")
workout_data = os.path.join(base_dir, "data", "raw", "workout_sessions_messy.csv")


files = {
    "exercise_mdata": exercise_mdata,
    "heartrate_data": heartrate_data,
    "users_metadata": users_metadata,
    "workout_data": workout_data
}


def standardise_data(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = (
        df.columns
        .str.strip()
        .str.upper()
    )
    return df


def drop_dup_data(df: pd.DataFrame, subset=None) -> pd.DataFrame:
    return df.drop_duplicates(subset=subset)


index_map = {
    "users_metadata": "USER_ID",
}


def set_index_for_files(df: pd.DataFrame, dataset_name: str) -> pd.DataFrame:
    index_col = index_map.get(dataset_name)

    if index_col is None:
        return df

    if index_col not in df.columns:
        print(f"{index_col} not found in {dataset_name}")
        return df

    if df[index_col].isna().any():
        print(f"Warning: {dataset_name} has nulls in {index_col}")

    return df.set_index(index_col)


def transform_to_standardised_format(df: pd.DataFrame, dataset_name: str) -> pd.DataFrame:
    if dataset_name == "users_metadata":
        df["GENDER"] = (
            df["GENDER"]
            .astype(str)
            .str.strip()
            .str.upper()
        )

        gender_map = {
            "M": "MALE",
            "F": "FEMALE"
        }

        df["GENDER"] = df["GENDER"].replace(gender_map)

        df["HEIGHT_M"] = df.groupby("GENDER")["HEIGHT_M"].transform(
            lambda x: x.fillna(x.median())
        )

        df["FAT_PERCENTAGE"] = df.groupby(["GENDER", "EXPERIENCE_LEVEL"])["FAT_PERCENTAGE"].transform(
            lambda x: x.fillna(x.mean())
        )
        
        df["EXPERIENCE_LEVEL"] = (
            df["EXPERIENCE_LEVEL"].astype(str).str.strip().str.upper()
        )
        
        exp_map = {
            "MID": "INTERMEDIATE",
            "INT": "INTERMEDIATE",
            "B": "BEGINNER",
            "BEGINER": "BEGINNER",
            "EXPERT": "ADVANCED",
            "ADV": "ADVANCED"
        }
        
        df["EXPERIENCE_LEVEL"] = df["EXPERIENCE_LEVEL"].replace(exp_map)
        
    if dataset_name == "workout_data":
        df["USER_ID"] = df["USER_ID"].astype(str).str.strip()
        
    if dataset_name == "workout_data":
        df["EXERCISE"] = df["EXERCISE"].str.strip().str.upper()
        
        exercise_map = {
            "CYCLING": "BIKE",
            "H.I.I.T": "HIIT",
            "RUNNING": "RUN",
            "HIGH INTENSITY INTERVAL TRAINING": "HIIT",
            "YOGA FLOW": "YOGA",
            "BACK SQUAT": "SQUAT",
            "INDOOR ROWING": "ROW",
            "ROWING": "ROW",
            "BENCH PRESS": "BENCHPRESS"
        }
        df["EXERCISE"] = df["EXERCISE"].replace(exercise_map)
        
    return df


def transform_raw_data():
    cleaned_data = {}

    for name, path in files.items():
        df = pd.read_csv(path)
        df = standardise_data(df)
        df = drop_dup_data(df)
        df = set_index_for_files(df, name)
        df = transform_to_standardised_format(df, name)
        cleaned_data[name] = df

    return cleaned_data


if __name__ == "__main__":
    cleaned_data = transform_raw_data()

    users_df = cleaned_data["users_metadata"]
    workout_data = cleaned_data["workout_data"]

    print(users_df["GENDER"].unique())
    print(users_df["AGE"].isna().sum())
    print(users_df["HEIGHT_M"].isna().sum())
    print(users_df["FAT_PERCENTAGE"].isna().sum())
    print(users_df["EXPERIENCE_LEVEL"].unique())
    print(users_df["WORKOUT_FREQUENCY_DAYS_WEEK"].min()) # 2 which is a normal amount as well
    print(users_df["WORKOUT_FREQUENCY_DAYS_WEEK"].max()) # 5 which is a normal amount
    print(users_df["WORKOUT_FREQUENCY_DAYS_WEEK"].isna().sum()) # none so fillna is not needed
    print(workout_data["USER_ID"].unique())
    print(workout_data["EXERCISE"].unique())
    