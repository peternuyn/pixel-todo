package com.leapandbound.roomtimer;

import com.leapandbound.membership.BelongRoomRepository;
import com.leapandbound.realtime.RoomPresenceService;
import com.leapandbound.room.RoomService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * The "business logic" for a room's SHARED Pomodoro clock. Controllers call this;
 * this calls repositories and broadcasts changes.
 *
 * COMMAND IN (REST) / NOTIFY OUT (WebSocket): the start/pause/reset/set-duration
 * actions arrive as ordinary REST calls so we get familiar validation and a direct
 * HTTP reply to the caller. After changing the clock we BROADCAST the new state to
 * /topic/rooms/{roomId}/timer so everyone else's screen updates live. The caller
 * gets the same state back in the HTTP response, so its UI updates immediately too.
 *
 * Bounds: any MEMBER of the room may control the clock (same membership rule as the
 * shared to-do list). For a PRIVATE room you can only become a member by joining
 * with the password — so "must join the private room first" falls out for free.
 */
@Service
@RequiredArgsConstructor
public class RoomTimerService {

    /** Default clock length when a room's timer is first created: 25 minutes. */
    private static final int DEFAULT_DURATION = 1500;
    /** Allowed custom-duration range: 1 minute to 3 hours. */
    private static final int MIN_DURATION = 60;
    private static final int MAX_DURATION = 10800;

    private final RoomTimerRepository roomTimerRepository;
    // Reused to confirm a room exists (throws a clear error if not) — same trick
    // RoomTaskService uses, instead of re-implementing the check.
    private final RoomService roomService;
    // The membership check: "is this user in this room?" Reused from the to-do list.
    private final BelongRoomRepository belongRoomRepository;
    // Pushes the updated state out to all subscribers.
    private final SimpMessagingTemplate messagingTemplate;
    // Tells us who's present so we can credit their study time when the clock runs.
    private final RoomPresenceService presenceService;
    // Connects the clock to the existing study-time/Sessions accounting.
    private final SessionBridge sessionBridge;
    // Lets us run a one-shot job at ends_at to flip a finished clock back to idle.
    private final TaskScheduler taskScheduler;

    // Pending "clock finished" jobs, one per room, so we can cancel them if someone
    // pauses or resets before the clock naturally reaches zero.
    private final Map<UUID, ScheduledFuture<?>> pendingCompletions = new ConcurrentHashMap<>();

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /**
     * The room's current clock state. Reading is open (no membership needed) — it's
     * just looking at a clock — and lazily creates a default IDLE 25-min timer the
     * first time a room is ever looked at, so the row always exists afterwards.
     */
    public RoomTimerResponse getState(UUID roomId) {
        return RoomTimerResponse.from(getOrCreate(roomId));
    }

    // -------------------------------------------------------------------------
    // Commands (member-only). Each one persists, then broadcasts the new state.
    // -------------------------------------------------------------------------

    /** Set the clock length (15/25/35 min preset or a custom value). */
    @Transactional
    public RoomTimerResponse setDuration(UUID roomId, UUID userId, int seconds) {
        requireMember(roomId, userId);
        if (seconds < MIN_DURATION || seconds > MAX_DURATION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Timer length must be between 1 and 180 minutes");
        }
        RoomTimer timer = getOrCreate(roomId);
        // Changing the length only makes sense on a stopped clock; otherwise it's
        // ambiguous what "now" should be. Ask the user to reset/pause first.
        if (timer.getState() == RoomTimerState.RUNNING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Stop the clock before changing its length");
        }
        timer.setDurationSeconds(seconds);
        timer.setRemainingSeconds(seconds);
        timer.setState(RoomTimerState.IDLE);
        timer.setEndsAt(null);
        return persistAndBroadcast(timer, userId, false);
    }

    /** Start (or resume) the clock. Begins crediting study time for everyone present. */
    @Transactional
    public RoomTimerResponse start(UUID roomId, UUID userId) {
        requireMember(roomId, userId);
        RoomTimer timer = getOrCreate(roomId);

        // Already running? Treat as a no-op but still re-broadcast so a late/clicky
        // client re-syncs. (Idempotent — two people pressing Start is harmless.)
        if (timer.getState() == RoomTimerState.RUNNING) {
            return persistAndBroadcast(timer, userId, false);
        }

        // Resume from the remaining snapshot; if the clock was finished/at zero,
        // pressing Start runs a fresh full-length session.
        int remaining = timer.getRemainingSeconds();
        if (remaining <= 0) {
            remaining = timer.getDurationSeconds();
        }
        OffsetDateTime endsAt = OffsetDateTime.now().plusSeconds(remaining);
        timer.setState(RoomTimerState.RUNNING);
        timer.setRemainingSeconds(remaining);
        timer.setEndsAt(endsAt);

        scheduleCompletion(roomId, endsAt);
        // Everyone currently in the room starts earning study time now.
        sessionBridge.startForUsers(roomId, presenceService.presentUsers(roomId));
        return persistAndBroadcast(timer, userId, false);
    }

    /** Pause the clock, freezing the seconds left. Banks the study time so far. */
    @Transactional
    public RoomTimerResponse pause(UUID roomId, UUID userId) {
        requireMember(roomId, userId);
        RoomTimer timer = getOrCreate(roomId);

        if (timer.getState() == RoomTimerState.RUNNING) {
            timer.setRemainingSeconds(timer.computeRemaining()); // freeze live value
            timer.setState(RoomTimerState.PAUSED);
            timer.setEndsAt(null);
            cancelCompletion(roomId);
            sessionBridge.endForUsers(presenceService.presentUsers(roomId));
        }
        return persistAndBroadcast(timer, userId, false);
    }

    /** Reset back to the full configured length and stop. Banks any study time. */
    @Transactional
    public RoomTimerResponse reset(UUID roomId, UUID userId) {
        requireMember(roomId, userId);
        RoomTimer timer = getOrCreate(roomId);

        boolean wasRunning = timer.getState() == RoomTimerState.RUNNING;
        timer.setState(RoomTimerState.IDLE);
        timer.setRemainingSeconds(timer.getDurationSeconds());
        timer.setEndsAt(null);
        cancelCompletion(roomId);
        if (wasRunning) {
            sessionBridge.endForUsers(presenceService.presentUsers(roomId));
        }
        return persistAndBroadcast(timer, userId, false);
    }

    // -------------------------------------------------------------------------
    // Auto-complete: runs by itself when a running clock reaches 00:00.
    // -------------------------------------------------------------------------

    /**
     * Invoked by the TaskScheduler at ends_at. Flips the finished clock back to IDLE
     * and broadcasts a one-off "completed" event so the UI can celebrate.
     *
     * NOTE: this runs on a scheduler thread, NOT through the Spring proxy, so we
     * don't rely on @Transactional dirty-checking here — we save() explicitly. The
     * SessionBridge/SessionService calls it makes are themselves transactional beans.
     */
    public void onComplete(UUID roomId) {
        pendingCompletions.remove(roomId);

        RoomTimer timer = roomTimerRepository.findById(roomId).orElse(null);
        if (timer == null || timer.getState() != RoomTimerState.RUNNING) {
            return; // already paused/reset/changed — nothing to finish
        }
        // Defensive: if we somehow fired early, re-arm for the real end time.
        if (timer.getEndsAt() != null && timer.getEndsAt().isAfter(OffsetDateTime.now())) {
            scheduleCompletion(roomId, timer.getEndsAt());
            return;
        }

        timer.setState(RoomTimerState.IDLE);
        timer.setRemainingSeconds(timer.getDurationSeconds());
        timer.setEndsAt(null);
        timer.setUpdatedAt(OffsetDateTime.now());
        roomTimerRepository.save(timer);

        // Credit the full session to everyone who was present at the finish.
        sessionBridge.endForUsers(presenceService.presentUsers(roomId));
        broadcast(timer, true);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Throws 403 unless the user is a member of the room. */
    private void requireMember(UUID roomId, UUID userId) {
        if (!belongRoomRepository.existsByIdUserIdAndIdRoomId(userId, roomId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Join the room before using its timer");
        }
    }

    /** Fetch the room's timer row, creating a sensible default the first time. */
    private RoomTimer getOrCreate(UUID roomId) {
        return roomTimerRepository.findById(roomId).orElseGet(() -> {
            roomService.getById(roomId); // confirms the room exists (throws if not)
            RoomTimer timer = RoomTimer.builder()
                    .roomId(roomId)
                    .durationSeconds(DEFAULT_DURATION)
                    .remainingSeconds(DEFAULT_DURATION)
                    .state(RoomTimerState.IDLE)
                    .updatedAt(OffsetDateTime.now())
                    .build();
            return roomTimerRepository.save(timer);
        });
    }

    /** Stamp who/when, save, broadcast to subscribers, and return the new state. */
    private RoomTimerResponse persistAndBroadcast(RoomTimer timer, UUID userId, boolean completed) {
        timer.setUpdatedBy(userId);
        timer.setUpdatedAt(OffsetDateTime.now());
        roomTimerRepository.save(timer);
        return broadcast(timer, completed);
    }

    /** Push the state to /topic/rooms/{id}/timer and return it for the HTTP reply. */
    private RoomTimerResponse broadcast(RoomTimer timer, boolean completed) {
        RoomTimerResponse response = RoomTimerResponse.from(timer, completed);
        messagingTemplate.convertAndSend(
                "/topic/rooms/" + timer.getRoomId() + "/timer", response);
        return response;
    }

    /** Schedule (replacing any existing) the auto-complete job for this room. */
    private void scheduleCompletion(UUID roomId, OffsetDateTime endsAt) {
        cancelCompletion(roomId);
        ScheduledFuture<?> future = taskScheduler.schedule(
                () -> onComplete(roomId), endsAt.toInstant());
        pendingCompletions.put(roomId, future);
    }

    /** Cancel a pending auto-complete job (e.g. on pause/reset). */
    private void cancelCompletion(UUID roomId) {
        ScheduledFuture<?> future = pendingCompletions.remove(roomId);
        if (future != null) {
            future.cancel(false);
        }
    }
}
