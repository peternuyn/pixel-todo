package com.leapandbound.tags;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The controller is the HTTP layer: it maps incoming web requests to Java method
 * calls and turns the returned objects back into JSON.
 *
 * @RestController          = @Controller + @ResponseBody, i.e. "every method
 *                            returns data (JSON), not an HTML page name".
 * @RequestMapping("/api/tags") sets the base URL; the methods below add to it.
 * @RequiredArgsConstructor injects TagService via the generated constructor.
 */
@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    // -------------------------------------------------------------------------
    // DTOs (Data Transfer Objects)
    //
    // We never expose JPA entities directly over HTTP. Instead we use small
    // `record` types that define EXACTLY what comes in and goes out. This keeps
    // the API stable even if the entity changes, and lets us attach validation.
    // A `record` is a concise, immutable data carrier (Java 16+).
    // -------------------------------------------------------------------------

    /** Shape of the JSON body the client must POST to create a tag. */
    record CreateTagRequest(
            @NotBlank @Size(max = 32) String name
    ) {}

    /** Shape of the JSON we send back to the client for a tag. */
    record TagResponse(
            UUID tagId,
            String name,
            OffsetDateTime createdAt
    ) {
        // Maps an entity -> response DTO. Static factory keeps the conversion
        // in one place (same pattern as RoomResponse.from / UserResponse.from).
        static TagResponse from(Tag tag) {
            return new TagResponse(
                    tag.getTagId(),
                    tag.getName(),
                    tag.getCreatedAt()
            );
        }
    }

    // -------------------------------------------------------------------------
    // Endpoints
    // -------------------------------------------------------------------------

    /**
     * POST /api/tags  — create a new tag.
     *
     * @Valid tells Spring to run the validation annotations on CreateTagRequest
     *   (e.g. @NotBlank) before our code runs; invalid input -> 400 automatically.
     * @RequestBody binds the JSON body to the record.
     * @ResponseStatus(CREATED) makes a successful create return HTTP 201, the
     *   conventional status for "a new resource was created".
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TagResponse createTag(@Valid @RequestBody CreateTagRequest req) {
        Tag tag = tagService.createTag(req.name());
        return TagResponse.from(tag);
    }

    /**
     * GET /api/tags — list every tag, alphabetically.
     * .stream().map(...).toList() converts List<Tag> -> List<TagResponse>.
     */
    @GetMapping
    public List<TagResponse> getAllTags() {
        return tagService.getAllTags().stream()
                .map(TagResponse::from)
                .toList();
    }

    /**
     * GET /api/tags/{tagId} — fetch one tag by id.
     * @PathVariable pulls {tagId} out of the URL and converts it to a UUID.
     */
    @GetMapping("/{tagId}")
    public TagResponse getTag(@PathVariable UUID tagId) {
        return TagResponse.from(tagService.getById(tagId));
    }

    /**
     * DELETE /api/tags/{tagId} — remove a tag.
     * Returns 204 No Content: success, but there's nothing to send back.
     */
    @DeleteMapping("/{tagId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTag(@PathVariable UUID tagId) {
        tagService.deleteTag(tagId);
    }
}
