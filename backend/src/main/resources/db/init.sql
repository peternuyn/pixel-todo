
--   docker exec -i studyfarm-postgres psql -U studyfarm -d studyfarm 

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  

CREATE TABLE users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(32)  NOT NULL UNIQUE,
    display_name   VARCHAR(64)  NOT NULL,
    password_hash  TEXT         NOT NULL,
    bio            TEXT         NOT NULL DEFAULT 'A cozy farm studier 🌾',
    avatar_url     TEXT,
    pet_id         UUID,                        -- FK added after pets table
    study_time_seconds  INT  NOT NULL DEFAULT 0,
    sessions_done       INT  NOT NULL DEFAULT 0,
    current_streak       INT  NOT NULL DEFAULT 0,
    longest_streak       INT  NOT NULL DEFAULT 0,
    last_studied_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Catalog of choosable pets (fixed set, seeded manually)
CREATE TABLE pets (
    pet_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_name    VARCHAR(64)  NOT NULL,
    sprite_key  VARCHAR(64)  NOT NULL UNIQUE,  -- maps to frontend asset filename
    description TEXT
);

-- Back-fill the FK on users now that pets exists
ALTER TABLE users
    ADD CONSTRAINT fk_users_pet
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE SET NULL;

CREATE TABLE rooms (
    room_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id        UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name           VARCHAR(64)  NOT NULL,
    description    TEXT,
    capacity       INT          NOT NULL DEFAULT 10,
    total_members  INT          NOT NULL DEFAULT 0,
    status         VARCHAR(8)   NOT NULL DEFAULT 'public' CHECK (status IN ('public', 'private')),
    password_hash  TEXT,                        -- NULL for public rooms
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Tags are user-defined and reusable across rooms
CREATE TABLE tags (
    tag_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(32)  NOT NULL UNIQUE,
    created_by  UUID         REFERENCES users(user_id) ON DELETE SET NULL
);

-- which tags belong to which room
CREATE TABLE room_tags (
    room_id  UUID  NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    tag_id   UUID  NOT NULL REFERENCES tags(tag_id)   ON DELETE CASCADE,
    PRIMARY KEY (room_id, tag_id)
);

CREATE TABLE belong_room (
    user_id    UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_id    UUID        NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    role       VARCHAR(8)  NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, room_id)
);

CREATE TABLE sessions (
    session_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID  NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_id           UUID  REFERENCES rooms(room_id) ON DELETE SET NULL,
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at          TIMESTAMPTZ,
    duration_seconds  INT          -- computed/set when session ends
);

-- A room's SHARED to-do list. Every member sees the same rows; anyone in the
-- room may add, tick, or delete a task. (The PERSONAL to-do list is NOT stored
-- here — the frontend keeps that in the browser's localStorage.)
-- ON DELETE CASCADE on room_id: deleting a room removes its tasks too.
CREATE TABLE room_tasks (
    task_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id      UUID         NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    created_by   UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title        VARCHAR(256) NOT NULL,
    completed    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ              -- NULL until the task is ticked off
);


-- A room's CHAT LOG. One row per message, in the room everyone shares. Like
-- room_tasks, ownership/links are raw UUIDs, and ON DELETE CASCADE means deleting
-- a room (or a user) sweeps away their messages too — no orphan rows left behind.
CREATE TABLE room_messages (
    message_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID         NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content     TEXT         NOT NULL,    -- free text; image URLs/links are rendered by the frontend
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Emoji REACTIONS on a message. The primary key is the TRIPLE (message, user,
-- emoji) — the same "composite key" idea as belong_room(user_id, room_id). It
-- lets one user react to a message with 👍 AND ❤️, but stops them adding the SAME
-- emoji twice (the DB rejects a duplicate (message,user,emoji) row). We store who
-- reacted (user_id) so the UI can show counts and highlight your own reactions.
CREATE TABLE message_reactions (
    message_id UUID        NOT NULL REFERENCES room_messages(message_id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(user_id)            ON DELETE CASCADE,
    emoji      VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);




-- A room's SHARED Pomodoro clock. Exactly ONE row per room (room_id is the
-- primary key), so the room "owns" a single clock everyone sees.
--
-- The clock is stored as a TIMESTAMP, not a ticking number: while it's running we
-- record ends_at (the instant it will hit 00:00). Every client then computes
-- remaining = ends_at - now on its own, so all clients agree without us streaming
-- a per-second countdown over the network. remaining_seconds is only a snapshot
-- used while the clock is idle or paused (when ends_at is meaningless).
-- ON DELETE CASCADE: deleting a room removes its timer row too.
CREATE TABLE room_timers (
    room_id           UUID PRIMARY KEY REFERENCES rooms(room_id) ON DELETE CASCADE,
    duration_seconds  INT          NOT NULL DEFAULT 1500,   -- configured length (25 min)
    -- Stored UPPERCASE to match JPA's @Enumerated(STRING), which persists the enum
    -- constant name (e.g. RoomTimerState.IDLE -> 'IDLE'). This mirrors how the
    -- rooms.status column behaves with the RoomStatus enum.
    state             VARCHAR(8)   NOT NULL DEFAULT 'IDLE'
                       CHECK (state IN ('IDLE', 'RUNNING', 'PAUSED')),
    ends_at           TIMESTAMPTZ,                          -- set only while running
    remaining_seconds INT          NOT NULL DEFAULT 1500,   -- snapshot for idle/paused
    updated_by        UUID         REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


CREATE INDEX idx_rooms_host         ON rooms(host_id);
CREATE INDEX idx_belong_room_user   ON belong_room(user_id);
CREATE INDEX idx_belong_room_room   ON belong_room(room_id);
CREATE INDEX idx_sessions_user      ON sessions(user_id);
CREATE INDEX idx_sessions_room      ON sessions(room_id);
CREATE INDEX idx_pets_sprite_key    ON pets(sprite_key);
CREATE INDEX idx_room_tasks_room    ON room_tasks(room_id);
-- Chat: list a room's messages oldest-first quickly (room_id + created_at), and
-- look up all reactions for a message fast.
CREATE INDEX idx_room_messages_room    ON room_messages(room_id, created_at);
CREATE INDEX idx_message_reactions_msg ON message_reactions(message_id);
