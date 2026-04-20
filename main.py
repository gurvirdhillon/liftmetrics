import os
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from scripts.extract import extract_data


def main():
    print("Starting pipeline process...")

    df = extract_data()

    if df is None:
        print("Extraction failed :/")
        return

    print("Extraction phase complete")
    print(df.head())
    print("pipeline finished")

