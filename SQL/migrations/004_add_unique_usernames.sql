ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS username VARCHAR(24);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_unique_idx
  ON user_profiles (LOWER(username))
  WHERE username IS NOT NULL;
