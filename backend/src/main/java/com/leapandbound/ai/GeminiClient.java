package com.leapandbound.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * Talks to Google's Gemini API to turn a user's question into an answer.
 *
 * WHY THIS IS A @Component
 * ------------------------
 * Marking the class @Component tells Spring to create ONE shared instance (a "bean")
 * at start-up and keep it in its container. Any other bean — here our
 * {@link com.leapandbound.roommessage.RoomMessageService} — can then ask for it in its
 * constructor and Spring "injects" this same instance. That's dependency injection:
 * we never write `new GeminiClient(...)` ourselves.
 *
 * HOW WE CALL THE API
 * -------------------
 * We use Spring's {@link RestClient}, the modern, synchronous HTTP client that ships
 * inside spring-web (already on our classpath via spring-boot-starter-web — no new
 * dependency). "Synchronous" means the call BLOCKS until Gemini replies with the full
 * answer, which is exactly what we want: the frontend animates the whole answer, so we
 * don't need streaming.
 *
 * THE REQUEST/RESPONSE SHAPE
 * --------------------------
 * Gemini speaks JSON. Rather than build/parse strings by hand, we mirror the JSON with
 * small Java `record`s (see the bottom of this file). Spring's Jackson library then
 * converts our record -> JSON on the way out, and JSON -> record on the way back,
 * matching by field name. (Spring Boot configures Jackson to ignore unknown JSON fields,
 * so extra fields Gemini sends — like "role" or "finishReason" — are harmlessly skipped.)
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    /** Shown in chat when the AI can't be reached, instead of leaking an error/stack trace. */
    private static final String FALLBACK =
            "⚠️ The AI assistant is unavailable right now. Please try again in a moment.";

    /** Keep replies short enough to sit comfortably in a chat bubble (and under the 2000-char DB bound). */
    private static final String SYSTEM_INSTRUCTION =
            "You are a friendly, concise study helper inside a group study room. "
            + "Answer the question directly in plain prose under ~1500 characters. "
            + "Do not use markdown formatting, headings, or bullet points.";

    private static final int MAX_ANSWER_CHARS = 2000;

    // Injected from application.properties (which itself reads env vars). A blank key
    // (the default) means "not configured" — we detect that and return the fallback.
    private final String apiKey;
    private final String model;
    private final RestClient restClient;

    /**
     * Spring calls this constructor at start-up, passing the two @Value properties.
     * ${gemini.api-key} has no default, so it resolves to "" when GEMINI_API_KEY is unset;
     * ${gemini.model:gemini-2.5-flash} falls back to that model name when unset.
     */
    public GeminiClient(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.5-flash}") String model) {
        this.apiKey = apiKey;
        this.model = model;

        // Give the HTTP call sane timeouts so a slow/hanging Gemini can't freeze a request
        // thread forever. Gemini can take a few seconds, so we allow a generous read timeout.
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(30));

        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .requestFactory(factory)
                .build();
    }

    /**
     * Ask Gemini a question and return its answer as plain text.
     *
     * This method NEVER throws: any problem (missing key, network error, empty reply) is
     * caught and turned into the friendly {@link #FALLBACK} string, so the chat feature
     * degrades gracefully instead of blowing up the whole request.
     */
    public String generate(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key is not configured (set GEMINI_API_KEY); returning fallback.");
            return FALLBACK;
        }

        try {
            GeminiRequest body = new GeminiRequest(
                    List.of(new Content(List.of(new Part(prompt)))),
                    new Content(List.of(new Part(SYSTEM_INSTRUCTION)))
            );

            GeminiResponse response = restClient.post()
                    // {model} is filled in from the second argument; ":generateContent" is the
                    // Gemini action for a normal (non-streaming) completion.
                    .uri("/models/{model}:generateContent", model)
                    // Gemini authenticates with the key in this header (cleaner than ?key=... in the URL).
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()          // send it; throws on a 4xx/5xx response
                    .body(GeminiResponse.class);

            String text = extractText(response);
            if (text == null || text.isBlank()) {
                log.warn("Gemini returned an empty answer for prompt: {}", prompt);
                return FALLBACK;
            }

            String trimmed = text.strip();
            return trimmed.length() > MAX_ANSWER_CHARS
                    ? trimmed.substring(0, MAX_ANSWER_CHARS)
                    : trimmed;

        } catch (Exception e) {
            // RestClient throws on non-2xx responses and on network/timeout errors.
            log.error("Gemini request failed: {}", e.getMessage());
            return FALLBACK;
        }
    }

    /** Dig the answer text out of the (possibly null/empty) nested response safely. */
    private String extractText(GeminiResponse response) {
        if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
            return null;
        }
        Content content = response.candidates().get(0).content();
        if (content == null || content.parts() == null || content.parts().isEmpty()) {
            return null;
        }
        return content.parts().get(0).text();
    }

    // -------------------------------------------------------------------------
    // JSON shapes — these records mirror Gemini's request/response bodies 1:1.
    // A `record` is Java's compact "just holds data" class: the fields, constructor,
    // getters (part.text()), equals/hashCode are all generated for us.
    // -------------------------------------------------------------------------

    /** One chunk of text. Both prompts and answers are made of parts. */
    private record Part(String text) {}

    /** A block of parts. Used for the user's message AND the systemInstruction. */
    private record Content(List<Part> parts) {}

    /** The body we POST: the conversation `contents` plus a `systemInstruction`. */
    private record GeminiRequest(List<Content> contents, Content systemInstruction) {}

    /** One answer option Gemini returns (we only use the first). */
    private record Candidate(Content content) {}

    /** The top-level response: a list of candidate answers. */
    private record GeminiResponse(List<Candidate> candidates) {}
}
