package com.meowdow.studyfarm.roomwhiteboard;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.UUID;

/**
 * This controller handles live cursors. This is the first place in the whole project that receives a
 * message straight over the WebSocket (everything else, like the timer and chat,
 * sends commands over REST).
 *
 * THE TWO STOMP PREFIXES (see WebSocketConfig for the long version):
 *   - "/app"   = messages coming IN from a browser to a @MessageMapping handler
 *                (like this one). The browser publishes to
 *                "/app/rooms/{roomId}/whiteboard-live".
 *   - "/topic" = messages going OUT to everyone subscribed. We forward to
 *                "/topic/rooms/{roomId}/whiteboard-live".
 *
 * WHY A SEPARATE PATH FROM REST? A cursor moves ~20–60 times a second. Doing an
 * HTTP request + (in other features) a database write for each of those would be
 * hopeless. So these messages take the fast lane: they arrive on the already-open
 * socket, and we IMMEDIATELY re-broadcast them to the room. Nothing is stored —
 * there's no WhiteboardStore call here. If you miss a cursor frame, the next one is
 * 30ms away, so it simply doesn't matter.
 *
 * @MessageMapping vs @RestController: @MessageMapping methods are wired to STOMP
 * destinations, not URLs. {roomId} in the destination is pulled out with
 * @DestinationVariable (the messaging-world cousin of @PathVariable), and the
 * message body arrives as @Payload. We keep it as a raw JsonNode and never look
 * inside — the server is a dumb relay; only the browsers know what a "cursor" or a
 * "draw" frame means.
 */
@Controller
@RequiredArgsConstructor
public class WhiteboardSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/rooms/{roomId}/whiteboard-live")
    public void relayLive(@DestinationVariable UUID roomId, @Payload JsonNode payload) {
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/whiteboard-live", payload);
    }
}
