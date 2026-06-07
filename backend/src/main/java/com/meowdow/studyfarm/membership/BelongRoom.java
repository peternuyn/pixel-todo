package com.meowdow.studyfarm.membership;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * BelongRoom records that a user is a member of a room — it maps to the
 * belong_room table.
 *
 * This is a "join table WITH EXTRA COLUMNS": besides the two foreign keys it
 * also stores `role` and `joined_at`. A plain @ManyToMany (like Room<->Tag) hides
 * the join table and can't hold extra data, so once we need columns like these we
 * must promote the join table to its own @Entity with a composite key.
 */
@Entity
@Table(name = "belong_room")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BelongRoom {

    // The primary key IS the (user_id, room_id) pair, modelled by BelongRoomId.
    @EmbeddedId
    private BelongRoomId id;

    // Matches the DB CHECK (role IN ('host','member')). Kept as a String for
    // simplicity; could be an enum + @Enumerated like RoomStatus if it grows.
    @Column(name = "role", nullable = false, length = 8)
    @Builder.Default
    private String role = "member";

    @Column(name = "joined_at", nullable = false, updatable = false)
    private OffsetDateTime joinedAt;

    @PrePersist
    void onCreate() {
        if (joinedAt == null) {
            joinedAt = OffsetDateTime.now();
        }
    }

    // Convenience constructor: build a membership from the two ids + role.
    public static BelongRoom of(UUID userId, UUID roomId, String role) {
        return BelongRoom.builder()
                .id(new BelongRoomId(userId, roomId))
                .role(role)
                .build();
    }
}
