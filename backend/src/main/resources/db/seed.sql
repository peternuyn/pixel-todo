-- Seed default pet catalog
-- Fixed UUIDs so these rows are stable across all environments.
-- Run once after init.sql:  psql -U studyfarm -d studyfarm -f seed.sql

INSERT INTO pets (pet_id, pet_name, sprite_key, description) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Cat',    'cat',    'A sleepy cat who studies best at 3am'),
    ('a1000000-0000-0000-0000-000000000002', 'Cow',    'cow',    'A reliable cow who never misses a session'),
    ('a1000000-0000-0000-0000-000000000003', 'Chicken','chicken','An early bird who is always up before sunrise'),
    ('a1000000-0000-0000-0000-000000000004', 'Casey', 'human', 'Just a regular student trying their best')
ON CONFLICT (pet_id) DO NOTHING;
