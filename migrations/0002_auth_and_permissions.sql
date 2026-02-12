CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

INSERT OR IGNORE INTO users (id, email, password_hash, role)
VALUES (1, 'system@local', 'DISABLED_LOGIN', 'admin');

ALTER TABLE todos ADD COLUMN user_id INTEGER REFERENCES users(id);

UPDATE todos
SET user_id = 1
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
