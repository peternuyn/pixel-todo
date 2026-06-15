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
