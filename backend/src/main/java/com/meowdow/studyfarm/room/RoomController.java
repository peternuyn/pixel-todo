package com.meowdow.studyfarm.room;

import com.meowdow.studyfarm.tags.Tag;
import com.meowdow.studyfarm.user.User;
import com.meowdow.studyfarm.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final UserRepository userRepository;

    // -------------------------------------------------------------------------
    // DTOs
    // -------------------------------------------------------------------------

    record CreateRoomRequest(
            @NotNull UUID hostId,
            @NotBlank @Size(max = 64) String name,
            String description,
            @Positive int capacity,
            boolean isPrivate,
            String password,
            List<String> tags
    ) {}

    record JoinRoomRequest(
            @NotNull UUID userId,
            String password
    ) {}

    record LeaveRoomRequest(
            @NotNull UUID userId
    ) {}

    record UpdateRoomRequest(
            @NotBlank @Size(max = 64) String name,
            String description,
            @Positive int capacity,
            @NotNull UUID requesterId
    ) {}

    record DeleteRoomRequest(
            @NotNull UUID requesterId
    ) {}

    record RoomResponse(
            UUID roomId,
            UUID hostId,
            String hostName,
            String name,
            String description,
            int capacity,
            int totalMembers,
            String status,
            boolean isPrivate,
            boolean isFull,
            List<String> tags,
            OffsetDateTime createdAt
    ) {
        static RoomResponse from(Room room, String hostName) {
            return new RoomResponse(
                    room.getRoomId(),
                    room.getHostId(),
                    hostName,
                    room.getName(),
                    room.getDescription(),
                    room.getCapacity(),
                    room.getTotalMembers(),
                    room.getStatus().name().toLowerCase(),
                    room.isPrivate(),
                    room.isFull(),
                    room.getTags().stream().map(Tag::getName).sorted().toList(),
                    room.getCreatedAt()
            );
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    // Turns a Room into the JSON shape we send back, looking up the host's
    // display name along the way. We don't store the name on the Room (only the
    // host's UUID), so we ask the user table for it here. If the host can't be
    // found for some reason, we fall back to a friendly placeholder instead of
    // failing the whole request.
    private RoomResponse toResponse(Room room) {
        String hostName = userRepository.findById(room.getHostId())
                .map(User::getDisplayName)
                .orElse("Anonymous Farmer");
        return RoomResponse.from(room, hostName);
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomResponse createRoom(@Valid @RequestBody CreateRoomRequest req) {
        Room room = roomService.createRoom(
                req.hostId(), req.name(), req.description(),
                req.capacity(), req.isPrivate(), req.password(), req.tags()
        );
        return toResponse(room);
    }

    @GetMapping
    public List<RoomResponse> getRooms() {
        return roomService.getAllRooms().stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/{roomId}")
    public RoomResponse getRoom(@PathVariable UUID roomId) {
        return toResponse(roomService.getById(roomId));
    }

    @GetMapping("/host/{hostId}")
    public List<RoomResponse> getRoomsByHost(@PathVariable UUID hostId) {
        return roomService.getRoomsByHost(hostId).stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/{roomId}/join")
    public RoomResponse joinRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody JoinRoomRequest req
    ) {
        return toResponse(roomService.joinRoom(roomId, req.userId(), req.password()));
    }

    @PostMapping("/{roomId}/leave")
    public RoomResponse leaveRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody LeaveRoomRequest req
    ) {
        return toResponse(roomService.leaveRoom(roomId, req.userId()));
    }

    @PatchMapping("/{roomId}")
    public RoomResponse updateRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateRoomRequest req
    ) {
        Room room = roomService.updateRoom(
                roomId, req.requesterId(), req.name(), req.description(), req.capacity()
        );
        return toResponse(room);
    }

    @DeleteMapping("/{roomId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody DeleteRoomRequest req
    ) {
        roomService.deleteRoom(roomId, req.requesterId());
    }
}
