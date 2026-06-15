package com.meowdow.studyfarm.roomtask;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for RoomTask. By extending JpaRepository we get the
 * standard CRUD methods for free — save(), findById(), delete(), etc. — without
 * writing any SQL.
 *
 * JpaRepository<RoomTask, UUID> means: this manages RoomTask rows whose primary
 * key type is UUID (so findById/deleteById take a UUID).
 *
 * RoomTask has NO lazy collections (unlike Room, which has its tags Set), so we
 * don't need any "JOIN FETCH" query variants here — a plain derived query is
 * enough.
 */
@Repository
public interface RoomTaskRepository extends JpaRepository<RoomTask, UUID> {

    /**
     * All tasks for one room, oldest first.
     *
     * This is a "derived query": Spring reads the METHOD NAME and generates the
     * SQL for us. "findByRoomId" -> WHERE room_id = ?, and
     * "OrderByCreatedAtAsc" -> ORDER BY created_at ASC. Oldest-first gives the
     * list a stable order so items don't jump around as they're ticked.
     */
    List<RoomTask> findByRoomIdOrderByCreatedAtAsc(UUID roomId);
}
