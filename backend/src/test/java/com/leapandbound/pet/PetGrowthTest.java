package com.leapandbound.pet;

import com.leapandbound.pet.PetGrowth.Mood;
import com.leapandbound.pet.PetGrowth.Stage;
import com.leapandbound.user.User;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class PetGrowthTest {

    private static final ZoneId UTC = ZoneId.of("UTC");

    @Test
    void stagesFollowXpThresholds() {
        assertEquals(Stage.EGG, Stage.of(0));
        assertEquals(Stage.EGG, Stage.of(24));
        assertEquals(Stage.BABY, Stage.of(25));
        assertEquals(Stage.GROWN, Stage.of(300));
        assertEquals(25, Stage.EGG.nextMinXp());
        assertNull(Stage.GROWN.nextMinXp());
    }

    @Test
    void xpIsMinutesPlusDailyBonusForRealSessions() {
        assertEquals(25, PetGrowth.xpForSession(25 * 60, false));
        assertEquals(35, PetGrowth.xpForSession(25 * 60, true));
        assertEquals(1, PetGrowth.xpForSession(119, true)); // < 5 min: no bonus
    }

    @Test
    void moodDropsTheLongerYouStayAway() {
        OffsetDateTime now = OffsetDateTime.now();
        assertEquals(Mood.HAPPY, PetGrowth.moodAt(null, now));
        assertEquals(Mood.HAPPY, PetGrowth.moodAt(now.minusHours(23), now));
        assertEquals(Mood.LONELY, PetGrowth.moodAt(now.minusHours(25), now));
        assertEquals(Mood.SAD, PetGrowth.moodAt(now.minusDays(4), now));
    }

    @Test
    void sessionsGrowThePetAndStreak() {
        User user = new User();

        user.addStudyTime(25 * 60, UTC); // first ever session: 25 min + daily bonus
        assertEquals(35, user.getPetXp());
        assertEquals(1, user.getCurrentStreak());

        user.addStudyTime(10 * 60, UTC); // same day: no bonus, streak unchanged
        assertEquals(45, user.getPetXp());
        assertEquals(1, user.getCurrentStreak());

        user.setLastStudiedAt(OffsetDateTime.now().minusDays(1));
        user.addStudyTime(10 * 60, UTC); // next day: bonus again, streak extends
        assertEquals(65, user.getPetXp());
        assertEquals(2, user.getCurrentStreak());

        user.setLastStudiedAt(OffsetDateTime.now().minusDays(3));
        user.addStudyTime(60, UTC); // gap: streak restarts, longest kept
        assertEquals(1, user.getCurrentStreak());
        assertEquals(2, user.getLongestStreak());
    }
}
