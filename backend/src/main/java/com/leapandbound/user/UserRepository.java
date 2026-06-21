package com.leapandbound.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    List<User> findTop10ByOrderByStudyTimeSecondsDesc();

    @Query("SELECT u FROM User u WHERE u.petId = :petId")
    Optional<User> findByPetId(UUID petId);
}
