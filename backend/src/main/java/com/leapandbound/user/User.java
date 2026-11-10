package com.leapandbound.user;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id", updatable = false, nullable = false)
    private UUID userId;

    @NotBlank
    @Size(max = 32)
    @Column(name = "username", nullable = false, unique = true, length = 32)
    private String username;

    @NotBlank
    @Size(max = 64)
    @Column(name = "display_name", nullable = false, length = 64)
    private String displayName;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // A short "about me" line. Everyone starts with the cozy default.
    @Column(name = "bio", nullable = false)
    @Builder.Default
    private String bio = "A cozy farm studier 🌾";

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "pet_id")
    private UUID petId;

    @Column(name = "study_time_seconds", nullable = false)
    @Builder.Default
    private int studyTimeSeconds = 0;

    @Column(name = "sessions_done", nullable = false)
    @Builder.Default
    private int sessionsDone = 0;

    @Column(name = "current_streak", nullable = false)
    @Builder.Default
    private int currentStreak = 0;

    @Column(name = "longest_streak", nullable = false)
    @Builder.Default
    private int longestStreak = 0;

    @Column(name = "last_studied_at")
    private OffsetDateTime lastStudiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public double getTotalStudyHours() {
        return studyTimeSeconds / 3600.0;
    }

    /**
     * Credit a finished session and advance the daily streak. Days are calendar
     * days in {@code zone}: studying again the same day keeps the streak, studying
     * the very next day extends it, and any gap restarts it at 1.
     */
    public void addStudyTime(int seconds, ZoneId zone) {
        OffsetDateTime now = OffsetDateTime.now();
        LocalDate today = now.atZoneSameInstant(zone).toLocalDate();

        if (lastStudiedAt == null) {
            updateStreak(1);
        } else {
            LocalDate lastDay = lastStudiedAt.atZoneSameInstant(zone).toLocalDate();
            if (lastDay.equals(today.minusDays(1))) {
                updateStreak(currentStreak + 1);
            } else if (!lastDay.equals(today)) {
                updateStreak(1);
            } else if (currentStreak == 0) {
                updateStreak(1); // studied earlier today, before streaks were tracked
            }
        }

        this.studyTimeSeconds += seconds;
        this.sessionsDone++;
        this.lastStudiedAt = now;
    }

    public void updateStreak(int newStreak) {
        this.currentStreak = newStreak;
        if (newStreak > this.longestStreak) {
            this.longestStreak = newStreak;
        }
    }
}
