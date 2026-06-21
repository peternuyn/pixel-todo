package com.leapandbound.badge;

import java.util.UUID;

/**
 * A Spring APPLICATION EVENT published the moment a user earns a NEW badge.
 *
 * WHY AN EVENT instead of calling the room code directly? The thing that announces a
 * badge to a room (RoomBadgeAnnouncer) needs to know who's present in which room —
 * that lives in RoomPresenceService, which ALREADY depends on BadgeService (to award
 * Party Host). If BadgeService also called into the presence/room code we'd have a
 * dependency CYCLE. Publishing a lightweight event breaks that knot: BadgeService just
 * shouts "this user earned this badge!" into the air, and any number of listeners can
 * react without BadgeService knowing they exist. This is the observer pattern, and
 * Spring wires it for us via {@code @EventListener}.
 */
public record BadgeAwardedEvent(UUID userId, BadgeType type) {
}
