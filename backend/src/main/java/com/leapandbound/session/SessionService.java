package com.leapandbound.session;

import com.leapandbound.badge.BadgeService;
import com.leapandbound.room.RoomService;
import com.leapandbound.user.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    // We reuse the existing services so their rules (user exists, room exists,
    // study-time accounting) stay in one place instead of being duplicated here.
    private final UserService userService;
    private final RoomService roomService;
    // Awards badges when a session ends (focus-duration badges + re-checks stat badges).
    private final BadgeService badgeService;

    // -------------------------------------------------------------------------
    // Start
    // -------------------------------------------------------------------------

    /**
     * Starts a study clock for a user.
     *
     * @param userId who is studying
     * @param roomId the room whose shared clock they're joining, or null for a
     *               personal clock
     *
     * Rules enforced here:
     *  1. ONE CLOCK PER USER — if the user already has a running session, we
     *     reject the start. This is what stops two clocks ticking at once,
     *     whether the existing one is personal or a room clock.
     *  2. The user (and room, if given) must actually exist.
     *
     * @Transactional: the existence checks + the insert all run in one DB
     * transaction, so either everything succeeds or nothing is written.
     */
    @Transactional
    public Session startSession(UUID userId, UUID roomId) {
        // Rule 1: no second clock.
        sessionRepository.findByUserIdAndEndedAtIsNull(userId).ifPresent(active -> {
            throw new IllegalStateException(
                    "You already have a study session running. Stop it before starting another.");
        });

        // Rule 2: validate references. getById throws if not found.
        userService.getById(userId);
        if (roomId != null) {
            roomService.getById(roomId);
        }

        Session session = Session.builder()
                .userId(userId)
                .roomId(roomId) // null => personal clock
                .build();

        return sessionRepository.save(session);
    }

    // -------------------------------------------------------------------------
    // End
    // -------------------------------------------------------------------------

    /**
     * Stops the user's running clock, computes how long it lasted, and adds that
     * time to the user's study total.
     *
     * Works the same for personal and room sessions — both feed into the user's
     * study time via UserService.recordStudySession (which also bumps their
     * sessions_done count and last_studied_at).
     */
    @Transactional
    public Session endSession(UUID userId) {
        Session session = sessionRepository.findByUserIdAndEndedAtIsNull(userId)
                .orElseThrow(() -> new IllegalStateException("No active study session to stop"));

        OffsetDateTime now = OffsetDateTime.now();
        // Duration.between gives the elapsed time; .getSeconds() as whole seconds.
        int elapsedSeconds = (int) Duration.between(session.getStartedAt(), now).getSeconds();
        if (elapsedSeconds < 0) {
            elapsedSeconds = 0; // guard against clock skew
        }

        session.setEndedAt(now);
        session.setDurationSeconds(elapsedSeconds);

        // Credit the time to the user (adds to study time + sessions_done).
        userService.recordStudySession(userId, elapsedSeconds);

        // Now that the user's totals are updated, check for newly earned badges.
        // awardSessionDuration handles the single-session focus badges (which can't
        // be recovered from the totals later); evaluateForUser re-checks the
        // cumulative-time / session-count / first-session badges. This one spot covers
        // BOTH personal and room sessions, because room-clock completion ends each
        // user's session through SessionBridge -> endSession.
        badgeService.awardSessionDuration(userId, elapsedSeconds);
        badgeService.evaluateForUser(userId);

        return session; // managed entity; changes flush at commit
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /** The user's running clock, or null if they aren't studying right now. */
    public Session getActiveSession(UUID userId) {
        return sessionRepository.findByUserIdAndEndedAtIsNull(userId).orElse(null);
    }

    /** Everyone currently studying on this room's clock (the "together" view). */
    public List<Session> getActiveRoomSessions(UUID roomId) {
        return sessionRepository.findByRoomIdAndEndedAtIsNull(roomId);
    }

    /** A user's session history, newest first. */
    public List<Session> getUserHistory(UUID userId) {
        return sessionRepository.findByUserIdOrderByStartedAtDesc(userId);
    }
}
