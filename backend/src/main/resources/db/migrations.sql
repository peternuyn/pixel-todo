-- Incremental schema changes for databases created from an OLDER init.sql.
--
-- Spring runs this file on every startup, BEFORE Hibernate validates the schema
-- (spring.sql.init.* in application.properties). So every statement here MUST be
-- idempotent (IF NOT EXISTS / safe to re-run). Fresh databases already get these
-- from init.sql, so here they're no-ops.
--
-- Mirror any change you add here in init.sql too.

-- Pet growth (2026-11): XP that grows the user's pet.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pet_xp INT NOT NULL DEFAULT 0;
-- Seed existing users' pets from the time they've already studied (1 XP / minute),
-- so long-time users don't start over as an egg. Only touches users who have never
-- earned XP, so it's a no-op after the first run.
UPDATE users SET pet_xp = study_time_seconds / 60 WHERE pet_xp = 0 AND study_time_seconds >= 60;

-- Weekly leaderboard: sums sessions by ended_at.
CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at);
