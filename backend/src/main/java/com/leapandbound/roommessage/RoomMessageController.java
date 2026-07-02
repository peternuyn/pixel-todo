package com.leapandbound.roommessage;

import com.leapandbound.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * REST endpoints for a room's shared chat. The base path
 * "/api/rooms/{roomId}/messages" makes the URL itself express the relationship:
 * messages always live UNDER a room.
 *
 * This mirrors {@link com.leapandbound.roomtask.RoomTaskController} closely.
 * The one extra idea here is REAL-TIME: after each write we both (a) return the
 * result over HTTP to the caller, and (b) push a WebSocket event to EVERYONE in
 * the room on /topic/rooms/{roomId}/chat, so all open browsers update live.
 *
 * As elsewhere in this project there's no login token: the client tells us who is
 * acting by sending a userId in the request body.
 */
@RestController
@RequestMapping("/api/rooms/{roomId}/messages")
@RequiredArgsConstructor
public class RoomMessageController {

    private final RoomMessageService roomMessageService;
    // Pushes chat changes to everyone in the room over WebSocket.
    // Destination: /topic/rooms/{roomId}/chat
    private final SimpMessagingTemplate messagingTemplate;

    // -------------------------------------------------------------------------
    // DTOs — the exact JSON shapes we accept/return. We never expose the JPA
    // entity directly, keeping the API decoupled from the database layout.
    // -------------------------------------------------------------------------

    /** Body for "send a message". The userId proves who is sending it. */
    record SendMessageRequest(
            @NotNull UUID userId,
            @NotBlank @Size(max = 2000) String content
    ) {}

    /** Body for "toggle a reaction": which user, which emoji. */
    record ReactRequest(
            @NotNull UUID userId,
            @NotBlank @Size(max = 16) String emoji
    ) {}

    /**
     * What a message looks like when we send it to the frontend.
     *
     * `reactions` is a map of emoji -> the list of user ids who reacted with it.
     * We send the user ids (not just a count) so the UI can both show the count
     * (list size) AND highlight the emojis the current viewer has chosen — without
     * a second request.
     */
    record ChatMessageResponse(
            UUID messageId,
            UUID roomId,
            UUID userId,
            String displayName,
            String avatarUrl,
            String content,
            OffsetDateTime createdAt,
            Map<String, List<UUID>> reactions,
            // true when this message was written by the Gemini AI assistant (userId is
            // then null). The frontend uses this to give AI replies their own look.
            boolean isAi
    ) {}

    /** Body for the "/ai" command: which user is asking, and their question. */
    record AskAiRequest(
            @NotNull UUID userId,
            @NotBlank @Size(max = 1000) String prompt
    ) {}

    /**
     * The WebSocket push payload. Every subscriber on /topic/rooms/{id}/chat
     * receives one of these. Discriminated by `type` (same idea as TaskEvent):
     *   - "created":  `message` is the full new message, `reactions` is null.
     *   - "reaction": `message` is null; `messageId` + `reactions` give the new
     *                 reaction state of the one message that changed.
     */
    record ChatEvent(
            String type,
            ChatMessageResponse message,
            UUID messageId,
            Map<String, List<UUID>> reactions
    ) {
        static ChatEvent created(ChatMessageResponse m) {
            return new ChatEvent("created", m, m.messageId(), null);
        }
        static ChatEvent reaction(UUID messageId, Map<String, List<UUID>> reactions) {
            return new ChatEvent("reaction", null, messageId, reactions);
        }
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /** GET /api/rooms/{roomId}/messages — the whole chat log, oldest first. */
    @GetMapping
    public List<ChatMessageResponse> getMessages(@PathVariable UUID roomId) {
        List<RoomMessage> messages = roomMessageService.listForRoom(roomId);

        // Batch-load everything the response needs in just two extra queries (one
        // for reactions, one for users) instead of two PER message.
        List<UUID> messageIds = messages.stream().map(RoomMessage::getMessageId).toList();
        // AI messages have a null userId, so filter those out before looking up senders.
        List<UUID> senderIds = messages.stream()
                .map(RoomMessage::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, Map<String, List<UUID>>> reactions = roomMessageService.reactionsByMessage(messageIds);
        Map<UUID, User> senders = roomMessageService.usersByIds(senderIds);

        return messages.stream()
                .map(m -> toResponse(m, senders, reactions.getOrDefault(m.getMessageId(), Map.of())))
                .toList();
    }

    /** POST /api/rooms/{roomId}/messages — send a message. Returns 201 Created. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse sendMessage(
            @PathVariable UUID roomId,
            @Valid @RequestBody SendMessageRequest req
    ) {
        RoomMessage saved = roomMessageService.createMessage(roomId, req.userId(), req.content());
        // A brand-new message has no reactions yet, so we pass an empty map.
        Map<UUID, User> sender = roomMessageService.usersByIds(List.of(saved.getUserId()));
        ChatMessageResponse response = toResponse(saved, sender, Map.of());

        broadcast(roomId, ChatEvent.created(response));
        return response;
    }

    /**
     * POST /api/rooms/{roomId}/messages/{messageId}/reactions — add the emoji if
     * the user hasn't used it here, or remove it if they have (a toggle). Returns
     * the message's fresh reaction map.
     */
    @PostMapping("/{messageId}/reactions")
    public Map<String, List<UUID>> react(
            @PathVariable UUID roomId,
            @PathVariable UUID messageId,
            @Valid @RequestBody ReactRequest req
    ) {
        Map<String, List<UUID>> reactions =
                roomMessageService.toggleReaction(messageId, req.userId(), req.emoji());

        broadcast(roomId, ChatEvent.reaction(messageId, reactions));
        return reactions;
    }

    /**
     * POST /api/rooms/{roomId}/messages/ai — the "/ai" command. Saves the asker's
     * question, asks Gemini, saves the reply, and broadcasts BOTH new messages to the
     * room (question first, then answer) so every open browser sees the exchange live.
     * Returns the AI's answer to the caller.
     */
    @PostMapping("/ai")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse askAi(
            @PathVariable UUID roomId,
            @Valid @RequestBody AskAiRequest req
    ) {
        RoomMessageService.AiExchange exchange =
                roomMessageService.askAi(roomId, req.userId(), req.prompt());

        // Only the human question needs a sender lookup; the AI reply supplies its own name.
        Map<UUID, User> asker = roomMessageService.usersByIds(List.of(req.userId()));
        ChatMessageResponse question = toResponse(exchange.question(), asker, Map.of());
        ChatMessageResponse answer = toResponse(exchange.answer(), Map.of(), Map.of());

        broadcast(roomId, ChatEvent.created(question)); // "Alice asked: ..."
        broadcast(roomId, ChatEvent.created(answer));   // "Gemini: ..."
        return answer;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Build the API/WebSocket shape from an entity + the looked-up sender + reactions. */
    private ChatMessageResponse toResponse(RoomMessage m, Map<UUID, User> senders,
                                           Map<String, List<UUID>> reactions) {
        boolean isAi = m.getSenderType() == SenderType.AI;

        String displayName;
        String avatarUrl;
        if (isAi) {
            // AI messages have no user row: give them a fixed name; the frontend draws
            // its own "Gemini" avatar, so we don't need an avatar URL.
            displayName = "Gemini";
            avatarUrl = null;
        } else {
            User sender = senders.get(m.getUserId());
            // Fall back gracefully if the author's account was since deleted.
            displayName = sender != null ? sender.getDisplayName() : "Unknown";
            avatarUrl = sender != null ? sender.getAvatarUrl() : null;
        }

        return new ChatMessageResponse(
                m.getMessageId(),
                m.getRoomId(),
                m.getUserId(),
                displayName,
                avatarUrl,
                m.getContent(),
                m.getCreatedAt(),
                reactions,
                isAi
        );
    }

    /** Push a chat change to every subscriber in the room. */
    private void broadcast(UUID roomId, ChatEvent event) {
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/chat", event);
    }
}
