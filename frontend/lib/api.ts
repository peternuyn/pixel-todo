import type { Badge } from "./user";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  // 204 No Content (e.g. DELETE) has an empty body, so there's nothing to parse.
  // Calling res.json() on it would throw, so return undefined instead.
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export type UserResponse = {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  petId: string | null;
  studyTimeSeconds: number;
  totalStudyHours: number;
  sessionsDone: number;
  currentStreak: number;
  longestStreak: number;
  lastStudiedAt: string | null;
  createdAt: string;
};

export const userApi = {
  register(username: string, displayName: string, password: string) {
    return request<UserResponse>("/api/users/register", {
      method: "POST",
      body: JSON.stringify({ username, displayName, password }),
    });
  },

  login(username: string, password: string) {
    return request<UserResponse>("/api/users/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  // Fetch the latest data for one user (GET /api/users/{id}). We use this on the
  // profile page so stats stay fresh even if localStorage is out of date.
  getById(userId: string) {
    return request<UserResponse>(`/api/users/${userId}`);
  },

  // Update the editable parts of a profile (PATCH /api/users/{id}/profile).
  // petId picks the user's avatar pet; a blank bio resets to the default.
  updateProfile(userId: string, displayName: string, bio: string, petId: string | null) {
    return request<UserResponse>(`/api/users/${userId}/profile`, {
      method: "PATCH",
      body: JSON.stringify({ displayName, bio, petId }),
    });
  },
};

// ---------------------------------------------------------------------------
// Badges (achievements)
// ---------------------------------------------------------------------------

export const badgeApi = {
  // The raw badge catalog (GET /api/badges) — every badge as a "locked" entry, with
  // no per-user info. Kept for general use; the profile uses forUser() below instead.
  catalog() {
    return request<Badge[]>("/api/badges");
  },

  // A user's FULL personalized badge list (GET /api/users/{id}/badges): earned ones
  // carry an earnedAt date, locked ones carry progress toward unlocking. The backend
  // re-checks stat badges on this call, so it also backfills any already qualified.
  forUser(userId: string) {
    return request<Badge[]>(`/api/users/${userId}/badges`);
  },
};

// ---------------------------------------------------------------------------
// Pets (the avatar catalog)
// ---------------------------------------------------------------------------

// Mirrors the backend's PetController.PetResponse record.
export type PetResponse = {
  petId: string;
  petName: string;
  spriteKey: string; // e.g. "cat" -> assets/cat/cat-front.gif
  description: string | null;
};

export const petApi = {
  // The fixed catalog of choosable pets (GET /api/pets).
  list() {
    return request<PetResponse[]>("/api/pets");
  },
};

// The logged-in user we saved at login (app/login/page.tsx stores it here).
// Returns null if nobody is logged in or we're running on the server.
export function getStoredUser(): UserResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

// Mirrors the backend's RoomController.RoomResponse record.
export type RoomResponse = {
  roomId: string;
  hostId: string;
  hostName: string;
  name: string;
  description: string | null;
  capacity: number;
  totalMembers: number;
  status: string; // "public" | "private"
  isPrivate: boolean;
  isFull: boolean;
  tags: string[];
  createdAt: string;
};

// Mirrors the backend's RoomController.CreateRoomRequest record.
export type CreateRoomRequest = {
  hostId: string;
  name: string;
  description: string;
  capacity: number;
  isPrivate: boolean;
  password: string;
  tags: string[];
};

export const roomApi = {
  create(body: CreateRoomRequest) {
    return request<RoomResponse>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // Lists all rooms, public and private. Private rooms still require a password
  // to join — they're only listed here so users can find them.
  list() {
    return request<RoomResponse[]>("/api/rooms");
  },

  // Rooms a given user hosts (GET /api/rooms/host/{hostId}).
  listByHost(hostId: string) {
    return request<RoomResponse[]>(`/api/rooms/host/${hostId}`);
  },

  // Join a room (POST /api/rooms/{roomId}/join). This creates the membership
  // (belong_room) row that lets the user use the room's shared features, and
  // bumps the occupant count. It's idempotent: joining a room you're already in
  // is a no-op. For private rooms, the backend verifies the password here.
  join(roomId: string, userId: string, password?: string) {
    return request<RoomResponse>(`/api/rooms/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({ userId, password: password ?? null }),
    });
  },
};

// ---------------------------------------------------------------------------
// Room tasks (the shared per-room to-do list)
// ---------------------------------------------------------------------------

// Mirrors the backend's RoomTaskController.RoomTaskResponse record.
export type RoomTaskResponse = {
  taskId: string;
  roomId: string;
  createdBy: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
};

// Mirrors RoomTaskController.TaskEvent — the WebSocket push payload.
// Discriminated union on `type`:
//   created / updated → task is the full row, taskId mirrors task.taskId
//   deleted           → task is null,         taskId is the removed row's id
export type TaskEvent =
  | { type: "created" | "updated"; task: RoomTaskResponse; taskId: string }
  | { type: "deleted"; task: null; taskId: string };

export const roomTaskApi = {
  // All tasks in a room, oldest first (GET /api/rooms/{roomId}/tasks).
  list(roomId: string) {
    return request<RoomTaskResponse[]>(`/api/rooms/${roomId}/tasks`);
  },

  // Add a task. userId must belong to the room (the backend checks this).
  create(roomId: string, userId: string, title: string) {
    return request<RoomTaskResponse>(`/api/rooms/${roomId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ userId, title }),
    });
  },

  // Tick / un-tick a task (PATCH .../tasks/{taskId}).
  toggle(roomId: string, taskId: string, completed: boolean) {
    return request<RoomTaskResponse>(`/api/rooms/${roomId}/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
  },

  // Remove a task (DELETE .../tasks/{taskId}). Returns 204 No Content.
  remove(roomId: string, taskId: string) {
    return request<void>(`/api/rooms/${roomId}/tasks/${taskId}`, {
      method: "DELETE",
    });
  },
};

// ---------------------------------------------------------------------------
// Room chat (the shared per-room message log)
// ---------------------------------------------------------------------------

// Mirrors the backend's RoomMessageController.ChatMessageResponse record.
// `reactions` maps an emoji to the list of user ids who reacted with it, so the
// UI can show counts (array length) AND highlight the current user's own
// reactions (array.includes(myUserId)) without an extra request.
export type ChatMessageResponse = {
  messageId: string;
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
  reactions: Record<string, string[]>; // emoji -> [userId, ...]
};

// Mirrors RoomMessageController.ChatEvent — the WebSocket push payload.
// Discriminated union on `type`:
//   created  → message is the full new row, reactions null
//   reaction → message is null, messageId + reactions give the changed message's
//              fresh reaction state
export type ChatEvent =
  | { type: "created"; message: ChatMessageResponse; messageId: string; reactions: null }
  | { type: "reaction"; message: null; messageId: string; reactions: Record<string, string[]> };

export const roomMessageApi = {
  // The whole chat log, oldest first (GET /api/rooms/{roomId}/messages).
  list(roomId: string) {
    return request<ChatMessageResponse[]>(`/api/rooms/${roomId}/messages`);
  },

  // Send a message. userId must belong to the room (the backend checks this).
  send(roomId: string, userId: string, content: string) {
    return request<ChatMessageResponse>(`/api/rooms/${roomId}/messages`, {
      method: "POST",
      body: JSON.stringify({ userId, content }),
    });
  },

  // Toggle an emoji reaction on a message. Adds it if missing, removes it if the
  // user already reacted with that emoji. Returns the message's fresh reaction map.
  toggleReaction(roomId: string, messageId: string, userId: string, emoji: string) {
    return request<Record<string, string[]>>(
      `/api/rooms/${roomId}/messages/${messageId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ userId, emoji }),
      }
    );
  },
};

// ---------------------------------------------------------------------------
// Room presence (who is currently in the room)
// ---------------------------------------------------------------------------

// Mirrors the backend's PresenceEvent — fired when someone joins or leaves.
// Discriminated union on `type`.
export type PresenceEvent = {
  type: "join" | "leave";
  roomId: string;
  userId: string;
  presentCount: number;
};

export const roomPresenceApi = {
  // Snapshot of who is currently in the room (GET /api/rooms/{roomId}/presence).
  // Returns an array of user IDs. Used on FarmScene mount to bootstrap the pet list.
  snapshot(roomId: string) {
    return request<string[]>(`/api/rooms/${roomId}/presence`);
  },
};

// ---------------------------------------------------------------------------
// Room whiteboard (the shared per-room drawing surface)
// ---------------------------------------------------------------------------

// One finished pen stroke. `points` is a FLAT array [x0,y0, x1,y1, ...] of 0..1
// fractions (Konva's Line format) so it maps onto any screen size; `width` is in
// pixels. `id` is generated by the browser so the author can render it instantly.
export type WhiteboardStroke = {
  id: string;
  authorId: string;
  type: "stroke";
  color: string;
  width: number;
  points: number[];
};

// One text annotation. x/y/fontSize are 0..1 fractions of the canvas size.
export type WhiteboardText = {
  id: string;
  authorId: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
};

// Everything the backend stores is one of these. It treats them as opaque JSON, so
// adding a new variant later (e.g. images) only touches the frontend.
export type WhiteboardObject = WhiteboardStroke | WhiteboardText;

// Mirrors RoomWhiteboardController.WhiteboardEvent — the WebSocket push payload.
// Discriminated union on `type`:
//   added   → object is the new object, objectId mirrors object.id
//   removed → object is null,           objectId is the removed id
//   cleared → both null (the whole board was wiped)
export type WhiteboardEvent =
  | { type: "added"; object: WhiteboardObject; objectId: string }
  | { type: "removed"; object: null; objectId: string }
  | { type: "cleared"; object: null; objectId: null };

export const roomWhiteboardApi = {
  // The whole board, in draw order (GET /api/rooms/{roomId}/whiteboard).
  list(roomId: string) {
    return request<WhiteboardObject[]>(`/api/rooms/${roomId}/whiteboard`);
  },

  // Add a finished object. The server stores and re-broadcasts it verbatim.
  add(roomId: string, object: WhiteboardObject) {
    return request<WhiteboardObject>(`/api/rooms/${roomId}/whiteboard`, {
      method: "POST",
      body: JSON.stringify(object),
    });
  },

  // Remove one object by id (DELETE .../whiteboard/{objectId}). 204 No Content.
  remove(roomId: string, objectId: string) {
    return request<void>(`/api/rooms/${roomId}/whiteboard/${objectId}`, {
      method: "DELETE",
    });
  },

  // Wipe the whole board (DELETE .../whiteboard). 204 No Content.
  clear(roomId: string) {
    return request<void>(`/api/rooms/${roomId}/whiteboard`, {
      method: "DELETE",
    });
  },
};

// ---------------------------------------------------------------------------
// Room timer (the shared per-room Pomodoro clock)
// ---------------------------------------------------------------------------

// Mirrors the backend's RoomTimerResponse record. The same shape arrives two
// ways: as the reply to these REST calls, and as a live WebSocket push on
// /topic/rooms/{roomId}/timer. `endsAt` lets the UI run a smooth local countdown
// while RUNNING; `remainingSeconds` is what to show while IDLE/PAUSED.
export type RoomTimerResponse = {
  roomId: string;
  state: "IDLE" | "RUNNING" | "PAUSED";
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: string | null;
  updatedBy: string | null;
  updatedAt: string;
  completed: boolean; // true only on the one push sent when a clock hits 00:00
};

export const roomTimerApi = {
  // Current clock state (GET). Used on first load / reconnect to sync before live
  // WebSocket pushes take over.
  get(roomId: string) {
    return request<RoomTimerResponse>(`/api/rooms/${roomId}/timer`);
  },

  // Set the clock length in seconds (PATCH). 15/25/35-min presets or custom.
  setDuration(roomId: string, userId: string, durationSeconds: number) {
    return request<RoomTimerResponse>(`/api/rooms/${roomId}/timer`, {
      method: "PATCH",
      body: JSON.stringify({ userId, durationSeconds }),
    });
  },

  // Start / resume the clock (POST). userId must be a room member.
  start(roomId: string, userId: string) {
    return request<RoomTimerResponse>(`/api/rooms/${roomId}/timer/start`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  // Pause the clock (POST).
  pause(roomId: string, userId: string) {
    return request<RoomTimerResponse>(`/api/rooms/${roomId}/timer/pause`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  // Reset to the full configured length and stop (POST).
  reset(roomId: string, userId: string) {
    return request<RoomTimerResponse>(`/api/rooms/${roomId}/timer/reset`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },
};

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

// Mirrors the backend's SessionController.SessionResponse record.
export type SessionResponse = {
  sessionId: string;
  userId: string;
  roomId: string | null;
  roomSession: boolean;
  active: boolean;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
};

export const sessionApi = {
  // A user's past study sessions, newest first (GET /api/sessions/history/{id}).
  history(userId: string) {
    return request<SessionResponse[]>(`/api/sessions/history/${userId}`);
  },
};

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

// Mirrors the backend's TagController.TagResponse record.
export type TagResponse = {
  tagId: string;
  name: string;
  createdAt: string;
};

export const tagApi = {
  // List every tag (alphabetical) — used to suggest existing tags in the UI.
  list() {
    return request<TagResponse[]>("/api/tags");
  },

  // Create a standalone tag. Note: tags are also created implicitly when a
  // room is made with a new tag name, so the UI rarely needs to call this.
  create(name: string) {
    return request<TagResponse>("/api/tags", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
};
