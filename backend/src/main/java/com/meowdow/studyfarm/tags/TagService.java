package com.meowdow.studyfarm.tags;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * The service layer holds the BUSINESS LOGIC — the rules about what is and isn't
 * allowed (e.g. "tags must be unique", "names get normalised"). Controllers stay
 * thin and just translate HTTP <-> service calls; repositories just do raw DB
 * access. Keeping logic here means it can be reused and tested without HTTP.
 *
 * @Service marks this as a Spring-managed bean so it can be injected elsewhere.
 * @RequiredArgsConstructor (Lombok) generates a constructor for every `final`
 * field below — that's how Spring injects the repository ("dependency injection").
 */
@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Creates a new tag from raw user input.
     *
     * Steps:
     *  1. Normalise the name (trim + lowercase) so "Focus", " focus " and "focus"
     *     are all treated as the same tag. This prevents near-duplicate clutter.
     *  2. Reject blank input early.
     *  3. Reject duplicates — we throw IllegalArgumentException, matching how the
     *     rest of this codebase signals "bad request" (see UserService).
     *  4. Build and save the entity; save() returns the persisted Tag (now with
     *     its generated tagId and createdAt filled in).
     */
    public Tag createTag(String rawName) {
        String name = normalise(rawName);

        if (name.isBlank()) {
            throw new IllegalArgumentException("Tag name cannot be blank");
        }
        if (name.length() > 32) {
            throw new IllegalArgumentException("Tag name must be 32 characters or fewer");
        }
        if (tagRepository.existsByName(name)) {
            throw new IllegalArgumentException("Tag already exists: " + name);
        }

        Tag tag = Tag.builder()
                .name(name)
                .build();

        return tagRepository.save(tag);
    }

    /**
     * Returns the tag with the given name if it exists, otherwise creates it.
     * Useful when attaching tags to a room: the caller just hands us a name and
     * doesn't care whether it's new. ("get or create" / "upsert" pattern.)
     */
    public Tag getOrCreate(String rawName) {
        String name = normalise(rawName);
        return tagRepository.findByName(name)
                .orElseGet(() -> createTag(name));
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    public Tag getById(UUID tagId) {
        return tagRepository.findById(tagId)
                .orElseThrow(() -> new IllegalArgumentException("Tag not found: " + tagId));
    }

    public List<Tag> getAllTags() {
        return tagRepository.findAllByOrderByNameAsc();
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public void deleteTag(UUID tagId) {
        Tag tag = getById(tagId); // throws if it doesn't exist
        tagRepository.delete(tag);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Trim surrounding whitespace and lowercase so tags are consistent. */
    private String normalise(String rawName) {
        if (rawName == null) {
            return "";
        }
        return rawName.trim().toLowerCase();
    }
}
