package com.leapandbound.roomtask;

import com.leapandbound.badge.BadgeService;
import com.leapandbound.badge.BadgeType;
import com.leapandbound.membership.BelongRoomRepository;
import com.leapandbound.room.RoomService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * The "business logic" layer for shared room tasks. Controllers talk to this
 * service; the service talks to repositories. Keeping the rules here (instead of
 * in the controller) means the same rules apply no matter who calls them.
 *
 * Design decisions for this feature:
 *   - Adding a task requires you to be a MEMBER of the room (you can't drop
 *     tasks into a room you haven't joined).
 *   - Ticking/un-ticking and DELETING a task have NO ownership check: per the
 *     feature spec, everyone in the room shares the list and anyone may tick or
 *     remove any task.
 */
@Service
@RequiredArgsConstructor
public class RoomTaskService {

    private final RoomTaskRepository roomTaskRepository;
    // We reuse RoomService.getById to confirm the room exists (it throws a clear
    // "Room not found" error if it doesn't) rather than re-implementing that check.
    private final RoomService roomService;
    // Lets us verify the user actually belongs to the room before they add tasks.
    private final BelongRoomRepository belongRoomRepository;
    // The shared "brain" that decides and grants badges. We call it when a task is
    // created so the user can earn the Task Planter badge. We don't talk to the
    // badge database ourselves — we delegate to BadgeService, which owns the
    // "award exactly once" rule (the same way we delegate room checks to RoomService).
    private final BadgeService badgeService;

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    /** Every task in a room, oldest first. */
    public List<RoomTask> listForRoom(UUID roomId) {
        return roomTaskRepository.findByRoomIdOrderByCreatedAtAsc(roomId);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Add a new task to a room's shared list.
     *
     * @Transactional means everything in this method runs in ONE database
     * transaction: if anything throws partway through, all changes roll back so
     * we never leave half-written data.
     */
    @Transactional
    public RoomTask createTask(UUID roomId, UUID userId, String title) {
        // Throws "Room not found" if the room id is bogus.
        roomService.getById(roomId);

        // You must be in the room to add to its list.
        if (!belongRoomRepository.existsByIdUserIdAndIdRoomId(userId, roomId)) {
            throw new IllegalArgumentException("You must be a member of the room to add tasks");
        }

        RoomTask task = RoomTask.builder()
                .roomId(roomId)
                .createdBy(userId)
                .title(title)
                .build();

        RoomTask saved = roomTaskRepository.save(task);

        // Adding a shared room to-do task earns the Task Planter badge. award() is IDEMPOTENT:
        // it checks whether the user already has the badge and quietly does nothing
        // if so. That means we can safely call it on EVERY task creation without
        // worrying about "is this their first task?" ourselves — the badge is granted
        // (and the celebratory WebSocket toast pushed to their browser) only the very
        // first time. This is the same pattern RoomService uses for the Homesteader
        // ("first room hosted") badge.
        badgeService.award(userId, BadgeType.TASK_PLANTER);

        return saved;
    }

    // -------------------------------------------------------------------------
    // Update (tick / un-tick)
    // -------------------------------------------------------------------------

    /**
     * Mark a task done or not-done. Anyone in the room may do this, so there's
     * no requester/ownership check.
     *
     * Because we're inside @Transactional and the entity we load is "managed" by
     * JPA, simply mutating it (markComplete/markIncomplete) is enough — JPA
     * flushes the change to the DB at the end of the transaction. No explicit
     * save() call is needed.
     */
    @Transactional
    public RoomTask setCompleted(UUID taskId, boolean completed) {
        RoomTask task = getById(taskId);
        if (completed) {
            task.markComplete();
        } else {
            task.markIncomplete();
        }
        return task;
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /** Remove a task. Anyone in the room may delete any task, so no owner check. */
    @Transactional
    public void deleteTask(UUID taskId) {
        RoomTask task = getById(taskId);
        roomTaskRepository.delete(task);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Load a task or fail loudly. Throwing IllegalArgumentException maps to an
     * HTTP 400 (see how other controllers in this project surface these), which
     * is the convention used here for "you asked for something that isn't there".
     */
    private RoomTask getById(UUID taskId) {
        return roomTaskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("Task not found: " + taskId));
    }
}
