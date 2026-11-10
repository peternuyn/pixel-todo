package com.leapandbound.user;

import com.leapandbound.badge.BadgeService;
import com.leapandbound.pet.PetRepository;
import com.leapandbound.session.SessionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    // Used to confirm a chosen pet actually exists before linking it to a user.
    private final PetRepository petRepository;
    // Awards streak badges after a streak update.
    private final BadgeService badgeService;
    // Sums finished sessions for the weekly leaderboard.
    private final SessionRepository sessionRepository;

    // Which timezone decides where one "study day" ends and the next begins for
    // streaks. Override with STREAK_ZONE (e.g. Asia/Ho_Chi_Minh); defaults to UTC.
    @Value("${app.streak-zone:${STREAK_ZONE:UTC}}")
    private ZoneId streakZone;

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    public User register(String username, String displayName, String rawPassword) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already taken: " + username);
        }

        User user = User.builder()
                .username(username)
                .displayName(displayName)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .build();

        return userRepository.save(user);
    }

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    public User login(String username, String rawPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        return user;
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    public User getById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
    }

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
    }

    public List<User> getLeaderboard() {
        return userRepository.findTop10ByOrderByStudyTimeSecondsDesc();
    }

    /** A leaderboard row: the user plus their study seconds this week. */
    public record WeeklyEntry(User user, long weekSeconds) {}

    /**
     * Top 10 by study time this calendar week (Monday 00:00 in the streak timezone),
     * so everyone starts level each Monday instead of chasing all-time totals.
     * Two queries total: one grouped sum over sessions, one batched user lookup.
     */
    public List<WeeklyEntry> getWeeklyLeaderboard() {
        OffsetDateTime weekStart = LocalDate.now(streakZone)
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .atStartOfDay(streakZone)
                .toOffsetDateTime();

        List<SessionRepository.StudyTotal> totals =
                sessionRepository.findTopStudyTotalsSince(weekStart, PageRequest.of(0, 10));
        Map<UUID, User> users = userRepository
                .findAllById(totals.stream().map(SessionRepository.StudyTotal::getUserId).toList())
                .stream()
                .collect(Collectors.toMap(User::getUserId, Function.identity()));

        return totals.stream()
                .filter(t -> users.containsKey(t.getUserId()) && t.getSeconds() != null && t.getSeconds() > 0)
                .map(t -> new WeeklyEntry(users.get(t.getUserId()), t.getSeconds()))
                .toList();
    }

    // -------------------------------------------------------------------------
    // Profile updates
    // -------------------------------------------------------------------------

    @Transactional
    public User updateProfile(UUID userId, String displayName, String bio, UUID petId) {
        User user = getById(userId);
        user.setDisplayName(displayName);
        // Keep the cozy default rather than storing a blank bio.
        user.setBio(bio == null || bio.isBlank() ? "A cozy farm studier 🌾" : bio);
        // The user's avatar is their chosen pet, so updating the profile sets
        // pet_id. Validate it exists first to avoid a broken foreign key.
        if (petId != null) {
            if (!petRepository.existsById(petId)) {
                throw new IllegalArgumentException("Pet not found: " + petId);
            }
            user.setPetId(petId);
        }
        return user;
    }

    @Transactional
    public User changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = getById(userId);

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        return user;
    }

    // -------------------------------------------------------------------------
    // Study stats
    // -------------------------------------------------------------------------

    @Transactional
    public User recordStudySession(UUID userId, int durationSeconds) {
        User user = getById(userId);
        // Also advances the daily streak; SessionService re-evaluates badges right
        // after this, which is what unlocks Week Warrior / Unbreakable.
        user.addStudyTime(durationSeconds, streakZone);
        return user;
    }

    @Transactional
    public User updateStreak(UUID userId, int newStreak) {
        User user = getById(userId);
        user.updateStreak(newStreak);
        // A longer streak may unlock Week Warrior / Unbreakable.
        badgeService.evaluateForUser(userId);
        return user;
    }
}
