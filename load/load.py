import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()


def load_csv_to_psql():
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT")
    DB_NAME = os.getenv("DB_NAME")

    ENGINE = create_engine(
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    csv_path = "../data/processed/workout_data_clean.csv"

    df = pd.read_csv(csv_path)

    df.to_sql("workout_sessions_clean", ENGINE, if_exists="replace", index=False)
    
    print("loaded csv to postgres successfully")
