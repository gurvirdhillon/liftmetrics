ALTER TABLE exercise_entries
  ADD COLUMN IF NOT EXISTS exercise_external_id VARCHAR(100);
