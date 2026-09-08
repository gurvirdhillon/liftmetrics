ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS submission_id VARCHAR(36);

CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_user_submission_unique_idx
  ON workout_sessions (user_id, submission_id)
  WHERE submission_id IS NOT NULL;
