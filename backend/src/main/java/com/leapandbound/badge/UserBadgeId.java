package com.leapandbound.badge;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * The composite primary key for {@link UserBadge}.
 *
 * The user_badges table's primary key is the PAIR (user_id, badge_key) — see
 * init.sql: PRIMARY KEY (user_id, badge_key). This is the SAME pattern as
 * BelongRoomId(user_id, room_id): a single Java field can't represent a two-column
 * key, so we wrap both columns in this small class and use it as an @EmbeddedId on
 * the entity.
 *
 * Making the pair the primary key is also what guarantees a user can never earn the
 * same badge twice — the database physically rejects a duplicate (user, badge) row.
 *
 * badge_key holds a {@link BadgeType} name (its enum constant name, e.g.
 * "POMODORO_PAL"). We store the NAME as text rather than the enum's ordinal number,
 * so reordering the enum later can never silently re-map existing rows.
 *
 * Requirements JPA places on an id class:
 *   - @Embeddable, so it can be embedded as another entity's id
 *   - implements Serializable
 *   - equals() + hashCode() based on its fields (from @EqualsAndHashCode), which JPA
 *     uses to tell whether two rows are "the same".
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserBadgeId implements Serializable {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "badge_key", length = 48)
    private String badgeKey;
}
