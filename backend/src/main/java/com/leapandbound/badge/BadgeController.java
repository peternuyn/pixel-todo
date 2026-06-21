package com.leapandbound.badge;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for badges. Two read-only routes:
 *
 *   GET /api/badges               -> the whole catalog (so the UI can show LOCKED
 *                                    badges greyed out alongside earned ones).
 *   GET /api/users/{id}/badges    -> the badges this user has earned, with the date
 *                                    each was unlocked.
 *
 * There's no "award" endpoint: badges are never granted by a client request — they're
 * awarded server-side by the actions that earn them (finishing a session, hosting a
 * room, etc.). This controller only reads.
 */
@RestController
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;

    /** The full badge catalog (every badge, as a locked view). */
    @GetMapping("/api/badges")
    public List<BadgeView> catalog() {
        return badgeService.catalog();
    }

    /**
     * A user's full badge list, PERSONALIZED: earned badges carry their date, locked
     * ones carry progress toward unlocking. Re-evaluates snapshot badges first, which
     * is what retroactively grants badges to users who already passed a threshold
     * (study time, streaks, sessions) before the feature shipped.
     */
    @GetMapping("/api/users/{userId}/badges")
    public List<BadgeView> forUser(@PathVariable UUID userId) {
        return badgeService.listForUser(userId);
    }
}
