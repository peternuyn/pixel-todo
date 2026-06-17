package com.meowdow.studyfarm.roommessage;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One emoji reaction by one user on one message. Maps to the message_reactions
 * table.
 *
 * Because the primary key is a triple (message, user, emoji), this entity carries
 * its key in an @EmbeddedId of type {@link MessageReactionId} instead of a plain
 * @Id field — mirroring {@link com.meowdow.studyfarm.membership.BelongRoom}. The
 * only non-key column is created_at (handy for "reacted at" ordering later).
 */
@Entity
@Table(name = "message_reactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageReaction {

    @EmbeddedId
    private MessageReactionId id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    /** Convenience factory: build a reaction row from its three id parts. */
    public static MessageReaction of(UUID messageId, UUID userId, String emoji) {
        return MessageReaction.builder()
                .id(new MessageReactionId(messageId, userId, emoji))
                .build();
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
