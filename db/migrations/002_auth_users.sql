-- Platform auth users (email/password). Isolated to schema platform.
CREATE TABLE IF NOT EXISTS platform.users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('platform_admin', 'agency_user')),
  tenant_id text,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON platform.users (lower(email));

CREATE TABLE IF NOT EXISTS platform.sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES platform.users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON platform.sessions (user_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx
  ON platform.sessions (expires_at);

INSERT INTO platform.schema_migrations (id)
VALUES ('002_auth_users')
ON CONFLICT (id) DO NOTHING;
