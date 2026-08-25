CREATE TABLE IF NOT EXISTS food_entries (
  entry_id UUID PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  food_name VARCHAR(200) NOT NULL,
  serving_label VARCHAR(100),
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  calories DECIMAL(8,2) NOT NULL CHECK (calories >= 0),
  protein_g DECIMAL(8,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g DECIMAL(8,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g DECIMAL(8,2) NOT NULL CHECK (fat_g >= 0),
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  source_food_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS food_entries_user_date_idx
  ON food_entries (user_id, logged_date DESC, created_at DESC);
