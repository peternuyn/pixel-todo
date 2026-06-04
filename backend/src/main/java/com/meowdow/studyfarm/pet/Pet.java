package com.meowdow.studyfarm.pet;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "pets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pet {

    // No @GeneratedValue — IDs are fixed in seed.sql so they're stable everywhere
    @Id
    @Column(name = "pet_id", updatable = false, nullable = false)
    private UUID petId;

    @Column(name = "pet_name", nullable = false, length = 64)
    private String petName;

    // Matches the frontend asset filename prefix, e.g. "cat" → cat-walk.gif, "cow" → cow-walk.gif
    @Column(name = "sprite_key", nullable = false, unique = true, length = 64)
    private String spriteKey;

    @Column(name = "description")
    private String description;
}
