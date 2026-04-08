DROP TABLE IF EXISTS exercise_entries;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS user_profiles;

-- DATE 

CREATE TABLE user_profiles (
    user_id VARCHAR(100) PRIMARY KEY,
    age INTEGER,
    gender VARCHAR(10),
    height_m DECIMAL(4,2),
    weight_kg DECIMAL(5,2),
    experience_level VARCHAR(20),
    workout_frequency_days_week INTEGER,
    fat_percentage DECIMAL(5,2)
);

CREATE TABLE workout_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id VARCHAR(5) NOT NULL,
    session_date DATE NOT NULL,
    duration_value DECIMAL(5,2),
    duration_unit VARCHAR(20),
    workout_type VARCHAR(50),
    feeling_score DECIMAL(4,2),
    calories_burned DECIMAL(6,2),
    avg_bpm DECIMAL(5,2),
    max_bpm INTEGER,
    water_intake_l DECIMAL(4,2),
    workout_category VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

CREATE TABLE exercise_entries (
    entry_id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    exercise_name VARCHAR(100),
    sets DECIMAL(5,2),
    reps DECIMAL(5,2),
    weight_value DECIMAL(6,2),
    weight_unit VARCHAR(10),
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id)
);


CREATE TABLE workout_sessions_staging (
    user_id VARCHAR(5),
    session_date DATE,
    exercise VARCHAR(100),
    sets VARCHAR(20),
    reps VARCHAR(20),
    weight_kg VARCHAR(20),
    session_duration_hr VARCHAR(20),
    calories_burned VARCHAR(20),
    avg_bpm VARCHAR(20),
    max_bpm VARCHAR(20),
    water_intake_l VARCHAR(20),
    workout_type VARCHAR(50),
    workout_difficulty VARCHAR(50),
    workout_category VARCHAR(20)
);

