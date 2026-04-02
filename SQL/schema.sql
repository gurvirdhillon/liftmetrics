DROP TABLE IF EXISTS exercise_entries;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS user_profiles;

CREATE TABLE user_profiles (
    user_id VARCHAR(5) PRIMARY KEY,
    age INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL,
    height_m DECIMAL(4,2) NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    experience_level VARCHAR(20) NOT NULL,
    workout_frequency_days_week INTEGER NOT NULL,
    fat_percentage DECIMAL(5,2)
);


CREATE TABLE workout_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id VARCHAR(5) NOT NULL,
    session_date DATE NOT NULL,
    exercise VARCHAR(100),
    sets DECIMAL(5,2),
    reps DECIMAL(5,2),
    weight_kg DECIMAL(6,2),
    session_duration_hr DECIMAL(5,2),
    calories_burned DECIMAL(6,2),
    avg_bpm DECIMAL(5,2),
    max_bpm INTEGER,
    water_intake_l DECIMAL(4,2),
    workout_type VARCHAR(50),
    workout_difficulty DECIMAL(4,2),
    workout_category VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id)
);

