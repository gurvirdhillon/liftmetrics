ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES generated_plans(plan_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS planned_session JSONB;

CREATE INDEX IF NOT EXISTS workout_sessions_plan_idx ON workout_sessions(plan_id);
