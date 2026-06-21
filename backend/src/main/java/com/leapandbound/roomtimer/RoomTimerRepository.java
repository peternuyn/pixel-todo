package com.leapandbound.roomtimer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Data-access for room timers. Extending JpaRepository gives us save / findById /
 * delete / etc. for free — Spring Data generates the implementation at runtime.
 *
 * The id type is UUID because the timer's primary key IS the room's id (see the
 * @Id on RoomTimer). So findById(roomId) returns that room's single clock.
 */
@Repository
public interface RoomTimerRepository extends JpaRepository<RoomTimer, UUID> {
}
