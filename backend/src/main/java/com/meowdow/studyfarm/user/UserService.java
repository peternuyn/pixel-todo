package com.meowdow.studyfarm.user;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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

    // -------------------------------------------------------------------------
    // Profile updates
    // -------------------------------------------------------------------------

    @Transactional
    public User updateProfile(UUID userId, String displayName, String avatarUrl) {
        User user = getById(userId);
        user.setDisplayName(displayName);
        user.setAvatarUrl(avatarUrl);
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
        user.addStudyTime(durationSeconds);
        return user;
    }

    @Transactional
    public User updateStreak(UUID userId, int newStreak) {
        User user = getById(userId);
        user.updateStreak(newStreak);
        return user;
    }
}
