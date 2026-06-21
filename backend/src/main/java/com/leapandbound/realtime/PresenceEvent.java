package com.leapandbound.realtime;

import java.util.UUID;

/**
 * A small message broadcast to /topic/rooms/{roomId}/presence whenever someone
 * joins or leaves a room's live session.
 *
 * This is the seam that future features hang off WITHOUT changing any of the
 * timer/transport code:
 *   - FarmScene will subscribe to this channel and pop up a character sprite when
 *     type == "join".
 *   - A "who's online" list (chat sidebar) can use presentCount / the join+leave
 *     stream directly.
 *
 * type is "join" or "leave"; presentCount is how many DISTINCT users are in the
 * room right after this event (handy for an occupancy badge).
 */
public record PresenceEvent(
        String type,        // "join" | "leave"
        UUID roomId,
        UUID userId,
        int presentCount
) {
    public static PresenceEvent join(UUID roomId, UUID userId, int presentCount) {
        return new PresenceEvent("join", roomId, userId, presentCount);
    }

    public static PresenceEvent leave(UUID roomId, UUID userId, int presentCount) {
        return new PresenceEvent("leave", roomId, userId, presentCount);
    }
}
