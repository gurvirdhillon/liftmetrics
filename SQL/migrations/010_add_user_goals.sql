ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS daily_calorie_target INTEGER NOT NULL DEFAULT 2000 CHECK (daily_calorie_target BETWEEN 500 AND 10000),
  ADD COLUMN IF NOT EXISTS daily_protein_target_g INTEGER NOT NULL DEFAULT 120 CHECK (daily_protein_target_g BETWEEN 10 AND 1000),
  ADD COLUMN IF NOT EXISTS weekly_workout_target INTEGER NOT NULL DEFAULT 3 CHECK (weekly_workout_target BETWEEN 1 AND 7);
