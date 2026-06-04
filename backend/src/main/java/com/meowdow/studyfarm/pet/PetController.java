package com.meowdow.studyfarm.pet;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pets")
@RequiredArgsConstructor
public class PetController {

    private final PetRepository petRepository;

    record PetResponse(UUID petId, String petName, String spriteKey, String description) {
        static PetResponse from(Pet pet) {
            return new PetResponse(pet.getPetId(), pet.getPetName(), pet.getSpriteKey(), pet.getDescription());
        }
    }

    @GetMapping
    public List<PetResponse> getAllPets() {
        return petRepository.findAll().stream()
                .map(PetResponse::from)
                .toList();
    }

    @GetMapping("/{petId}")
    public PetResponse getPet(@PathVariable UUID petId) {
        return petRepository.findById(petId)
                .map(PetResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Pet not found: " + petId));
    }
}
