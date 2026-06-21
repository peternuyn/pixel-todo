package com.meowdow.studyfarm.badge;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * UserBadge records that a user has earned one badge — it maps to the user_badges
 * table. Like {@link com.meowdow.studyfarm.membership.BelongRoom}, this is a join
 * table WITH an extra column: besides the (user, badge) key it stores earned_at, the
 * moment the badge was unlocked (so the profile can show "earned Jun 2026").
 *
 * The catalog of badges lives in the {@link BadgeType} enum, not the database, so a
 * row here is just a user id + the badge's enum name + a timestamp.
 */
@Entity
@Table(name = "user_badges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserBadge {

    // The primary key IS the (user_id, badge_key) pair, modelled by UserBadgeId.
    @EmbeddedId
    private UserBadgeId id;

    @Column(name = "earned_at", nullable = false, updatable = false)
    private OffsetDateTime earnedAt;

    @PrePersist
    void onCreate() {
        if (earnedAt == null) {
            earnedAt = OffsetDateTime.now();
        }
    }

    /** Build a fresh "user earned this badge now" row. */
    public static UserBadge of(UUID userId, BadgeType type) {
        return UserBadge.builder()
                .id(new UserBadgeId(userId, type.name()))
                .build();
    }

    /** The catalog entry this row refers to (parsed back from the stored name). */
    public BadgeType getBadgeType() {
        return BadgeType.valueOf(id.getBadgeKey());
    }
}
