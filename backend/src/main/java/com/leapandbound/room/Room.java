package com.leapandbound.room;

import com.leapandbound.tags.Tag;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
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

    /**
     * All-time number of joins. Unlike {@link #totalMembers} (which counts who is
     * CURRENTLY in the room and so decreases when people leave), this only ever
     * goes UP. It's what powers the "20 people have joined" line on the room card —
     * a piece of social proof that shouldn't shrink the moment someone steps out.
     */
    @Column(name = "total_joins", nullable = false)
    @Builder.Default
    private int totalJoins = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 8)
    @Builder.Default
    private RoomStatus status = RoomStatus.PUBLIC;

    @Column(name = "password_hash")
    private String passwordHash;

    /**
     * Which farm scene this room shows: 1=Meadow, 2=Sunset, 3=Forest, 4=Night.
     * It's the room's *shared* environment — when anyone in the room picks a new
     * theme, we save it here so (a) the next person to open the room sees the same
     * scene, and (b) the rooms list can show a matching banner on the card.
     *
     * We store it as a plain int (not an enum) because the frontend already thinks
     * in these numeric ids, and the CHECK constraint in the DB keeps it in 1..4.
     */
    @Column(name = "theme_id", nullable = false)
    @Builder.Default
    private int themeId = 3;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * The tags attached to this room. This is a MANY-TO-MANY relationship:
     * one room can have many tags, and one tag can belong to many rooms.
     *
     * Relational databases can't store a "list" in a column, so a many-to-many
     * is modelled with a third "join table" that just holds pairs of ids.
     * @JoinTable describes that table:
     *   - name              = the join table's name ("room_tags")
     *   - joinColumns       = the column pointing back to THIS entity (room_id)
     *   - inverseJoinColumns= the column pointing to the OTHER entity (tag_id)
     * So room_tags has rows like (room_id, tag_id), one per link.
     *
     * fetch = LAZY: don't load the tags from the DB until we actually call
     * getTags() — avoids extra queries when we only need the room itself.
     * cascade = {PERSIST, MERGE}: when we save a room, also save/update its tag
     * links — but NOT REMOVE, so deleting a room never deletes the shared Tag rows.
     * We use a Set (not List) because a room shouldn't have the same tag twice.
     */
    @ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "room_tags",
            joinColumns = @JoinColumn(name = "room_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

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

    /** Bump the all-time join counter. Call this whenever a NEW membership is created. */
    public void incrementJoins() {
        this.totalJoins++;
    }

    public void decrementMembers() {
        if (this.totalMembers > 0) {
            this.totalMembers--;
        }
    }

    /** Attach a tag to this room (the Set ignores duplicates automatically). */
    public void addTag(Tag tag) {
        this.tags.add(tag);
    }
}
