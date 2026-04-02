import os
import sys

import pandas as pd
import subprocess
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def start_streamlit_page():
    project_root = Path(__file__).resolve().parent[1]
    streamlit_path = project_root /  "streamlit" / "app.py"
    

def main():
    if len(sys.argv) < 2:
        print("Use python run_app.py <dev|test|prod>")
        sys.exit(1)
    env = sys.argv[1]
    
