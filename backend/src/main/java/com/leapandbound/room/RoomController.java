package com.leapandbound.room;

import com.leapandbound.realtime.RoomPresenceService;
import com.leapandbound.tags.Tag;
import com.leapandbound.user.User;
import com.leapandbound.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
    // In-memory tracker of who is CURRENTLY connected to each room over WebSocket.
    // This is the live "people in the room right now" count — distinct from
    // total_members (who ever joined) and total_joins (all-time joins).
    private final RoomPresenceService presenceService;

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

    // The body for PATCH /{roomId}/theme. requesterId lets the service confirm the
    // caller is actually a member of the room before reskinning it.
    record UpdateThemeRequest(
            @NotNull UUID requesterId,
            @Min(1) @Max(4) int themeId
    ) {}

    record RoomResponse(
            UUID roomId,
            UUID hostId,
            String hostName,
            String name,
            String description,
            int capacity,
            int totalMembers,
            int totalJoins,
            int liveCount,
            String status,
            boolean isPrivate,
            boolean isFull,
            int themeId,
            List<String> tags,
            OffsetDateTime createdAt
    ) {
        static RoomResponse from(Room room, String hostName, int liveCount) {
            return new RoomResponse(
                    room.getRoomId(),
                    room.getHostId(),
                    hostName,
                    room.getName(),
                    room.getDescription(),
                    room.getCapacity(),
                    room.getTotalMembers(),
                    room.getTotalJoins(),
                    liveCount,
                    room.getStatus().name().toLowerCase(),
                    room.isPrivate(),
                    room.isFull(),
                    room.getThemeId(),
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
        // How many distinct users are connected to this room right now. This is an
        // in-memory lookup (no DB hit), so it's cheap even when listing every room.
        int liveCount = presenceService.presentUsers(room.getRoomId()).size();
        return RoomResponse.from(room, hostName, liveCount);
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

    // Change just the room's scene/environment. We keep this separate from the
    // general updateRoom (name/capacity) because the rules differ: any member can
    // restyle the room, and we don't want to require the host's other fields here.
    @PatchMapping("/{roomId}/theme")
    public RoomResponse updateTheme(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateThemeRequest req
    ) {
        Room room = roomService.updateTheme(roomId, req.requesterId(), req.themeId());
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
