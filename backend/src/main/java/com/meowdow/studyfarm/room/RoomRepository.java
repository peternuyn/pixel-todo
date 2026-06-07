package com.meowdow.studyfarm.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByStatus(RoomStatus status);

    List<Room> findByHostId(UUID hostId);

    List<Room> findByStatusOrderByCreatedAtDesc(RoomStatus status);

    // --- Queries that also load each room's tags in the SAME query ---------
    // The room.tags collection is LAZY: by default it's only loaded when first
    // accessed, which (a) fails if accessed after the DB session closes, and
    // (b) causes one extra query PER room (the "N+1 problem"). "JOIN FETCH"
    // tells JPA to pull the rooms and their tags together in one go.
    // LEFT JOIN FETCH keeps rooms that have zero tags. DISTINCT removes the
    // duplicate room rows that a join naturally produces.

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.tags " +
           "WHERE r.status = :status ORDER BY r.createdAt DESC")
    List<Room> findByStatusWithTags(@Param("status") RoomStatus status);

    // Every room (public AND private), newest first, with tags loaded.
    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.tags ORDER BY r.createdAt DESC")
    List<Room> findAllWithTags();

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.tags WHERE r.hostId = :hostId")
    List<Room> findByHostIdWithTags(@Param("hostId") UUID hostId);

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.tags WHERE r.roomId = :roomId")
    Optional<Room> findByIdWithTags(@Param("roomId") UUID roomId);
}
