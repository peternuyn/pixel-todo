package com.meowdow.studyfarm.realtime;

import com.meowdow.studyfarm.badge.BadgeService;
import com.meowdow.studyfarm.badge.BadgeType;
import com.meowdow.studyfarm.room.RoomRepository;
import com.meowdow.studyfarm.roomtimer.RoomTimerRepository;
import com.meowdow.studyfarm.roomtimer.RoomTimerState;
import com.meowdow.studyfarm.roomtimer.SessionBridge;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tracks who is currently "in" each room over WebSocket, and announces joins and
 * leaves on /topic/rooms/{roomId}/presence.
 *
 * HOW DOES IT KNOW WHEN SOMEONE JOINS/LEAVES? Spring fires application EVENTS for
 * the STOMP lifecycle. We listen with @EventListener:
 *   - SessionSubscribeEvent  -> a client subscribed to a destination. When that
 *                               destination is a room's channel, we treat it as
 *                               "this user is now present in the room".
 *   - SessionDisconnectEvent -> the WebSocket connection dropped (tab closed,
 *                               navigated away, network died). We treat it as a
 *                               leave.
 *
 * WHY TRACK BY STOMP SESSION ID? Each open WebSocket connection has a unique STOMP
 * session id. Disconnect events only tell us that id — not who it was — so we keep
 * a map from session id to user id to recover it on disconnect. Storing it per
 * session id (not just per user) also means opening a second tab and closing it
 * doesn't wrongly mark the user as gone while the first tab is still open.
 *
 * This one service powers THREE things with no extra plumbing: the presence
 * broadcasts (FarmScene pop-ups later), the occupancy count, and the timer's need
 * to know which users to credit study time to (presentUsers()).
 */
@Service
@RequiredArgsConstructor
public class RoomPresenceService {

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomTimerRepository roomTimerRepository;
    private final SessionBridge sessionBridge;
    // To award the room's host the Party Host badge once 5 people study together.
    private final BadgeService badgeService;
    private final RoomRepository roomRepository;

    // roomId -> (stompSessionId -> userId). ConcurrentHashMap because WebSocket
    // events can arrive on different threads at the same time.
    private final Map<UUID, Map<String, UUID>> presence = new ConcurrentHashMap<>();

    // Pulls the {roomId} out of a destination like "/topic/rooms/<uuid>/timer".
    private static final Pattern ROOM_DESTINATION =
            Pattern.compile("/topic/rooms/([0-9a-fA-F-]{36})(/|$)");

    /** A client subscribed to something — record presence if it's a room channel. */
    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        String destination = accessor.getDestination();
        if (destination == null) return;
        Matcher matcher = ROOM_DESTINATION.matcher(destination);
        if (!matcher.find()) return;            // not a room channel — ignore

        UUID roomId = parseUuid(matcher.group(1));
        // The client tells us who it is via a STOMP header on the SUBSCRIBE frame.
        // (No auth system exists — same "client passes userId" convention as REST.)
        UUID userId = parseUuid(accessor.getFirstNativeHeader("userId"));
        String sessionId = accessor.getSessionId();
        if (roomId == null || userId == null || sessionId == null) return;

        Map<String, UUID> room = presence.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>());
        boolean wasPresent = room.containsValue(userId);  // already here on another tab/channel?
        room.put(sessionId, userId);

        // Only announce + start crediting on a user's FIRST appearance in the room,
        // so subscribing to several channels (timer, presence, chat) on one
        // connection doesn't fire repeated "joined" events.
        if (!wasPresent) {
            int present = distinctUserCount(room);
            messagingTemplate.convertAndSend(
                    "/topic/rooms/" + roomId + "/presence",
                    PresenceEvent.join(roomId, userId, present));

            // Once 5 people are studying together, the room's HOST earns Party Host.
            if (present >= 5) {
                roomRepository.findById(roomId).ifPresent(
                        r -> badgeService.award(r.getHostId(), BadgeType.PARTY_HOST));
            }

            // If the shared clock is already RUNNING, this late arrival should start
            // earning study time from now.
            roomTimerRepository.findById(roomId).ifPresent(timer -> {
                if (timer.getState() == RoomTimerState.RUNNING) {
                    sessionBridge.startForUsers(roomId, List.of(userId));
                }
            });
        }
    }

    /** A WebSocket connection dropped — remove it and announce a leave if needed. */
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        if (sessionId == null) return;

        // We don't know which room this connection was in, so check each one.
        for (Map.Entry<UUID, Map<String, UUID>> entry : presence.entrySet()) {
            UUID roomId = entry.getKey();
            Map<String, UUID> room = entry.getValue();

            UUID userId = room.remove(sessionId);
            if (userId == null) continue;                 // wasn't in this room

            // Only a "leave" if the user has NO other live connection in the room.
            if (!room.containsValue(userId)) {
                messagingTemplate.convertAndSend(
                        "/topic/rooms/" + roomId + "/presence",
                        PresenceEvent.leave(roomId, userId, distinctUserCount(room)));
                // Stop their study clock so the time they were present is credited.
                sessionBridge.endForUser(userId);
            }
        }
    }

    /** The distinct users currently present in a room (used by the timer service). */
    public Set<UUID> presentUsers(UUID roomId) {
        Map<String, UUID> room = presence.get(roomId);
        if (room == null) return Set.of();
        return new HashSet<>(room.values());
    }

    /**
     * The rooms a user is currently present in (usually one). Used by the badge
     * announcer to celebrate a freshly-earned badge in the room(s) they're studying
     * in — and to stay silent when they earned it outside any room.
     */
    public Set<UUID> roomsOf(UUID userId) {
        Set<UUID> rooms = new HashSet<>();
        for (Map.Entry<UUID, Map<String, UUID>> entry : presence.entrySet()) {
            if (entry.getValue().containsValue(userId)) {
                rooms.add(entry.getKey());
            }
        }
        return rooms;
    }

    private int distinctUserCount(Map<String, UUID> room) {
        return new HashSet<>(room.values()).size();
    }

    private static UUID parseUuid(String raw) {
        if (raw == null) return null;
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
