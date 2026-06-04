package com.meowdow.studyfarm.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByStatus(RoomStatus status);

    List<Room> findByHostId(UUID hostId);

    List<Room> findByStatusOrderByCreatedAtDesc(RoomStatus status);
}
