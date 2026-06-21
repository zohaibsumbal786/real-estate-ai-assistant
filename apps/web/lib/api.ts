export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
  };
  organization: {
    id: string;
    name: string;
  };
};

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem("dubai-ai-session");
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem("dubai-ai-session", JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem("dubai-ai-session");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
) {
  const session = getStoredSession();
  const token = options.token ?? session?.accessToken;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new Error(body?.error?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

type AuthResponse = {
  tokens: { accessToken: string; refreshToken: string };
  user: AuthSession["user"];
  organization: AuthSession["organization"];
};

function normalizeSession(response: AuthResponse): AuthSession {
  return {
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
    user: response.user,
    organization: response.organization
  };
}

export async function login(email: string, password: string) {
  const response = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return normalizeSession(response);
}

export async function register(input: {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}) {
  const response = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return normalizeSession(response);
}
