package com.leapandbound.tags;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A Tag is a small reusable label (e.g. "focus", "coding", "math") that can be
 * attached to rooms so users can categorise and search them.
 *
 * @Entity tells JPA/Hibernate "this class maps to a database table". Each field
 * becomes a column, and each instance of this class becomes a row in that table.
 * Spring Data + Hibernate generate the SQL for us, so we rarely write it by hand.
 */
@Entity
@Table(name = "tags")
@Getter                 // Lombok: generates getName(), getTagId(), ... at compile time
@Setter                 // Lombok: generates setName(...), etc.
@NoArgsConstructor      // JPA requires a no-args constructor to build entities from rows
@AllArgsConstructor     // a constructor with every field (used by @Builder)
@Builder                // lets us write Tag.builder().name("focus").build()
public class Tag {

    /**
     * The primary key. @GeneratedValue with strategy = UUID means the database
     * (or Hibernate) generates a random unique id for us — we never set it.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "tag_id", updatable = false, nullable = false)
    private UUID tagId;

    /**
     * The tag text, stored already-normalised (lowercase, trimmed) by the service.
     *
     * unique = true adds a UNIQUE constraint at the database level, so even if our
     * code missed a duplicate check, the DB itself would reject a second "focus".
     * @NotBlank / @Size are validation rules checked before we hit the DB.
     */
    @NotBlank
    @Size(max = 32)
    @Column(name = "name", nullable = false, unique = true, length = 32)
    private String name;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * @PrePersist runs automatically right before this entity is first saved.
     * We use it to stamp the creation time so callers don't have to.
     */
    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
