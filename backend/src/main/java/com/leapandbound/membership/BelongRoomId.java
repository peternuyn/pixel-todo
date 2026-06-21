package com.leapandbound.membership;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * The composite primary key for BelongRoom.
 *
 * The belong_room table's primary key is the PAIR (user_id, room_id) — see
 * init.sql: PRIMARY KEY (user_id, room_id). A single Java field can't represent
 * a two-column key, so we wrap both columns in this small class and use it as an
 * @EmbeddedId on the entity.
 *
 * Requirements JPA places on an id class:
 *  - @Embeddable, so it can be embedded as another entity's id
 *  - implements Serializable
 *  - has equals() + hashCode() based on its fields (provided by @EqualsAndHashCode).
 *    JPA uses these to tell whether two rows are "the same"; without them you get
 *    duplicate/phantom rows and broken findById.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BelongRoomId implements Serializable {

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "room_id")
    private UUID roomId;
}
