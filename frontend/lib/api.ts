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
};
