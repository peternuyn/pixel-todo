package com.leapandbound.badge;

import com.leapandbound.user.User;

import java.util.Arrays;
import java.util.List;
import java.util.function.ToIntFunction;

/**
 * The CATALOG of every badge a user can earn. This is the single source of truth
 * for what badges exist, what they look like, and how they're unlocked.
 *
 * WHY AN ENUM (and not a database table)? A badge definition never changes at
 * runtime — it's fixed, like a constant. Java enums are exactly that: a small,
 * closed set of named constants. Keeping the catalog in code means it's type-safe,
 * there's nothing to seed into the database, and the rules live right next to the
 * data they apply to. We only store in the DB the *fact* that a user earned a badge
 * (see {@link UserBadge}) — never the catalog itself.
 *
 * ENUM-WITH-FIELDS: each constant carries data, passed to the constructor at the
 * bottom — so FIRST_SESSION is really "new BadgeType("🌱", "First Sprout", …)".
 *
 * TWO KINDS OF BADGE:
 *   - SNAPSHOT badges carry a PROGRESS RULE: a {@code currentFn} that reads "how far
 *     along" the user is from their stats, plus a {@code target} to reach. Because
 *     it's a pure function of the User row we can (re)check it any time — even
 *     retroactively — AND show a progress bar ("8 / 10 sessions").
 *   - EVENT badges have {@code currentFn == null}: they can only be known at the
 *     exact moment they happen (a 25-minute session, a room filling up), so they're
 *     awarded explicitly from the code that handles that event.
 */
public enum BadgeType {

    // --- Firsts -------------------------------------------------------------
    FIRST_SESSION("🌱", "First Sprout", "Finished your first study session",
            Category.FIRSTS, User::getSessionsDone, 1),
    HOMESTEADER("🏡", "Homesteader", "Hosted your first room",
            Category.FIRSTS, null, 0),            // event: awarded when a room is created
    GOOD_NEIGHBOR("🤝", "Good Neighbor", "Joined your first room",
            Category.FIRSTS, null, 0),            // event: awarded when joining a room

    // --- Single-session focus duration --------------------------------------
    QUICK_GRAZE("⏱️", "Quick Graze", "Studied for 10 minutes straight",
            Category.FOCUS, null, 0),             // event: depends on one session's length
    POMODORO_PAL("🍅", "Pomodoro Pal", "Studied for 25 minutes straight",
            Category.FOCUS, null, 0),
    DEEP_ROOTS("🌳", "Deep Roots", "Studied for a full hour straight",
            Category.FOCUS, null, 0),

    // --- Cumulative study time (progress = studyTimeSeconds, target in seconds) ---
    SEEDLING("🌾", "Seedling", "1 hour of total study time",
            Category.TIME, User::getStudyTimeSeconds, 3_600),
    HARVEST("🧺", "Harvest", "10 hours of total study time",
            Category.TIME, User::getStudyTimeSeconds, 36_000),
    GOLDEN_FIELDS("🌟", "Golden Fields", "50 hours of total study time",
            Category.TIME, User::getStudyTimeSeconds, 180_000),
    LEGENDARY_FARMER("👑", "Legendary Farmer", "100 hours of total study time",
            Category.TIME, User::getStudyTimeSeconds, 360_000),

    // --- Session count (progress = sessionsDone) -----------------------------
    REGULAR("📅", "Regular", "Completed 10 study sessions",
            Category.SESSIONS, User::getSessionsDone, 10),
    DEDICATED("✅", "Dedicated", "Completed 25 study sessions",
            Category.SESSIONS, User::getSessionsDone, 25),
    CENTURION("💯", "Centurion", "Completed 100 study sessions",
            Category.SESSIONS, User::getSessionsDone, 100),

    // --- Streaks (progress = longestStreak, target in days) ------------------
    WEEK_WARRIOR("🔥", "Week Warrior", "Reached a 7-day study streak",
            Category.STREAK, User::getLongestStreak, 7),
    UNBREAKABLE("💎", "Unbreakable", "Reached a 30-day study streak",
            Category.STREAK, User::getLongestStreak, 30),

    // --- Social --------------------------------------------------------------
    // Membership-based progress (distinct rooms joined) is computed in BadgeService,
    // since it needs a belong_room count rather than a field on the User row.
    SOCIAL_BUTTERFLY("🦋", "Social Butterfly", "Joined 10 different rooms",
            Category.SOCIAL, null, 0),
    FULL_HOUSE("🏠", "Full House", "A room you host filled to capacity",
            Category.SOCIAL, null, 0),            // event: awarded when a room fills up
    PARTY_HOST("🎉", "Party Host", "Hosted while 5 people studied together",
            Category.SOCIAL, null, 0);            // event: awarded from live room presence

    /** Used to group badges in the UI. */
    public enum Category { FIRSTS, FOCUS, TIME, SESSIONS, STREAK, SOCIAL }

    private final String emoji;
    private final String label;
    private final String description;
    private final Category category;
    // null => EVENT badge (awarded explicitly). Non-null => reads the user's current
    // value toward `target`, so we can both check it and show a progress bar.
    private final ToIntFunction<User> currentFn;
    private final int target;

    BadgeType(String emoji, String label, String description, Category category,
              ToIntFunction<User> currentFn, int target) {
        this.emoji = emoji;
        this.label = label;
        this.description = description;
        this.category = category;
        this.currentFn = currentFn;
        this.target = target;
    }

    public String getEmoji() { return emoji; }
    public String getLabel() { return label; }
    public String getDescription() { return description; }
    public Category getCategory() { return category; }
    public int getTarget() { return target; }

    /** True if this badge can be decided (and progressed) from a user's current stats. */
    public boolean isSnapshot() {
        return currentFn != null;
    }

    /** This user's current value toward the target (0 for event badges). */
    public int currentProgress(User user) {
        return currentFn == null ? 0 : currentFn.applyAsInt(user);
    }

    /** For a snapshot badge, has this user met its target? (Event badges: false.) */
    public boolean qualifies(User user) {
        return currentFn != null && currentFn.applyAsInt(user) >= target;
    }

    /** Just the badges whose unlock is a pure function of the User row. */
    public static List<BadgeType> snapshotBadges() {
        return Arrays.stream(values()).filter(BadgeType::isSnapshot).toList();
    }
}
