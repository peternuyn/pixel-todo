package com.leapandbound.roommessage;

import com.leapandbound.membership.BelongRoomRepository;
import com.leapandbound.room.RoomService;
import com.leapandbound.user.User;
import com.leapandbound.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The "business logic" layer for room chat. Controllers talk to this service; the
 * service talks to repositories. Keeping the rules here means they apply no matter
 * who calls them — exactly like {@link com.leapandbound.roomtask.RoomTaskService}.
 *
 * Design decisions:
 *   - Sending a message and reacting both require you to be a MEMBER of the room
 *     (you can't chat in a room you haven't joined). We reuse the same membership
 *     check the to-do list uses.
 *   - A reaction TOGGLES: clicking an emoji you've already added removes it; the
 *     composite primary key (message, user, emoji) makes "do I already have this
 *     reaction?" a one-line existsById check.
 */
@Service
@RequiredArgsConstructor
public class RoomMessageService {

    private final RoomMessageRepository roomMessageRepository;
    private final MessageReactionRepository messageReactionRepository;
    // Reused to confirm a room exists (throws a clear "Room not found" if not).
    private final RoomService roomService;
    // Reused to verify the user actually belongs to the room before they post.
    private final BelongRoomRepository belongRoomRepository;
    // Used to turn the sender's UUID into a display name / avatar for the UI.
    private final UserRepository userRepository;

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /** Every message in a room, oldest first. */
    public List<RoomMessage> listForRoom(UUID roomId) {
        return roomMessageRepository.findByRoomIdOrderByCreatedAtAsc(roomId);
    }

    /** Load one message or fail loudly (used when building a created/reaction event). */
    public RoomMessage getMessage(UUID messageId) {
        return roomMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Post a new message to a room's chat.
     *
     * @Transactional means the whole method runs in ONE database transaction: if
     * anything throws partway through, every change rolls back, so we never leave
     * half-written data.
     */
    @Transactional
    public RoomMessage createMessage(UUID roomId, UUID userId, String content) {
        roomService.getById(roomId);            // throws if the room id is bogus
        requireMember(roomId, userId);          // you must be in the room to chat

        RoomMessage message = RoomMessage.builder()
                .roomId(roomId)
                .userId(userId)
                .content(content)
                .build();

        return roomMessageRepository.save(message);
    }

    // -------------------------------------------------------------------------
    // React (toggle)
    // -------------------------------------------------------------------------

    /**
     * Add an emoji reaction if the user hasn't used it on this message yet, or
     * remove it if they have. Returns the message's FRESH reaction map so the
     * caller can broadcast the up-to-date state.
     */
    @Transactional
    public Map<String, List<UUID>> toggleReaction(UUID messageId, UUID userId, String emoji) {
        RoomMessage message = getMessage(messageId);
        requireMember(message.getRoomId(), userId);

        MessageReactionId id = new MessageReactionId(messageId, userId, emoji);
        if (messageReactionRepository.existsById(id)) {
            messageReactionRepository.deleteById(id);   // un-react
        } else {
            messageReactionRepository.save(MessageReaction.of(messageId, userId, emoji));
        }

        return reactionsForMessage(messageId);
    }

    // -------------------------------------------------------------------------
    // Helpers the controller uses to assemble responses
    // -------------------------------------------------------------------------

    /** One message's reactions as emoji -> list of user ids who reacted. */
    public Map<String, List<UUID>> reactionsForMessage(UUID messageId) {
        return groupReactions(messageReactionRepository.findByIdMessageId(messageId));
    }

    /**
     * Reactions for a whole batch of messages in ONE query, keyed by message id.
     * Building the chat list calls this once instead of once-per-message (avoiding
     * the N+1 query problem). Messages with no reactions simply won't appear in the
     * map; the controller treats a missing entry as "no reactions".
     */
    public Map<UUID, Map<String, List<UUID>>> reactionsByMessage(Collection<UUID> messageIds) {
        if (messageIds.isEmpty()) return Map.of();
        return messageReactionRepository.findByIdMessageIdIn(messageIds).stream()
                .collect(Collectors.groupingBy(
                        r -> r.getId().getMessageId(),
                        Collectors.collectingAndThen(Collectors.toList(), this::groupReactions)));
    }

    /** Look up many users at once, keyed by id — used to attach sender names. */
    public Map<UUID, User> usersByIds(Collection<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /** Turn a flat list of reaction rows into emoji -> [userId, ...]. */
    private Map<String, List<UUID>> groupReactions(List<MessageReaction> reactions) {
        return reactions.stream().collect(Collectors.groupingBy(
                r -> r.getId().getEmoji(),
                LinkedHashMap::new,
                Collectors.mapping(r -> r.getId().getUserId(), Collectors.toList())));
    }

    /** Guard: the user must belong to the room. Same rule the to-do list uses. */
    private void requireMember(UUID roomId, UUID userId) {
        if (!belongRoomRepository.existsByIdUserIdAndIdRoomId(userId, roomId)) {
            throw new IllegalArgumentException("You must be a member of the room to chat");
        }
    }
}
