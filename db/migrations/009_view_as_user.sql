-- Platform admin "View as user": session may temporarily act as another login.
ALTER TABLE platform.sessions
  ADD COLUMN IF NOT EXISTS view_as_user_id text
    REFERENCES platform.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sessions_view_as_user_id_idx
  ON platform.sessions (view_as_user_id)
  WHERE view_as_user_id IS NOT NULL;

INSERT INTO platform.schema_migrations (id)
VALUES ('009_view_as_user')
ON CONFLICT (id) DO NOTHING;
