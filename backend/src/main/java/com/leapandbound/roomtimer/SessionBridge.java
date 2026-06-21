package com.leapandbound.roomtimer;

import com.leapandbound.session.Session;
import com.leapandbound.session.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.UUID;

/**
 * A thin "bridge" that connects the room timer to the EXISTING study-time system
 * (SessionService), so that running the shared clock actually credits everyone's
 * study time, streaks and "sessions done" count.
 *
 * WHY A SEPARATE CLASS? The timer doesn't need to know HOW study time is recorded
 * — only that "these users started/stopped studying". By wrapping SessionService
 * here we reuse all of its rules unchanged (one clock per user, duration maths,
 * crediting the user) instead of duplicating them. If the accounting ever changes,
 * it changes in one place.
 *
 * Every method here is DEFENSIVE: starting/stopping a user's session can legitimately
 * be a no-op (they're already studying, or weren't studying at all). We swallow the
 * "expected" exceptions so one user's state never blocks the shared clock for the
 * whole room.
 */
@Component
@RequiredArgsConstructor
public class SessionBridge {

    private final SessionService sessionService;

    /**
     * Begin a study session for each given user on this room's clock.
     *
     * SessionService enforces "one active clock per user": if a user is already
     * studying (e.g. on their personal clock, or they joined while it was running),
     * startSession throws IllegalStateException — we catch and skip them so they're
     * simply not double-counted. IllegalArgumentException would mean a stale userId
     * (user deleted); we skip that too rather than fail the whole room.
     */
    public void startForUsers(UUID roomId, Collection<UUID> userIds) {
        for (UUID userId : userIds) {
            try {
                sessionService.startSession(userId, roomId);
            } catch (IllegalStateException | IllegalArgumentException ignored) {
                // Already studying, or unknown user — fine, just don't start one.
            }
        }
    }

    /** End the study sessions of many users (e.g. when the clock pauses/resets). */
    public void endForUsers(Collection<UUID> userIds) {
        for (UUID userId : userIds) {
            endForUser(userId);
        }
    }

    /**
     * End ONE user's running session, if they have one. Used when a single user
     * disconnects while the clock is running. No active session => nothing to do.
     */
    public void endForUser(UUID userId) {
        // Guard first so the common "nothing running" case is silent (no exception).
        Session active = sessionService.getActiveSession(userId);
        if (active == null) {
            return;
        }
        try {
            sessionService.endSession(userId);
        } catch (IllegalStateException ignored) {
            // Raced with another end (e.g. clock reset at the same moment) — fine.
        }
    }
}
