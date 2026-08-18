CREATE TABLE IF NOT EXISTS generated_plans (
  plan_id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id),
  goal VARCHAR(30) NOT NULL,
  profile JSONB NOT NULL,
  plan JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS generated_plans_user_created_at_idx
  ON generated_plans (user_id, created_at DESC);
