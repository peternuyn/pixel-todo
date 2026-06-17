package com.meowdow.studyfarm.roomtimer;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST endpoints for a room's shared Pomodoro clock.
 *
 * Base path "/api/rooms/{roomId}/timer" mirrors the to-do list URLs: the clock
 * always lives UNDER a room. These endpoints are the "command" side — they CHANGE
 * the clock. The "notification" side (everyone else finding out) happens over
 * WebSocket inside the service, which broadcasts to /topic/rooms/{roomId}/timer.
 *
 * As everywhere in this project, there's no login token: the client says who is
 * acting by putting a userId in the request body.
 */
@RestController
@RequestMapping("/api/rooms/{roomId}/timer")
@RequiredArgsConstructor
public class RoomTimerController {

    private final RoomTimerService roomTimerService;

    // -------------------------------------------------------------------------
    // DTOs (request bodies)
    // -------------------------------------------------------------------------

    /** Body for start/pause/reset: just who is doing it. */
    record ActorRequest(
            @NotNull UUID userId
    ) {}

    /** Body for setting the clock length. */
    record SetDurationRequest(
            @NotNull UUID userId,
            int durationSeconds
    ) {}

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /**
     * GET /api/rooms/{roomId}/timer — the current clock state.
     * Used by a client on first load and after reconnecting, to sync before it
     * starts receiving live WebSocket pushes.
     */
    @GetMapping
    public RoomTimerResponse getTimer(@PathVariable UUID roomId) {
        return roomTimerService.getState(roomId);
    }

    /** PATCH /api/rooms/{roomId}/timer — set the clock length (member-only). */
    @PatchMapping
    public RoomTimerResponse setDuration(
            @PathVariable UUID roomId,
            @Valid @RequestBody SetDurationRequest req
    ) {
        return roomTimerService.setDuration(roomId, req.userId(), req.durationSeconds());
    }

    /** POST /api/rooms/{roomId}/timer/start — start/resume (member-only). */
    @PostMapping("/start")
    public RoomTimerResponse start(
            @PathVariable UUID roomId,
            @Valid @RequestBody ActorRequest req
    ) {
        return roomTimerService.start(roomId, req.userId());
    }

    /** POST /api/rooms/{roomId}/timer/pause — pause (member-only). */
    @PostMapping("/pause")
    public RoomTimerResponse pause(
            @PathVariable UUID roomId,
            @Valid @RequestBody ActorRequest req
    ) {
        return roomTimerService.pause(roomId, req.userId());
    }

    /** POST /api/rooms/{roomId}/timer/reset — reset to full length (member-only). */
    @PostMapping("/reset")
    public RoomTimerResponse reset(
            @PathVariable UUID roomId,
            @Valid @RequestBody ActorRequest req
    ) {
        return roomTimerService.reset(roomId, req.userId());
    }
}
