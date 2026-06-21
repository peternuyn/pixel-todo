package com.meowdow.studyfarm.realtime;

import com.meowdow.studyfarm.badge.BadgeAwardedEvent;
import com.meowdow.studyfarm.user.User;
import com.meowdow.studyfarm.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Listens for {@link BadgeAwardedEvent} and, if the user who earned the badge is
 * currently studying in a room, announces it to that room so everyone sees the win.
 *
 * WHY HERE (and not inside BadgeService)? This needs RoomPresenceService to know who
 * is in which room, and RoomPresenceService already depends on BadgeService — so
 * doing it the other way would create a dependency cycle. By REACTING to an event we
 * stay decoupled: BadgeService doesn't know this class exists. Spring delivers the
 * event to every {@code @EventListener} method that accepts its type.
 *
 * It deliberately does nothing when the user isn't in a room (e.g. a badge earned on
 * a personal clock, or backfilled while viewing their profile), so there's no noise.
 */
@Component
@RequiredArgsConstructor
public class RoomBadgeAnnouncer {

    private final RoomPresenceService presenceService;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onBadgeAwarded(BadgeAwardedEvent event) {
        var rooms = presenceService.roomsOf(event.userId());
        if (rooms.isEmpty()) {
            return; // not studying in any room right now — nothing to announce
        }

        // Resolve a friendly name for the banner; skip gracefully if the user vanished.
        String displayName = userRepository.findById(event.userId())
                .map(User::getDisplayName)
                .orElse("Someone");

        RoomBadgeCelebration payload = new RoomBadgeCelebration(
                displayName,
                event.type().getEmoji(),
                event.type().getLabel(),
                event.type().name());

        for (UUID roomId : rooms) {
            messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/badges", payload);
        }
    }
}
