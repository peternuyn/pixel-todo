package com.meowdow.studyfarm.room;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "room_id", updatable = false, nullable = false)
    private UUID roomId;

    @Column(name = "host_id", nullable = false, updatable = false)
    private UUID hostId;

    @NotBlank
    @Size(max = 64)
    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "description")
    private String description;

    @Positive
    @Column(name = "capacity", nullable = false)
    @Builder.Default
    private int capacity = 10;

    @Column(name = "total_members", nullable = false)
    @Builder.Default
    private int totalMembers = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 8)
    @Builder.Default
    private RoomStatus status = RoomStatus.PUBLIC;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public boolean isFull() {
        return totalMembers >= capacity;
    }

    public boolean isPrivate() {
        return status == RoomStatus.PRIVATE;
    }

    public void incrementMembers() {
        this.totalMembers++;
    }

    public void decrementMembers() {
        if (this.totalMembers > 0) {
            this.totalMembers--;
        }
    }
}
