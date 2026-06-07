package com.meowdow.studyfarm.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // -------------------------------------------------------------------------
    // DTOs — request and response shapes live close to the controller that uses them
    // -------------------------------------------------------------------------

    record RegisterRequest(
            @NotBlank @Size(max = 32) String username,
            @NotBlank @Size(max = 64) String displayName,
            @NotBlank @Size(min = 8)  String password
    ) {}

    record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}

    record UpdateProfileRequest(
            @NotBlank @Size(max = 64) String displayName,
            @Size(max = 280) String bio,
            UUID petId
    ) {}

    record ChangePasswordRequest(
            @NotBlank String oldPassword,
            @NotBlank @Size(min = 8) String newPassword
    ) {}

    record RecordSessionRequest(
            @NotNull @Positive int durationSeconds
    ) {}

    record UpdateStreakRequest(
            @NotNull @Positive int streak
    ) {}

    record UserResponse(
            UUID userId,
            String username,
            String displayName,
            String bio,
            String avatarUrl,
            UUID petId,
            int studyTimeSeconds,
            double totalStudyHours,
            int sessionsDone,
            int currentStreak,
            int longestStreak,
            OffsetDateTime lastStudiedAt,
            OffsetDateTime createdAt
    ) {
        static UserResponse from(User user) {
            return new UserResponse(
                    user.getUserId(),
                    user.getUsername(),
                    user.getDisplayName(),
                    user.getBio(),
                    user.getAvatarUrl(),
                    user.getPetId(),
                    user.getStudyTimeSeconds(),
                    user.getTotalStudyHours(),
                    user.getSessionsDone(),
                    user.getCurrentStreak(),
                    user.getLongestStreak(),
                    user.getLastStudiedAt(),
                    user.getCreatedAt()
            );
        }
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest req) {
        User user = userService.register(req.username(), req.displayName(), req.password());
        return UserResponse.from(user);
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest req) {
        User user = userService.login(req.username(), req.password());
        return UserResponse.from(user);
    }

    @GetMapping("/{userId}")
    public UserResponse getUser(@PathVariable UUID userId) {
        return UserResponse.from(userService.getById(userId));
    }

    @GetMapping("/by-username/{username}")
    public UserResponse getUserByUsername(@PathVariable String username) {
        return UserResponse.from(userService.getByUsername(username));
    }

    @GetMapping("/leaderboard")
    public List<UserResponse> getLeaderboard() {
        return userService.getLeaderboard().stream()
                .map(UserResponse::from)
                .toList();
    }

    @PatchMapping("/{userId}/profile")
    public UserResponse updateProfile(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        User user = userService.updateProfile(userId, req.displayName(), req.bio(), req.petId());
        return UserResponse.from(user);
    }

    @PatchMapping("/{userId}/password")
    public UserResponse changePassword(
            @PathVariable UUID userId,
            @Valid @RequestBody ChangePasswordRequest req
    ) {
        User user = userService.changePassword(userId, req.oldPassword(), req.newPassword());
        return UserResponse.from(user);
    }

    @PostMapping("/{userId}/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse recordSession(
            @PathVariable UUID userId,
            @Valid @RequestBody RecordSessionRequest req
    ) {
        User user = userService.recordStudySession(userId, req.durationSeconds());
        return UserResponse.from(user);
    }

    @PatchMapping("/{userId}/streak")
    public UserResponse updateStreak(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateStreakRequest req
    ) {
        User user = userService.updateStreak(userId, req.streak());
        return UserResponse.from(user);
    }
}
