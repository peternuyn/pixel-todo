package com.meowdow.studyfarm.room;

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

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    public Room createRoom(UUID hostId, String name, String description, int capacity,
                           boolean isPrivate, String rawPassword) {
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

        return roomRepository.save(room);
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    public Room getById(UUID roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found: " + roomId));
    }

    public List<Room> getPublicRooms() {
        return roomRepository.findByStatusOrderByCreatedAtDesc(RoomStatus.PUBLIC);
    }

    public List<Room> getRoomsByHost(UUID hostId) {
        return roomRepository.findByHostId(hostId);
    }

    // -------------------------------------------------------------------------
    // Join / Leave
    // -------------------------------------------------------------------------

    @Transactional
    public Room joinRoom(UUID roomId, String rawPassword) {
        Room room = getById(roomId);

        if (room.isFull()) {
            throw new IllegalStateException("Room is full");
        }

        if (room.isPrivate()) {
            if (rawPassword == null || !passwordEncoder.matches(rawPassword, room.getPasswordHash())) {
                throw new IllegalArgumentException("Incorrect room password");
            }
        }

        room.incrementMembers();
        return room;
    }

    @Transactional
    public Room leaveRoom(UUID roomId) {
        Room room = getById(roomId);
        room.decrementMembers();
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
