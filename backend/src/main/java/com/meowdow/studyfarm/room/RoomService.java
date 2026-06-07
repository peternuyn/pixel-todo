package com.meowdow.studyfarm.room;

import com.meowdow.studyfarm.membership.BelongRoom;
import com.meowdow.studyfarm.membership.BelongRoomId;
import com.meowdow.studyfarm.membership.BelongRoomRepository;
import com.meowdow.studyfarm.tags.Tag;
import com.meowdow.studyfarm.tags.TagService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;
    // We depend on TagService (not TagRepository) so all the tag rules —
    // normalising names, deduping, "get or create" — live in one place.
    private final TagService tagService;
    // Records who belongs to which room (the belong_room join table).
    private final BelongRoomRepository belongRoomRepository;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    @Transactional
    public Room createRoom(UUID hostId, String name, String description, int capacity,
                           boolean isPrivate, String rawPassword, List<String> tagNames) {
        if (isPrivate && (rawPassword == null || rawPassword.isBlank())) {
            throw new IllegalArgumentException("Private rooms require a password");
        }

        Room room = Room.builder()
                .hostId(hostId)
                .name(name)
                .description(description)
                .capacity(capacity)
                .status(isPrivate ? RoomStatus.PRIVATE : RoomStatus.PUBLIC)
                .passwordHash(isPrivate ? passwordEncoder.encode(rawPassword) : null)
                .build();

        // For each tag name the user typed, find the existing Tag or create a new
        // one (getOrCreate), then link it to the room. This is how *users* create
        // tags: simply by naming them when they make a room. The cascade on the
        // Room.tags field means saving the room also saves these links.
        if (tagNames != null) {
            for (String tagName : tagNames) {
                if (tagName != null && !tagName.isBlank()) {
                    Tag tag = tagService.getOrCreate(tagName);
                    room.addTag(tag);
                }
            }
        }

        Room saved = roomRepository.save(room);

        // The host belongs to their own room with the 'host' role. We add the
        // membership row and count the host as the first member.
        belongRoomRepository.save(BelongRoom.of(hostId, saved.getRoomId(), "host"));
        saved.incrementMembers();

        return saved;
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    // These reads use the *WithTags queries so each room's tags are loaded in
    // the same query — otherwise turning a Room into a RoomResponse (which reads
    // room.getTags()) would fail once the DB session has closed.

    public Room getById(UUID roomId) {
        return roomRepository.findByIdWithTags(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found: " + roomId));
    }

    public List<Room> getPublicRooms() {
        return roomRepository.findByStatusWithTags(RoomStatus.PUBLIC);
    }

    // All rooms, public and private. Private rooms are shown in the listing so
    // users can discover them, but joining still requires the room password.
    public List<Room> getAllRooms() {
        return roomRepository.findAllWithTags();
    }

    public List<Room> getRoomsByHost(UUID hostId) {
        return roomRepository.findByHostIdWithTags(hostId);
    }

    // -------------------------------------------------------------------------
    // Join / Leave
    // -------------------------------------------------------------------------

    @Transactional
    public Room joinRoom(UUID roomId, UUID userId, String rawPassword) {
        Room room = getById(roomId);

        // Idempotent: if they're already in the room, don't add a duplicate
        // membership or double-count. (PK is (user_id, room_id), so a second
        // insert would fail anyway.)
        if (belongRoomRepository.existsByIdUserIdAndIdRoomId(userId, roomId)) {
            return room;
        }

        if (room.isFull()) {
            throw new IllegalStateException("Room is full");
        }

        if (room.isPrivate()) {
            if (rawPassword == null || !passwordEncoder.matches(rawPassword, room.getPasswordHash())) {
                throw new IllegalArgumentException("Incorrect room password");
            }
        }

        belongRoomRepository.save(BelongRoom.of(userId, roomId, "member"));
        room.incrementMembers();
        return room;
    }

    @Transactional
    public Room leaveRoom(UUID roomId, UUID userId) {
        Room room = getById(roomId);

        // Only decrement if they were actually a member, so leaving twice (or
        // leaving a room you never joined) can't push the counter negative.
        BelongRoomId membershipId = new BelongRoomId(userId, roomId);
        if (belongRoomRepository.existsById(membershipId)) {
            belongRoomRepository.deleteById(membershipId);
            room.decrementMembers();
        }
        return room;
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    @Transactional
    public Room updateRoom(UUID roomId, UUID requesterId, String name,
                           String description, int capacity) {
        Room room = getById(roomId);

        if (!room.getHostId().equals(requesterId)) {
            throw new IllegalArgumentException("Only the host can update this room");
        }

        room.setName(name);
        room.setDescription(description);
        room.setCapacity(capacity);
        return room;
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public void deleteRoom(UUID roomId, UUID requesterId) {
        Room room = getById(roomId);

        if (!room.getHostId().equals(requesterId)) {
            throw new IllegalArgumentException("Only the host can delete this room");
        }

        roomRepository.delete(room);
    }
}
