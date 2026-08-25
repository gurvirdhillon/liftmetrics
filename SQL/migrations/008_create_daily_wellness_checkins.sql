CREATE TABLE IF NOT EXISTS daily_wellness_checkins (
  checkin_id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  sleep_hours DECIMAL(3,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
  sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
  energy_score INTEGER NOT NULL CHECK (energy_score BETWEEN 1 AND 5),
  soreness_score INTEGER NOT NULL CHECK (soreness_score BETWEEN 1 AND 5),
  stress_score INTEGER NOT NULL CHECK (stress_score BETWEEN 1 AND 5),
  notes VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS daily_wellness_checkins_user_date_idx
  ON daily_wellness_checkins (user_id, checkin_date DESC);

