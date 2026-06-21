package com.leapandbound.roommessage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for RoomMessage. Extending JpaRepository gives us the
 * standard CRUD methods (save, findById, delete…) for free, with no SQL written
 * by hand. The <RoomMessage, UUID> says: this manages RoomMessage rows whose
 * primary key is a UUID.
 */
@Repository
public interface RoomMessageRepository extends JpaRepository<RoomMessage, UUID> {

    /**
     * All messages in a room, oldest first — the natural reading order for a chat
     * log. This is a "derived query": Spring turns the method NAME into SQL.
     * "findByRoomId" -> WHERE room_id = ?, "OrderByCreatedAtAsc" -> ORDER BY
     * created_at ASC.
     */
    List<RoomMessage> findByRoomIdOrderByCreatedAtAsc(UUID roomId);
}
