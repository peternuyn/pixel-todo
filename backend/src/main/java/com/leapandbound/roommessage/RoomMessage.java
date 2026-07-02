package com.leapandbound.roommessage;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A RoomMessage is one line in a room's SHARED chat log. It maps to the
 * `room_messages` table in init.sql.
 *
 * This is almost a twin of {@link com.leapandbound.roomtask.RoomTask}: every
 * member of the room sees the same messages, so the data lives in the database
 * (not the browser). We again store the links to other tables as raw UUIDs
 * (roomId, userId) instead of @ManyToOne object references — the same convention
 * Room (hostId) and RoomTask (createdBy) follow. It keeps the entity simple and
 * sidesteps JPA lazy-loading rules; the real foreign-key constraints live in
 * init.sql, where the DB guarantees these UUIDs point at real rows.
 */
@Entity
@Table(name = "room_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "message_id", updatable = false, nullable = false)
    private UUID messageId;

    // Which room this message was posted in. Raw UUID FK to rooms.room_id.
    // updatable = false: a message never moves to another room.
    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    // Who sent the message (FK to users.user_id). Also updatable = false — the
    // author of a message never changes.
    //
    // nullable = true: an AI message (senderType == AI) has NO human author, so this
    // is null for those rows. Every human ('USER') message always fills it in.
    @Column(name = "user_id", nullable = true, updatable = false)
    private UUID userId;

    // Who wrote this: a human ('USER') or the Gemini assistant ('AI'). Persisted by
    // its NAME via @Enumerated(EnumType.STRING) — same convention as Room.status and
    // RoomTimer.state. Defaults to USER in @PrePersist when the caller doesn't set it.
    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false, updatable = false)
    private SenderType senderType;

    // The message text. We map it to a Postgres TEXT column (no length cap in the
    // DB) but still bound it with @Size so the API rejects absurdly long input
    // before it ever reaches the database.
    @NotBlank
    @Size(max = 2000)
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * @PrePersist runs automatically just before this row is INSERTed for the
     * first time. We stamp createdAt here so the service layer never has to
     * remember to set it — same trick as RoomTask and User.
     */
    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
        // Be safe: a message with no explicit type is a normal human message.
        if (senderType == null) {
            senderType = SenderType.USER;
        }
    }
}
