package com.leapandbound.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
