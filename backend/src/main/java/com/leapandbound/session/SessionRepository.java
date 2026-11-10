package com.leapandbound.session;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    /**
     * The user's currently-running session, if any.
     * Derived query: findBy + UserId + And + EndedAtIsNull
     *   -> SELECT * FROM sessions WHERE user_id = ? AND ended_at IS NULL
     * Because a user can have at most one active session, this returns Optional.
     * We use it to enforce the "one clock at a time" rule and to read the clock.
     */
    Optional<Session> findByUserIdAndEndedAtIsNull(UUID userId);

    /**
     * Everyone currently studying on a given room's clock — i.e. the people you
     * see "studying together" in a room right now.
     *   -> ... WHERE room_id = ? AND ended_at IS NULL
     */
    List<Session> findByRoomIdAndEndedAtIsNull(UUID roomId);

    /** Full study history for a user, newest first (for a profile/timeline). */
    List<Session> findByUserIdOrderByStartedAtDesc(UUID userId);

    /** One row of the weekly leaderboard: a user and their total seconds. */
    interface StudyTotal {
        UUID getUserId();
        Long getSeconds();
    }

    /**
     * Top studiers by time in sessions that finished since {@code since}. Grouped in
     * the database (one query, served by idx_sessions_ended_at), so we never load
     * individual session rows. Limit the result size with the Pageable.
     */
    @Query("""
            SELECT s.userId AS userId, SUM(s.durationSeconds) AS seconds
            FROM Session s
            WHERE s.endedAt >= :since
            GROUP BY s.userId
            ORDER BY SUM(s.durationSeconds) DESC
            """)
    List<StudyTotal> findTopStudyTotalsSince(@Param("since") OffsetDateTime since, Pageable page);
}
