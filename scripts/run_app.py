import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extract.getfiles import extract_data
from transform.transform import transform_raw_data, save_cleaned_data


def main():
    if len(sys.argv) < 2:
        print("Use python run_app.py <dev|test|prod>")
        sys.exit(1)

    env = sys.argv[1]
    print(f"Running in {env} environment")

    files = [
        "exercise_metadata.csv",
        "workout_sessions_messy.csv",
        "users_metadata_messy.csv",
        "heart_rate_zones.csv"
    ]

    extracted_data = extract_data(files)

    if extracted_data:
        print("Extraction completed successfully")
        print("Running transform...")

        cleaned_data = transform_raw_data()
        save_cleaned_data(cleaned_data)

        print("Transformation completed successfully")
    else:
        print("No data extracted")


if __name__ == "__main__":
    main()