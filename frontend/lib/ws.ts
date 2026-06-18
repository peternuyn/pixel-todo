"use client";

import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { getStoredUser } from "./api";

// The backend's STOMP handshake URL. We reuse the REST base (http://localhost:8080)
// and swap the scheme to ws:// (or wss:// behind TLS), then add the "/ws" endpoint
// registered in WebSocketConfig.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const WS_URL = BASE_URL.replace(/^http/, "ws") + "/ws";

// We send the logged-in user's id as a STOMP header. The backend reads it to know
// who is present in a room (there's no auth token in this app — same "client tells
// us the userId" convention used by the REST endpoints).
function userHeaders(): Record<string, string> {
  const userId = getStoredUser()?.userId;
  return userId ? { userId } : {};
}

// One active subscription this app cares about. We keep a registry of these so that
// if the socket drops and reconnects, we can re-establish every subscription
// automatically (STOMP does not do this for us).
type Registered = {
  topic: string;
  headers: Record<string, string>;
  onMessage: (data: unknown) => void;
  sub: StompSubscription | null;
};

const registry = new Set<Registered>();
let client: Client | null = null;

// Lazily create and start the single shared STOMP client. Every room channel
// (timer, presence, chat…) rides over this one connection.
function getClient(): Client {
  if (client) return client;

  const c = new Client({
    brokerURL: WS_URL,
    connectHeaders: userHeaders(),
    reconnectDelay: 3000, // auto-retry every 3s if the connection drops
  });

  // On every (re)connect, (re)subscribe everything in the registry.
  c.onConnect = () => {
    registry.forEach((entry) => {
      entry.sub = c.subscribe(
        entry.topic,
        (msg: IMessage) => deliver(entry, msg),
        entry.headers
      );
    });
  };

  c.activate();
  client = c;
  return c;
}

function deliver(entry: Registered, msg: IMessage) {
  try {
    entry.onMessage(JSON.parse(msg.body));
  } catch (err) {
    console.error("[WS] Failed to deliver message to", entry.topic, ":", err);
    // Ignore malformed frames rather than crash the UI.
  }
}

/**
 * Subscribe to one room channel, e.g. subscribeRoom(roomId, "timer", cb).
 * The callback receives the already-parsed JSON payload.
 *
 * This is the single reusable entry point: the room timer uses "timer" today, and
 * the chatbox / FarmScene will use "chat" / "presence" later with zero changes here.
 *
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeRoom<T>(
  roomId: string,
  channel: string,
  onMessage: (data: T) => void
): () => void {
  const c = getClient();
  const topic = `/topic/rooms/${roomId}/${channel}`;

  const entry: Registered = {
    topic,
    headers: userHeaders(),
    onMessage: onMessage as (data: unknown) => void,
    sub: null,
  };
  registry.add(entry);

  // If we're already connected, subscribe right away; otherwise onConnect will.
  if (c.connected) {
    entry.sub = c.subscribe(
      topic,
      (msg: IMessage) => deliver(entry, msg),
      entry.headers
    );
  }

  return () => {
    entry.sub?.unsubscribe();
    registry.delete(entry);
  };
}

/**
 * Send a message INTO the server over the open socket, e.g.
 * publishRoom(roomId, "whiteboard-live", { kind: "cursor", x, y }).
 *
 * This is the inbound counterpart to subscribeRoom. Where subscribeRoom listens on
 * "/topic/..." (messages coming OUT to everyone), this publishes to "/app/..." —
 * the prefix that routes to a backend @MessageMapping handler. The whiteboard uses
 * it for the fast, throwaway stream (cursors + the stroke being dragged) that would
 * be far too frequent to send over REST.
 *
 * Fire-and-forget: there's no response and no delivery guarantee — if a frame is
 * dropped, the next one is milliseconds away.
 */
export function publishRoom(roomId: string, channel: string, body: unknown): void {
  getClient().publish({
    destination: `/app/rooms/${roomId}/${channel}`,
    body: JSON.stringify(body),
    headers: userHeaders(),
  });
}
