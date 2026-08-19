DROP TABLE IF EXISTS exercise_entries;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS user_profiles;

-- DATE 

CREATE TABLE user_profiles (
    user_id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(24),
    age INTEGER,
    gender VARCHAR(10),
    height_m DECIMAL(4,2),
    weight_kg DECIMAL(5,2),
    experience_level VARCHAR(20),
    workout_frequency_days_week INTEGER,
    fat_percentage DECIMAL(5,2)
);

CREATE UNIQUE INDEX user_profiles_username_unique_idx
    ON user_profiles (LOWER(username))
    WHERE username IS NOT NULL;

CREATE TABLE workout_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    session_date DATE NOT NULL,
    duration_value DECIMAL(5,2),
    duration_unit VARCHAR(20),
    workout_type VARCHAR(50),
    feeling_score DECIMAL(4,2),
    calories_burned DECIMAL(6,2),
    distance_value DECIMAL(7,2),
    distance_unit VARCHAR(10),
    avg_pace DECIMAL(6,2),
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

CREATE TABLE generated_plans (
    plan_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id),
    goal VARCHAR(30) NOT NULL,
    profile JSONB NOT NULL,
    plan JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX generated_plans_user_created_at_idx
    ON generated_plans (user_id, created_at DESC);

CREATE TABLE user_injury_restrictions (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    affected_area VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    pain_score INTEGER NOT NULL CHECK (pain_score BETWEEN 0 AND 10),
    restricted_movements TEXT NOT NULL DEFAULT '',
    clinician_guidance TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
