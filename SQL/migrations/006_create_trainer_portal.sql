ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_role VARCHAR(20) NOT NULL DEFAULT 'client'
  CHECK (account_role IN ('client', 'trainer'));

CREATE TABLE IF NOT EXISTS trainer_invites (
  invite_id UUID PRIMARY KEY,
  trainer_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  invite_code VARCHAR(32) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trainer_clients (
  trainer_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  client_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (trainer_id, client_id),
  CHECK (trainer_id <> client_id)
);

CREATE TABLE IF NOT EXISTS trainer_notes (
  note_id UUID PRIMARY KEY,
  trainer_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  client_id VARCHAR(100) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS trainer_clients_client_idx ON trainer_clients(client_id);
CREATE INDEX IF NOT EXISTS trainer_notes_client_created_idx ON trainer_notes(client_id, created_at DESC);
