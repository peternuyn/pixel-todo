package com.meowdow.studyfarm.user;

import com.meowdow.studyfarm.pet.PetRepository;
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
    // Used to confirm a chosen pet actually exists before linking it to a user.
    private final PetRepository petRepository;

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
