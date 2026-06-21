package com.meowdow.studyfarm.membership;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Note the id type: JpaRepository<BelongRoom, BelongRoomId>. The second type
 * param is the COMPOSITE key class, so save/findById/deleteById all take a
 * BelongRoomId.
 *
 * In the derived method names below, "Id" refers to the @EmbeddedId field, so
 * "IdUserId" means "navigate into the id, then its userId property":
 *   findByIdRoomId  -> ... WHERE user_id-or-room_id matches the embedded field
 */
@Repository
public interface BelongRoomRepository extends JpaRepository<BelongRoom, BelongRoomId> {

    /** All memberships for a room — i.e. everyone who belongs to it. */
    List<BelongRoom> findByIdRoomId(UUID roomId);

    /** All rooms a user belongs to. */
    List<BelongRoom> findByIdUserId(UUID userId);

    /** Quick membership check without loading the row. */
    boolean existsByIdUserIdAndIdRoomId(UUID userId, UUID roomId);

    /** How many rooms this user belongs to in total (one row per room). */
    long countByIdUserId(UUID userId);

    /** How many rooms this user belongs to with a given role ("host" / "member"). */
    long countByIdUserIdAndRole(UUID userId, String role);
}
