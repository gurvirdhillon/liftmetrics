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


# def drop_na(df, subset=None):
    # return df.dropna(subset=subset)


for name, path in files.items():
    df = pd.read_csv(path)
    # df = drop_na(df)
    # print(f"In {name}: dropped {len(df)} na's")


def transform_raw_data():
    cleaned_data = {}
    
    for name, path in files.items():
        df = pd.read_csv(path)
        df = standardise_data(df)
        # df = drop_na(df)
        df = drop_dup_data(df)
        cleaned_data[name] = df
    return cleaned_data


index_map = {
    "users_metadata": "user_id",
}


def set_index_for_files(df, dataset_name):
    index_col = index_map.get(dataset_name)
    if index_col is None:
        return df
    
    if index_col not in df.columns:
        print(f"{index_col} not found in {dataset_name}")
        return df
    
    if df[index_col].isna().any():
        print(f"warning: {dataset_name} has nulls in {index_col}")
    
    return df.set_index(index_col)


def transform_to_standardised_format(df, dataset_name):
    
    if dataset_name == "users_metadata":
        df["gender"] = (
            df["gender"]
            .str.strip()
            .str.upper()
        )
    if dataset_name == "users_metadata":
        df["height_m"] = (
            df.groupby("gender")["height_m"].transform(lambda x: x.fillna(x.median())
        ))
        
    if dataset_name == "users_metadata":
        df["fat_percentage"] = (df.groupby(["gender", "experience_level"])["fat_percentage"].transform(lambda x: x.fillna(x.mean()))
)
        

        gender_map = {
            "M": "MALE",
            "F": "FEMALE"
        }

        df["gender"] = df["gender"].map(gender_map)

    return df

# def to_csv_file(df):
    

for name, path in files.items():
    df = pd.read_csv(path)
    df = transform_to_standardised_format(df, name)


if __name__ == "__main__":
    data = transform_raw_data()
    df = set_index_for_files(df, name)
    df = transform_to_standardised_format(df, name)
    users_metadata_unique = pd.read_csv(users_metadata)
    print(users_metadata_unique["gender"].unique())
    print(users_metadata_unique["age"].isna().sum())
    print(users_metadata_unique["height_m"].isna().sum())
    print(users_metadata_unique["fat_percentage"].isna().sum())
    