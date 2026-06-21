package com.meowdow.studyfarm.badge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Note the id type: JpaRepository&lt;UserBadge, UserBadgeId&gt;. The second type param
 * is the COMPOSITE key class, so save/findById/existsById all take a UserBadgeId —
 * exactly like BelongRoomRepository.
 *
 * In the derived method names, "Id" refers to the @EmbeddedId field, so "IdUserId"
 * means "navigate into the id, then its userId property".
 */
@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, UserBadgeId> {

    /** All badges a user has earned (newest-first ordering is applied in the service). */
    List<UserBadge> findByIdUserId(UUID userId);

    /** Has this user already earned this badge? Used to make awarding idempotent. */
    boolean existsByIdUserIdAndIdBadgeKey(UUID userId, String badgeKey);
}
