package com.meowdow.studyfarm.roomtask;

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
import java.util.UUID;

/**
 * REST endpoints for a room's shared to-do list.
 *
 * The base path "/api/rooms/{roomId}/tasks" makes the URL itself express the
 * relationship: tasks always live UNDER a room. {roomId} is a "path variable" —
 * a piece of the URL we read into a method parameter with @PathVariable.
 *
 * Like the rest of this project, there's no login token: the client tells us who
 * is acting by sending a userId in the request body where it matters (here, when
 * creating a task).
 */
@RestController
@RequestMapping("/api/rooms/{roomId}/tasks")
@RequiredArgsConstructor
public class RoomTaskController {

    private final RoomTaskService roomTaskService;
    // Used to push task changes to everyone in the room over WebSocket.
    // Destination: /topic/rooms/{roomId}/tasks
    private final SimpMessagingTemplate messagingTemplate;

    // -------------------------------------------------------------------------
    // DTOs
    // -------------------------------------------------------------------------
    // DTO = "Data Transfer Object": the exact shape of JSON we accept/return. We
    // use Java records (compact, immutable classes) and never expose the JPA
    // entity directly, so the API stays decoupled from the database layout.

    /** Body for "add a task". The userId proves who is creating it. */
    record CreateTaskRequest(
            @NotNull UUID userId,
            @NotBlank @Size(max = 256) String title
    ) {}

    /** Body for "tick / un-tick". true = done, false = reopen. */
    record ToggleTaskRequest(
            boolean completed
    ) {}

    /**
     * The WebSocket push payload. Every subscriber on /topic/rooms/{id}/tasks
     * receives one of these after any mutation.
     *
     * type = "created" | "updated" | "deleted"
     *   - created / updated: `task` holds the full task, `taskId` mirrors task.taskId()
     *   - deleted:           `task` is null,              `taskId` is the removed id
     *
     * Keeping a top-level `taskId` on every event lets the frontend identify
     * which row to touch without null-checking `task` first.
     */
    record TaskEvent(String type, RoomTaskResponse task, UUID taskId) {
        static TaskEvent created(RoomTaskResponse t) { return new TaskEvent("created", t, t.taskId()); }
        static TaskEvent updated(RoomTaskResponse t) { return new TaskEvent("updated", t, t.taskId()); }
        static TaskEvent deleted(UUID id)            { return new TaskEvent("deleted", null, id); }
    }

    /** What every task looks like when we send it back to the frontend. */
    record RoomTaskResponse(
            UUID taskId,
            UUID roomId,
            UUID createdBy,
            String title,
            boolean completed,
            OffsetDateTime createdAt,
            OffsetDateTime completedAt
    ) {
        // A small factory that converts a RoomTask entity into this response.
        static RoomTaskResponse from(RoomTask task) {
            return new RoomTaskResponse(
                    task.getTaskId(),
                    task.getRoomId(),
                    task.getCreatedBy(),
                    task.getTitle(),
                    task.isCompleted(),
                    task.getCreatedAt(),
                    task.getCompletedAt()
            );
        }
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /** GET /api/rooms/{roomId}/tasks — the whole shared list, oldest first. */
    @GetMapping
    public List<RoomTaskResponse> getTasks(@PathVariable UUID roomId) {
        return roomTaskService.listForRoom(roomId).stream()
                .map(RoomTaskResponse::from)
                .toList();
    }

    /** POST /api/rooms/{roomId}/tasks — add a task. Returns 201 Created. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoomTaskResponse createTask(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateTaskRequest req
    ) {
        RoomTaskResponse response = RoomTaskResponse.from(
                roomTaskService.createTask(roomId, req.userId(), req.title()));
        broadcast(roomId, TaskEvent.created(response));
        return response;
    }

    /**
     * PATCH /api/rooms/{roomId}/tasks/{taskId} — tick or un-tick a task.
     * PATCH (not PUT) because we're changing just one field, not replacing the
     * whole task.
     */
    @PatchMapping("/{taskId}")
    public RoomTaskResponse toggleTask(
            @PathVariable UUID roomId,
            @PathVariable UUID taskId,
            @Valid @RequestBody ToggleTaskRequest req
    ) {
        RoomTaskResponse response = RoomTaskResponse.from(
                roomTaskService.setCompleted(taskId, req.completed()));
        broadcast(roomId, TaskEvent.updated(response));
        return response;
    }

    /**
     * DELETE /api/rooms/{roomId}/tasks/{taskId} — remove a task.
     * Returns 204 No Content: success, and there's nothing meaningful to send back.
     */
    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(
            @PathVariable UUID roomId,
            @PathVariable UUID taskId
    ) {
        roomTaskService.deleteTask(taskId);
        broadcast(roomId, TaskEvent.deleted(taskId));
    }

    /** Push a task change to every subscriber in the room. */
    private void broadcast(UUID roomId, TaskEvent event) {
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId + "/tasks", event);
    }
}
