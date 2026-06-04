
--   psql -U studyfarm -d studyfarm -f init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  

CREATE TABLE users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(32)  NOT NULL UNIQUE,
    display_name   VARCHAR(64)  NOT NULL,
    password_hash  TEXT         NOT NULL,
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




CREATE INDEX idx_rooms_host         ON rooms(host_id);
CREATE INDEX idx_belong_room_user   ON belong_room(user_id);
CREATE INDEX idx_belong_room_room   ON belong_room(room_id);
CREATE INDEX idx_sessions_user      ON sessions(user_id);
CREATE INDEX idx_sessions_room      ON sessions(room_id);
CREATE INDEX idx_pets_sprite_key    ON pets(sprite_key);
