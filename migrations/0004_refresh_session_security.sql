ALTER TABLE refresh_sessions ADD COLUMN family_id TEXT;
ALTER TABLE refresh_sessions ADD COLUMN device_id TEXT;
ALTER TABLE refresh_sessions ADD COLUMN revoked_reason TEXT;
ALTER TABLE refresh_sessions ADD COLUMN replaced_by_jti TEXT;

UPDATE refresh_sessions
SET family_id = jti
WHERE family_id IS NULL;

UPDATE refresh_sessions
SET device_id = 'unknown'
WHERE device_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_family_id ON refresh_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_device_id ON refresh_sessions(device_id);
