package com.meowdow.studyfarm.room;

import com.meowdow.studyfarm.tags.Tag;
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
        static RoomResponse from(Room room) {
            return new RoomResponse(
                    room.getRoomId(),
                    room.getHostId(),
                    room.getName(),
                    room.getDescription(),
                    room.getCapacity(),
                    room.getTotalMembers(),
                    room.getStatus().name().toLowerCase(),
                    room.isPrivate(),
                    room.isFull(),
                    // Convert the Set<Tag> into a simple list of tag-name strings,
                    // which is all the frontend needs to display.
                    room.getTags().stream().map(Tag::getName).sorted().toList(),
                    room.getCreatedAt()
            );
        }
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
        return RoomResponse.from(room);
    }

    @GetMapping
    public List<RoomResponse> getRooms() {
        return roomService.getAllRooms().stream()
                .map(RoomResponse::from)
                .toList();
    }

    @GetMapping("/{roomId}")
    public RoomResponse getRoom(@PathVariable UUID roomId) {
        return RoomResponse.from(roomService.getById(roomId));
    }

    @GetMapping("/host/{hostId}")
    public List<RoomResponse> getRoomsByHost(@PathVariable UUID hostId) {
        return roomService.getRoomsByHost(hostId).stream()
                .map(RoomResponse::from)
                .toList();
    }

    @PostMapping("/{roomId}/join")
    public RoomResponse joinRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody JoinRoomRequest req
    ) {
        return RoomResponse.from(roomService.joinRoom(roomId, req.userId(), req.password()));
    }

    @PostMapping("/{roomId}/leave")
    public RoomResponse leaveRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody LeaveRoomRequest req
    ) {
        return RoomResponse.from(roomService.leaveRoom(roomId, req.userId()));
    }

    @PatchMapping("/{roomId}")
    public RoomResponse updateRoom(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateRoomRequest req
    ) {
        Room room = roomService.updateRoom(
                roomId, req.requesterId(), req.name(), req.description(), req.capacity()
        );
        return RoomResponse.from(room);
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
