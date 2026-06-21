package com.meowdow.studyfarm.realtime;

/**
 * The WebSocket payload broadcast to everyone in a room when one of its studiers
 * earns a badge, on /topic/rooms/{roomId}/badges. The frontend turns this into a
 * little "🎉 benten earned Pomodoro Pal!" banner so the whole room can celebrate.
 */
public record RoomBadgeCelebration(
        String displayName,
        String emoji,
        String label,
        String badgeKey
) {
}
