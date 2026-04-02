import os
from dotenv import load_dotenv


def setup_env(env):
    env_file = f".env.{env}"
    if os.path.exists(env_file):
        load_dotenv(env_file)
        print(f"Loaded environment:{env_file}")
    else:
        print(f"Environment {env_file} not found")