package com.meowdow.studyfarm.roomtask;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A RoomTask is one item on a room's SHARED to-do list. It maps to the
 * `room_tasks` table in init.sql.
 *
 * Every member of a room sees the same list: anyone can add a task, tick it
 * off, or delete it. That "shared" behaviour is exactly why this lives in the
 * database (unlike the *personal* to-do list, which the frontend keeps in the
 * browser's localStorage and never sends here).
 *
 * Notice we store ownership/links as raw UUIDs (roomId, createdBy) rather than
 * @ManyToOne object references. This matches the convention used by Room
 * (hostId) and Session (userId) elsewhere in this project: it keeps the entity
 * simple and avoids extra lazy-loading rules. The actual foreign-key
 * constraints live in init.sql, where the DB enforces that these UUIDs point at
 * real rooms/users.
 */
@Entity
@Table(name = "room_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTask {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "task_id", updatable = false, nullable = false)
    private UUID taskId;

    // Which room owns this task. Raw UUID foreign key to rooms.room_id.
    // updatable = false: a task never moves to another room once created.
    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    // Who originally added the task (foreign key to users.user_id). We keep this
    // for display/credit even though ANY member may tick or delete the task.
    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @NotBlank
    @Size(max = 256)
    @Column(name = "title", nullable = false, length = 256)
    private String title;

    // A primitive boolean (not Boolean) because a task is always either done or
    // not done — there's no "unknown" state to represent with null.
    @Column(name = "completed", nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // null while the task is still open; set to the moment it was ticked off.
    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    /**
     * @PrePersist runs automatically just before this entity is INSERTed for the
     * first time. We use it to stamp createdAt if the caller didn't set one, so
     * the service layer never has to remember to do it. (Same idea as Room and
     * Session.)
     */
    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    /** Tick the task: mark it done and record when. */
    public void markComplete() {
        this.completed = true;
        this.completedAt = OffsetDateTime.now();
    }

    /** Un-tick the task: reopen it and clear the completion time. */
    public void markIncomplete() {
        this.completed = false;
        this.completedAt = null;
    }
}
