package com.meowdow.studyfarm.session;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A Session is one study "clock run" — from the moment a user starts studying
 * until they stop. It maps to the `sessions` table in init.sql.
 *
 * Personal vs room clock is decided by ONE field:
 *   - roomId == null  -> a PERSONAL pomodoro (just this user)
 *   - roomId != null  -> the user is studying on a ROOM's shared clock
 * Either way the elapsed time is added to the user's total study time when the
 * session ends. A user may only have ONE session running at a time (enforced in
 * SessionService), so they can't have two clocks ticking at once.
 */
@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "session_id", updatable = false, nullable = false)
    private UUID sessionId;

    // Who is studying. Stored as a raw UUID (foreign key to users.user_id),
    // matching how Room stores hostId — no @ManyToOne needed.
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    // Which room's clock this belongs to, or null for a personal session.
    // The DB column is nullable (ON DELETE SET NULL), so this can become null
    // later if the room is deleted while the session row remains for history.
    @Column(name = "room_id")
    private UUID roomId;

    @Column(name = "started_at", nullable = false, updatable = false)
    private OffsetDateTime startedAt;

    // null while the session is still running; set when the user stops.
    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    // Integer (not int) so it can be null until the session ends — a primitive
    // int cannot represent "not finished yet".
    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @PrePersist
    void onCreate() {
        if (startedAt == null) {
            startedAt = OffsetDateTime.now();
        }
    }

    /** A session is "active" (clock running) until it has an end time. */
    public boolean isActive() {
        return endedAt == null;
    }

    /** True if this is a room clock; false if it's a personal clock. */
    public boolean isRoomSession() {
        return roomId != null;
    }
}
