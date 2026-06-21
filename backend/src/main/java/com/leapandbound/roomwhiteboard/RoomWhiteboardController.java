package com.leapandbound.roomwhiteboard;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * This controller handles realtime strokes and text. REST endpoints for a room's collaborative 
 * whiteboard — the DURABLE half of the feature (finished strokes / text that everyone should see 
 * including people who join late).
 *
 * This is the SAME shape as RoomTaskController: a command comes in over REST, we
 * change the stored state, and then we BROADCAST the change over WebSocket so every
 * client in the room updates. The only difference is that "stored state" here is the
 * in-memory {@link WhiteboardStore} instead of a database repository.
 *
 * WHY REST FOR THIS (and not the WebSocket)? Finished objects are rare — one per
 * mouse-up. REST gives us tidy HTTP status codes/errors and matches every other
 * feature in the app. The HIGH-FREQUENCY stuff (live cursors, the stroke being
 * dragged right now) does NOT come through here — that rides the WebSocket directly
 * in WhiteboardSocketController, because doing an HTTP call per mouse-move would be
 * far too slow.
 */
@RestController
@RequestMapping("/api/rooms/{roomId}/whiteboard")
@RequiredArgsConstructor
public class RoomWhiteboardController {

    private final WhiteboardStore store;
    // Pushes board changes to everyone subscribed to /topic/rooms/{roomId}/whiteboard.
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * The WebSocket push payload. Every subscriber receives one of these after a
     * change. Discriminated union on `type`, exactly like TaskEvent:
     *   - added   → `object` is the new object, `objectId` mirrors its id
     *   - removed → `object` is null,           `objectId` is the removed id
     *   - cleared → both null (the whole board was wiped)
     */
    record WhiteboardEvent(String type, JsonNode object, String objectId) {
        static WhiteboardEvent added(JsonNode object) {
            return new WhiteboardEvent("added", object, object.get("id").asText());
        }
        static WhiteboardEvent removed(String objectId) {
            return new WhiteboardEvent("removed", null, objectId);
        }
        static WhiteboardEvent cleared() {
            return new WhiteboardEvent("cleared", null, null);
        }
    }

    /** GET — the whole board, in draw order (initial load + late joiners). */
    @GetMapping
    public List<JsonNode> getBoard(@PathVariable UUID roomId) {
        return store.list(roomId);
    }

    /**
     * POST — add a finished object. The browser sends the object's full JSON
     * (with a client-generated `id`); we store and re-broadcast it verbatim.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JsonNode addObject(@PathVariable UUID roomId, @RequestBody JsonNode object) {
        store.add(roomId, object);
        broadcast(roomId, WhiteboardEvent.added(object));
        return object;
    }

    /** DELETE /{objectId} — remove a single object. 204 No Content on success. */
    @DeleteMapping("/{objectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeObject(@PathVariable UUID roomId, @PathVariable String objectId) {
        store.remove(roomId, objectId);
        broadcast(roomId, WhiteboardEvent.removed(objectId));
    }

    /** DELETE — wipe the whole board (the "Clear" button). 204 No Content. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearBoard(@PathVariable UUID roomId) {
        store.clear(roomId);
        broadcast(roomId, WhiteboardEvent.cleared());
    }

    private void broadcast(UUID roomId, WhiteboardEvent event) {
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/whiteboard", event);
    }
}
