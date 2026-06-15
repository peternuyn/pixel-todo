package com.meowdow.studyfarm.roomtask;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
        RoomTask task = roomTaskService.createTask(roomId, req.userId(), req.title());
        return RoomTaskResponse.from(task);
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
        return RoomTaskResponse.from(roomTaskService.setCompleted(taskId, req.completed()));
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
    }
}
