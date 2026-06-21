package com.leapandbound.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

/**
 * REST endpoint to query who is currently in a room.
 *
 * This is a simple snapshot query. RoomPresenceService already tracks this
 * in-memory (for the presence channel broadcasts and for the timer), so we just
 * expose it. The frontend calls this when a FarmScene mounts to get the CURRENT
 * list of live users, then subscribes to the presence channel for join/leave
 * deltas.
 */
@RestController
@RequestMapping("/api/rooms/{roomId}/presence")
@RequiredArgsConstructor
public class RoomPresenceController {

    private final RoomPresenceService presenceService;

    /**
     * GET /api/rooms/{roomId}/presence
     *
     * Returns the set of user IDs currently present (subscribed) in the room.
     * Empty set if nobody is in the room or the room never had anyone join.
     */
    @GetMapping
    public Set<UUID> presentUsers(@PathVariable UUID roomId) {
        return presenceService.presentUsers(roomId);
    }
}
