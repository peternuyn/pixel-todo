package com.meowdow.studyfarm.badge;

import com.meowdow.studyfarm.membership.BelongRoomRepository;
import com.meowdow.studyfarm.user.User;
import com.meowdow.studyfarm.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The "brain" of the badge system. Every other service that wants to award a badge
 * calls in here, so all the awarding rules — and the "you can't earn it twice" check
 * — live in ONE place (the same design idea as SessionBridge wrapping SessionService).
 *
 * COMMAND IN / NOTIFY OUT: awarding is triggered by ordinary backend actions (a
 * session ending, a room filling up). When a NEW badge is earned we (a) BROADCAST it
 * to the user's own channel so their browser can pop a toast, and (b) PUBLISH an
 * application event so other parts of the app (e.g. the room announcer) can react —
 * without us depending on them.
 */
@Service
@RequiredArgsConstructor
public class BadgeService {

    private final UserBadgeRepository userBadgeRepository;
    // To read a user's current stats for the snapshot badges + progress bars.
    private final UserRepository userRepository;
    // To count how many rooms a user belongs to (the social membership badges).
    private final BelongRoomRepository belongRoomRepository;
    // Pushes a "you earned a badge" event out to the user's own browser.
    private final SimpMessagingTemplate messagingTemplate;
    // Lets us announce a new badge to anyone interested (e.g. the room they're in).
    private final ApplicationEventPublisher events;

    // -------------------------------------------------------------------------
    // The single write path
    // -------------------------------------------------------------------------

    /**
     * Award a badge to a user, exactly once.
     *
     * IDEMPOTENT: if the user already has the badge we do nothing and return empty,
     * so it's always safe to call this from a hook that may fire many times (every
     * session end, every join). Only on a genuinely NEW badge do we persist a row,
     * broadcast the celebration, and publish the event.
     */
    @Transactional
    public Optional<BadgeType> award(UUID userId, BadgeType type) {
        if (userBadgeRepository.existsByIdUserIdAndIdBadgeKey(userId, type.name())) {
            return Optional.empty();
        }
        UserBadge saved = userBadgeRepository.save(UserBadge.of(userId, type));

        // 1) Notify the user's own browser so a toast can fire immediately.
        messagingTemplate.convertAndSend(
                "/topic/users/" + userId + "/badges",
                BadgeView.earned(type, saved.getEarnedAt()));

        // 2) Tell the rest of the app a new badge was earned (room announcer listens).
        events.publishEvent(new BadgeAwardedEvent(userId, type));

        return Optional.of(type);
    }

    // -------------------------------------------------------------------------
    // Evaluation entry points (called from the action hooks + on read)
    // -------------------------------------------------------------------------

    /**
     * Re-check every badge that can be decided from a user's CURRENT state and award
     * any they now qualify for. Safe to call repeatedly (award is idempotent).
     *
     * This is the "self-healing" path: calling it covers users who passed a threshold
     * before this feature existed, and it's also what the read endpoint uses.
     */
    @Transactional
    public void evaluateForUser(UUID userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return; // unknown user — nothing to award
        }

        // Pure-stat badges (study time, session count, streaks, first session).
        for (BadgeType type : BadgeType.snapshotBadges()) {
            if (type.qualifies(user)) {
                award(userId, type);
            }
        }

        // Membership-based social badges: these need a count from belong_room, not a
        // field on the User row, so they're checked here rather than via a predicate.
        if (belongRoomRepository.countByIdUserIdAndRole(userId, "member") >= 1) {
            award(userId, BadgeType.GOOD_NEIGHBOR);
        }
        if (belongRoomRepository.countByIdUserId(userId) >= 10) {
            award(userId, BadgeType.SOCIAL_BUTTERFLY);
        }
    }

    /**
     * Award the single-session focus badges based on how long ONE session lasted.
     * Called from SessionService when a clock stops, since this can't be recovered
     * from the user's cumulative totals afterwards.
     */
    @Transactional
    public void awardSessionDuration(UUID userId, int durationSeconds) {
        if (durationSeconds >= 600)  award(userId, BadgeType.QUICK_GRAZE);   // 10 min
        if (durationSeconds >= 1500) award(userId, BadgeType.POMODORO_PAL);  // 25 min
        if (durationSeconds >= 3600) award(userId, BadgeType.DEEP_ROOTS);    // 60 min
    }

    // -------------------------------------------------------------------------
    // Reads (for the controller)
    // -------------------------------------------------------------------------

    /** The full catalog, every badge as a "locked" view (no per-user info). */
    public List<BadgeView> catalog() {
        return Arrays.stream(BadgeType.values())
                .map(BadgeView::locked)
                .toList();
    }

    /**
     * The full badge list PERSONALIZED for one user: earned badges carry their date,
     * locked snapshot badges carry progress (current/target), and locked event badges
     * are plain. We re-evaluate first so the list is always current (this is what
     * retroactively grants stat badges to users who already passed a threshold).
     */
    @Transactional
    public List<BadgeView> listForUser(UUID userId) {
        evaluateForUser(userId);

        User user = userRepository.findById(userId).orElse(null);
        Map<String, OffsetDateTime> earnedAt = userBadgeRepository.findByIdUserId(userId).stream()
                .collect(Collectors.toMap(ub -> ub.getId().getBadgeKey(), UserBadge::getEarnedAt));
        long roomCount = belongRoomRepository.countByIdUserId(userId);

        List<BadgeView> views = new ArrayList<>();
        for (BadgeType type : BadgeType.values()) {
            OffsetDateTime when = earnedAt.get(type.name());
            if (when != null) {
                views.add(BadgeView.earned(type, when));
            } else if (type.isSnapshot() && user != null) {
                views.add(BadgeView.inProgress(type, type.currentProgress(user), type.getTarget()));
            } else if (type == BadgeType.SOCIAL_BUTTERFLY) {
                // Membership progress: how many of the 10 rooms have they joined.
                views.add(BadgeView.inProgress(type, (int) Math.min(roomCount, 10), 10));
            } else {
                views.add(BadgeView.locked(type)); // event badge — no progress bar
            }
        }
        return views;
    }
}
