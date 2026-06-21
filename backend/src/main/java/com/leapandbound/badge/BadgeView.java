package com.leapandbound.badge;

import java.time.OffsetDateTime;

/**
 * The shape we send to the frontend for a badge. The SAME record covers three states
 * so the UI can render one consistent list:
 *   - EARNED:      earnedAt set; progress fields null.
 *   - IN PROGRESS: earnedAt null; progressCurrent/progressTarget set (drives the
 *                  "8 / 10 sessions" bar on a locked snapshot badge).
 *   - LOCKED:      everything but the catalog fields null (an event badge you simply
 *                  have to trigger — no meaningful progress to show).
 *
 * A Java {@code record} is a compact, immutable data carrier: declaring the fields in
 * the header auto-generates the constructor, getters, equals/hashCode and toString.
 */
public record BadgeView(
        String key,
        String emoji,
        String label,
        String description,
        String category,
        OffsetDateTime earnedAt,
        Integer progressCurrent,
        Integer progressTarget
) {
    /** A catalog/locked entry with no per-user info. */
    public static BadgeView locked(BadgeType type) {
        return new BadgeView(key(type), type.getEmoji(), type.getLabel(),
                type.getDescription(), type.getCategory().name(), null, null, null);
    }

    /** A badge the user has earned, stamped with when. */
    public static BadgeView earned(BadgeType type, OffsetDateTime earnedAt) {
        return new BadgeView(key(type), type.getEmoji(), type.getLabel(),
                type.getDescription(), type.getCategory().name(), earnedAt, null, null);
    }

    /** A locked badge with how far along the user is toward unlocking it. */
    public static BadgeView inProgress(BadgeType type, int current, int target) {
        return new BadgeView(key(type), type.getEmoji(), type.getLabel(),
                type.getDescription(), type.getCategory().name(), null, current, target);
    }

    private static String key(BadgeType type) {
        return type.name();
    }
}
