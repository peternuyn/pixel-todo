package com.meowdow.studyfarm.roomtimer;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * The exact JSON shape of a room timer, used in TWO places that must agree:
 *   1. The REST controller returns it from GET/POST/PATCH (the HTTP reply).
 *   2. The service BROADCASTS it over WebSocket to /topic/rooms/{id}/timer.
 *
 * Keeping it in one shared record (instead of one per layer) guarantees a client
 * sees the identical structure whether it asked over HTTP or received a push.
 *
 * Why include BOTH endsAt and remainingSeconds? endsAt lets the browser run its
 * own smooth per-second countdown (remaining = endsAt - now) while RUNNING;
 * remainingSeconds is the right number to show while IDLE/PAUSED (when endsAt is
 * null). The factory computes a consistent snapshot via RoomTimer.computeRemaining().
 *
 * 'completed' is a transient flag (not stored): it's set true only on the single
 * broadcast we send the moment a clock naturally reaches 00:00, so the UI can play
 * a "session done!" cue. Normal reads send false.
 */
public record RoomTimerResponse(
        UUID roomId,
        String state,            // "IDLE" | "RUNNING" | "PAUSED"
        int durationSeconds,
        int remainingSeconds,
        OffsetDateTime endsAt,
        UUID updatedBy,
        OffsetDateTime updatedAt,
        boolean completed
) {
    /** Build a response for a normal read/update (completed = false). */
    public static RoomTimerResponse from(RoomTimer t) {
        return from(t, false);
    }

    /** Build a response, optionally flagging that the clock just finished. */
    public static RoomTimerResponse from(RoomTimer t, boolean completed) {
        return new RoomTimerResponse(
                t.getRoomId(),
                t.getState().name(),
                t.getDurationSeconds(),
                t.computeRemaining(),
                t.getEndsAt(),
                t.getUpdatedBy(),
                t.getUpdatedAt(),
                completed
        );
    }
}
