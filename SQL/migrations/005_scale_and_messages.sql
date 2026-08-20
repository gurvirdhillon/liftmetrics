CREATE INDEX IF NOT EXISTS workout_sessions_user_date_idx
  ON workout_sessions (user_id, session_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS exercise_entries_session_idx
  ON exercise_entries (session_id);

CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  username VARCHAR(24) NOT NULL,
  text VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at DESC);
