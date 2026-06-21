package com.leapandbound.roomtimer;

import jakarta.persistence.*;
import lombok.*;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A RoomTimer is a room's SHARED Pomodoro clock — exactly one per room. It maps
 * to the `room_timers` table in init.sql.
 *
 * THE KEY IDEA (read this first): we do NOT store a number that we decrement
 * every second. Instead, while the clock is RUNNING we store endsAt — the exact
 * instant it will reach 00:00. Anyone can then work out the time left with simple
 * subtraction: remaining = endsAt - now. This is why every user sees the same
 * countdown without us pushing a "tick" message each second: they all subtract
 * from the same shared endsAt. remainingSeconds is only used while the clock is
 * IDLE or PAUSED, where "ends_at" has no meaning (the clock isn't moving).
 *
 * Note the @Id is roomId itself (a "shared primary key"): there's no separate
 * timer id because a room owns exactly one timer, so the room's id IS the timer's
 * id. Like the rest of this project, the foreign key to rooms lives in init.sql.
 */
@Entity
@Table(name = "room_timers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTimer {

    @Id
    @Column(name = "room_id", updatable = false, nullable = false)
    private UUID roomId;

    // The length the clock is set to (seconds). Used to display the full time when
    // IDLE and to restore it on reset. 1500s = 25 min, the classic Pomodoro.
    @Column(name = "duration_seconds", nullable = false)
    @Builder.Default
    private int durationSeconds = 1500;

    // @Enumerated(STRING) saves the enum's NAME ('IDLE'/'RUNNING'/'PAUSED') as
    // text, which is readable in the DB and matches the CHECK constraint. The
    // alternative, ORDINAL, would store 0/1/2 — compact but fragile, because
    // reordering the enum later would silently corrupt existing rows.
    @Enumerated(EnumType.STRING)
    @Column(name = "state", nullable = false, length = 8)
    @Builder.Default
    private RoomTimerState state = RoomTimerState.IDLE;

    // Only meaningful while RUNNING: the instant the clock hits 00:00. Null
    // otherwise. This is the single source of truth all clients subtract from.
    @Column(name = "ends_at")
    private OffsetDateTime endsAt;

    // The snapshot of "seconds left" used while IDLE or PAUSED. When we pause, we
    // freeze the live (endsAt - now) value into here; when we resume, we rebuild
    // endsAt from it.
    @Column(name = "remaining_seconds", nullable = false)
    @Builder.Default
    private int remainingSeconds = 1500;

    // Who last changed the clock (foreign key to users.user_id). Handy for the UI
    // to show "started by X" and for debugging. Nullable so a deleted user doesn't
    // break the row (ON DELETE SET NULL in init.sql).
    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /**
     * How many whole seconds are left RIGHT NOW.
     *
     * RUNNING  -> compute it live from endsAt (clamped at 0 so a finished clock
     *             never reports a negative time, e.g. if a client polls a moment
     *             after it ended).
     * IDLE/PAUSED -> just return the frozen snapshot.
     *
     * The frontend gets endsAt too and does this same maths locally every frame;
     * this server-side version is for the snapshot we hand out and store.
     */
    public int computeRemaining() {
        if (state == RoomTimerState.RUNNING && endsAt != null) {
            long left = Duration.between(OffsetDateTime.now(), endsAt).getSeconds();
            return left > 0 ? (int) left : 0;
        }
        return remainingSeconds;
    }
}
