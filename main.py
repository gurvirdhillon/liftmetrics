import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extract.getfiles import extract_files
from transform.transform import transform_raw_data, save_cleaned_data
from load.load import load_csv_to_psql

def main():
    if len(sys.argv) < 2:
        print("Use run_app <dev|test|prod>")
        sys.exit(1)

    env = sys.argv[1]
    print(f"Running in {env} environment")

    files = [
        "exercise_metadata.csv",
        "workout_sessions_messy.csv",
        "users_metadata_messy.csv",
        "heart_rate_zones.csv"
    ]

    extracted_data = extract_files(files)

    if extracted_data:
        print("Extraction completed successfully")
    else:
        print("No data extracted")

    print("Running transform...")
    transformed_data = transform_raw_data()

    save_cleaned_data(transformed_data)

    print("Transformation completed successfully")
    print("DEBUG: got past transform")

    print("Loading CSV to PostgreSQL...")
    load_csv_to_psql()

    print("ETL pipeline successfully complete...")


if __name__ == "__main__":
    main()