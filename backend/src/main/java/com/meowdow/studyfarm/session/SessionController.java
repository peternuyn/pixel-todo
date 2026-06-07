package com.meowdow.studyfarm.session;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    // -------------------------------------------------------------------------
    // DTOs
    // -------------------------------------------------------------------------

    /** roomId is optional: omit/null it for a personal clock. */
    record StartSessionRequest(
            @NotNull UUID userId,
            UUID roomId
    ) {}

    record EndSessionRequest(
            @NotNull UUID userId
    ) {}

    record SessionResponse(
            UUID sessionId,
            UUID userId,
            UUID roomId,
            boolean roomSession,
            boolean active,
            OffsetDateTime startedAt,
            OffsetDateTime endedAt,
            Integer durationSeconds
    ) {
        static SessionResponse from(Session s) {
            return new SessionResponse(
                    s.getSessionId(),
                    s.getUserId(),
                    s.getRoomId(),
                    s.isRoomSession(),
                    s.isActive(),
                    s.getStartedAt(),
                    s.getEndedAt(),
                    s.getDurationSeconds()
            );
        }
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /** POST /api/sessions/start — begin a clock (personal if roomId is null). */
    @PostMapping("/start")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse start(@Valid @RequestBody StartSessionRequest req) {
        Session session = sessionService.startSession(req.userId(), req.roomId());
        return SessionResponse.from(session);
    }

    /** POST /api/sessions/end — stop the user's running clock and bank the time. */
    @PostMapping("/end")
    public SessionResponse end(@Valid @RequestBody EndSessionRequest req) {
        Session session = sessionService.endSession(req.userId());
        return SessionResponse.from(session);
    }

    /**
     * GET /api/sessions/active/{userId} — the user's running clock.
     * Returns 204 No Content if they aren't studying right now.
     */
    @GetMapping("/active/{userId}")
    public SessionResponse active(@PathVariable UUID userId) {
        Session session = sessionService.getActiveSession(userId);
        if (session == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NO_CONTENT);
        }
        return SessionResponse.from(session);
    }

    /** GET /api/sessions/room/{roomId}/active — who's studying together here now. */
    @GetMapping("/room/{roomId}/active")
    public List<SessionResponse> activeInRoom(@PathVariable UUID roomId) {
        return sessionService.getActiveRoomSessions(roomId).stream()
                .map(SessionResponse::from)
                .toList();
    }

    /** GET /api/sessions/history/{userId} — the user's past sessions. */
    @GetMapping("/history/{userId}")
    public List<SessionResponse> history(@PathVariable UUID userId) {
        return sessionService.getUserHistory(userId).stream()
                .map(SessionResponse::from)
                .toList();
    }
}
