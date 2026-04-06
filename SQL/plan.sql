CREATE TABLE plans(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal varchar(30) NOT NULL,
    available_days TEXT NOT NULL,
    session_duration INT NOT NULL,
    workout_location varchar(4),
    fitness_level varchar(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)