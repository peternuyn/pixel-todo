package com.leapandbound.roomtimer;

/**
 * The three states a room's shared clock can be in.
 *
 *   IDLE    - not started (or has been reset). Shows the full configured duration.
 *   RUNNING - counting down. ends_at tells us when it will reach 00:00.
 *   PAUSED  - frozen mid-countdown. remaining_seconds holds what was left.
 *
 * We store this in the DB as a lowercase string ('idle'/'running'/'paused') to
 * match the human-readable CHECK constraint in init.sql. The @Enumerated(STRING)
 * mapping on the entity field handles the conversion; we keep the enum NAMES
 * uppercase (Java convention) and lowercase them at the DB edge.
 */
public enum RoomTimerState {
    IDLE,
    RUNNING,
    PAUSED
}
