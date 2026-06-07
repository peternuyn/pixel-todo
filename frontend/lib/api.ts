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

  return res.json() as Promise<T>;
}

export type UserResponse = {
  userId: string;
  username: string;
  displayName: string;
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
