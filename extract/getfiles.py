import os
import pandas as pd

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_file_path(file_name: str) -> str:
    return os.path.join(base_dir, "data", "raw", file_name)


def extract_data(files: list[str]) -> dict:
    extracted_data = {}

    for file_name in files:
        print(f"printing file:{file_name}")

        file_path = get_file_path(file_name)

        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue

        df = pd.read_csv(file_path)
        extracted_data[file_name] = df

    return extracted_data
