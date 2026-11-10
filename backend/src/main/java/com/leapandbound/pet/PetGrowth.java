package com.leapandbound.pet;

import com.leapandbound.user.User;

import java.time.Duration;
import java.time.OffsetDateTime;

/**
 * How a user's pet grows (from XP) and how it feels (from how recently they studied).
 *
 * XP is stored on the user (pet_xp) because it only ever accumulates. MOOD is NOT
 * stored: it's a pure function of last_studied_at and "now", so computing it on read
 * is always correct — a stored mood would need a scheduled job to decay it and would
 * be stale in between.
 */
public final class PetGrowth {

    /** XP per full minute studied. */
    public static final int XP_PER_MINUTE = 1;
    /** Bonus for the first real session (>= 5 min) of a new day — rewards coming back. */
    public static final int DAILY_BONUS_XP = 10;
    public static final int DAILY_BONUS_MIN_SECONDS = 300;

    public enum Stage {
        EGG(0), BABY(25), GROWN(300); // hatches after one pomodoro, grows up at ~5h

        public final int minXp;

        Stage(int minXp) { this.minXp = minXp; }

        public static Stage of(int xp) {
            if (xp >= GROWN.minXp) return GROWN;
            if (xp >= BABY.minXp) return BABY;
            return EGG;
        }

        /** XP needed for the next stage, or null when fully grown. */
        public Integer nextMinXp() {
            return this == GROWN ? null : values()[ordinal() + 1].minXp;
        }
    }

    public enum Mood { HAPPY, LONELY, SAD }

    /** What the API returns about the pet's progress. */
    public record View(int xp, Stage stage, int stageMinXp, Integer nextStageXp, Mood mood) {}

    private PetGrowth() {}

    /** XP earned by one finished session. */
    public static int xpForSession(int seconds, boolean firstSessionOfDay) {
        int xp = (seconds / 60) * XP_PER_MINUTE;
        if (firstSessionOfDay && seconds >= DAILY_BONUS_MIN_SECONDS) {
            xp += DAILY_BONUS_XP;
        }
        return xp;
    }

    /** Happy within a day of studying, lonely after 1 day away, sad after 3. */
    public static Mood moodAt(OffsetDateTime lastStudiedAt, OffsetDateTime now) {
        if (lastStudiedAt == null) return Mood.HAPPY; // brand-new egg, nothing to miss yet
        long hoursAway = Duration.between(lastStudiedAt, now).toHours();
        if (hoursAway < 24) return Mood.HAPPY;
        if (hoursAway < 72) return Mood.LONELY;
        return Mood.SAD;
    }

    public static View viewOf(User user, OffsetDateTime now) {
        Stage stage = Stage.of(user.getPetXp());
        return new View(user.getPetXp(), stage, stage.minXp, stage.nextMinXp(),
                moodAt(user.getLastStudiedAt(), now));
    }
}
