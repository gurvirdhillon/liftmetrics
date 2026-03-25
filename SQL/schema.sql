CREATE TABLE workout_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_date DATE NOT NULL,
    duration_value DECIMAL(5,2),
    duration_unit VARCHAR(20),
    workout_type VARCHAR(50),
    feeling_score INTEGER,
    avg_bpm INTEGER,
    max_bpm INTEGER,
    water_intake_l DECIMAL(4,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exercise_entries (
    entry_id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight_value DECIMAL(6,2),
    weight_unit VARCHAR(10),
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id)
);
