package com.meowdow.studyfarm.roomwhiteboard;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * The whiteboard's state — held entirely IN MEMORY (no database).
 *
 * WHY NO DATABASE? Unlike tasks or chat (which live in Postgres so they survive a
 * restart), v1 of the whiteboard is intentionally ephemeral: the board lives only
 * while this server is running and is wiped on restart. That means there's no JPA
 * entity and no repository here — just a plain Java map that we read and write
 * directly. This file is the whole "storage layer" for the feature.
 *
 * WHAT IS A BOARD? A list of "objects" (a pen stroke, a piece of text…). We never
 * inspect what's inside an object — we store it as a raw Jackson {@link JsonNode}
 * exactly as the browser sent it. Keeping the backend "dumb" like this means that
 * when we add images (or shapes) later, NONE of this code has to change: a new
 * object type is just different JSON.
 *
 * WHY THE CONCURRENT COLLECTIONS? Two different threads can touch the same room at
 * the same moment: an HTTP request thread (someone finished a stroke) and a
 * WebSocket thread. Plain HashMap/ArrayList are not safe under that and can corrupt
 * or throw. So:
 *   - ConcurrentHashMap  — safe to put/get rooms from many threads at once.
 *   - CopyOnWriteArrayList — safe to add/remove while another thread is iterating
 *                            it (e.g. GET reading the board while a POST appends).
 * (Same reasoning as the ConcurrentHashMap in RoomPresenceService.)
 */
@Service
public class WhiteboardStore {

    // roomId -> the ordered list of objects currently on that room's board.
    // Order matters: later objects draw ON TOP of earlier ones.
    private final Map<UUID, List<JsonNode>> boards = new ConcurrentHashMap<>();

    /** Every object on a room's board, in draw order. Empty list if untouched. */
    public List<JsonNode> list(UUID roomId) {
        return boards.getOrDefault(roomId, List.of());
    }

    /** Append a finished object (stroke / text) to a room's board. */
    public void add(UUID roomId, JsonNode object) {
        // computeIfAbsent: create the room's list the first time something is drawn.
        boards.computeIfAbsent(roomId, k -> new CopyOnWriteArrayList<>()).add(object);
    }

    /** Remove one object by its client-generated "id" field. No-op if not found. */
    public void remove(UUID roomId, String objectId) {
        List<JsonNode> board = boards.get(roomId);
        if (board == null) return;
        board.removeIf(obj -> {
            JsonNode id = obj.get("id");
            return id != null && objectId.equals(id.asText());
        });
    }

    /** Wipe a room's board completely (the "Clear" button). */
    public void clear(UUID roomId) {
        boards.remove(roomId);
    }
}
