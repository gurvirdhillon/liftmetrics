CREATE TABLE IF NOT EXISTS user_injury_restrictions (
    user_id VARCHAR(100) PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    affected_area VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    pain_score INTEGER NOT NULL CHECK (pain_score BETWEEN 0 AND 10),
    restricted_movements TEXT NOT NULL DEFAULT '',
    clinician_guidance TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
