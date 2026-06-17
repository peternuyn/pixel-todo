package com.meowdow.studyfarm.roommessage;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * The composite primary key for {@link MessageReaction}.
 *
 * The message_reactions table's primary key is the TRIPLE
 * (message_id, user_id, emoji) — see init.sql. A single Java field can't hold a
 * three-column key, so we wrap all three columns in this small class and use it
 * as an @EmbeddedId on the entity. This is the exact same pattern as
 * {@link com.meowdow.studyfarm.membership.BelongRoomId}, which keys belong_room
 * on (user_id, room_id).
 *
 * What JPA requires of an id class:
 *  - @Embeddable, so it can be embedded as another entity's id
 *  - implements Serializable
 *  - has equals() + hashCode() over its fields (here from @EqualsAndHashCode).
 *    JPA leans on these to decide whether two rows are "the same"; without them
 *    you get phantom duplicates and a broken findById/existsById.
 *
 * Why the emoji is PART of the key: it lets one user attach several different
 * emojis to the same message (👍 and ❤️ are two distinct keys), while the DB
 * still forbids the same user adding the same emoji twice.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MessageReactionId implements Serializable {

    @Column(name = "message_id")
    private UUID messageId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "emoji")
    private String emoji;
}
