package com.meowdow.studyfarm.realtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Turns on WebSocket messaging for the whole app, using STOMP.
 *
 * WHAT IS WEBSOCKET? Normal HTTP is "request then response" — the browser asks,
 * the server answers, the connection closes. That's fine for loading a page, but
 * it can't PUSH: the server has no way to say "hey, someone just pressed Pause"
 * to everyone in a room. A WebSocket is a single connection that stays OPEN so
 * messages can flow BOTH ways at any time.
 *
 * WHAT IS STOMP? WebSocket on its own just moves raw bytes — it has no notion of
 * "topics" or "who should receive this". STOMP (Simple Text Oriented Messaging
 * Protocol) is a tiny convention layered on top that adds addresses called
 * "destinations" (like "/topic/rooms/123/timer") so we can publish a message and
 * have everyone SUBSCRIBED to that destination receive it. Spring gives us this
 * for free once we enable it here.
 *
 * THE TWO PREFIXES BELOW (the mental model):
 *   - "/app"   = messages coming IN from a client to a @MessageMapping handler
 *                (we don't use any yet for the timer — commands come over REST —
 *                but the chatbox later will send to "/app/rooms/{id}/chat").
 *   - "/topic" = messages going OUT from the server to all subscribers. The timer
 *                broadcasts to "/topic/rooms/{id}/timer"; presence to
 *                "/topic/rooms/{id}/presence"; chat later to ".../chat".
 *
 * OPEN/CLOSED: this config is written ONCE and never edited when we add features.
 * A new feature is just a new "/topic/rooms/{id}/<channel>" string — the broker
 * already routes anything under "/topic". That's the whole point.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    /**
     * The handshake URL. A browser opens "ws://localhost:8080/ws" once; every
     * room's timer/chat/presence then flows over that single connection.
     *
     * setAllowedOriginPatterns mirrors the CORS origin used for REST in
     * WebConfig — the WebSocket handshake is a separate code path and is NOT
     * covered by the REST CORS rules, so it must be set here too, or the browser
     * will block the connection.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins);
    }

    /**
     * Configures the message router ("broker").
     *
     * enableSimpleBroker("/topic"): use Spring's built-in IN-MEMORY broker for any
     * destination starting with "/topic". "In-memory" means it lives inside this
     * one running server — perfect for learning and a single instance. If you ever
     * scale to MULTIPLE backend servers, subscribers on server A wouldn't hear
     * broadcasts made on server B; at that point you'd swap this for a real broker
     * (e.g. RabbitMQ) with enableStompBrokerRelay(...). No other code would change.
     *
     * setApplicationDestinationPrefixes("/app"): inbound client messages addressed
     * to "/app/..." get routed to our @MessageMapping methods.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
