import pandas as pd
import os
from typing import Optional
import logging as log

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.fspath(__file__))))
log_dir = os.path.join(base_dir, "logs")
log_file = os.path.join(log_dir, "app.log")

os.makedirs(log_dir, exist_ok=True)


def get_file_path(file_name: str) -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.fspath(__file__))))
    return os.path.join(base_dir, "fitness_track_project", "data", "raw", file_name)


def file_exists(file_path: str) -> bool:
    return os.path.exists(file_path)

def extract_data(file_name="exercise_metadata.csv") -> Optional[pd.DataFrame]:
    file_path = get_file_path(file_name)

    logger.info(f"Looking for file at: {file_path}")

    if not os.path.exists(file_path):
        logger.error(f"File not found at: {file_path}")
        return None

    try:
        df = pd.read_csv(file_path)
        logger.info(f"Loaded dataframe with shape: {df.shape}")
        return df
    except Exception:
        logger.exception("Error reading CSV")
        return None


def extract_files(file_names: list[str]) -> dict[str, pd.DataFrame]:
    data = {}
    for file in file_names:
        print(f"printing file:{file}")
        logger.info(f"Processing file:{file}")
        df = extract_data(file)
        
        if df is not None:
            data[file] = df
        else:
            logger.warning(f"skipping file: {file}")
    
    return data


log.basicConfig(
    level=log.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    handlers=[
        log.FileHandler(log_file),
        log.StreamHandler()
    ]
)

logger = log.getLogger(__name__)


if __name__ == "__main__":
    files = ["exercise_metadata.csv",
             "workout_sessions_messy.csv",
             "users_metadata_messy.csv",
             "heart_rate_zones.csv"
             ]
    df = extract_files(files)
    if df is not None:
        print("DATAFRAME EXTRACTED SUCCESSFULLY!")
        logger.info("Data successfully extracted")
        
