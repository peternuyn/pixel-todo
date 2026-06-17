package com.meowdow.studyfarm.roommessage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Repository for emoji reactions. Note the id type:
 * JpaRepository<MessageReaction, MessageReactionId> — the second type parameter
 * is the COMPOSITE key class, so save/findById/existsById/deleteById all take a
 * MessageReactionId (just like BelongRoomRepository takes a BelongRoomId).
 *
 * In the derived method names, "Id" refers to the @EmbeddedId field, and the part
 * after it navigates INTO that key: "IdMessageId" means "the messageId property of
 * the embedded id".
 */
@Repository
public interface MessageReactionRepository extends JpaRepository<MessageReaction, MessageReactionId> {

    /** Every reaction on one message. */
    List<MessageReaction> findByIdMessageId(UUID messageId);

    /**
     * Every reaction across MANY messages in one query. We use this to load the
     * reactions for a whole page of chat messages at once, instead of querying
     * per-message (which would be the classic "N+1 queries" performance trap).
     */
    List<MessageReaction> findByIdMessageIdIn(Collection<UUID> messageIds);
}
