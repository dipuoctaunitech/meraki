const TOKEN_KEY = "meraki-accounts-token";
const USER_KEY = "meraki-accounts-user";
const EXPIRES_KEY = "meraki-accounts-expires";

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000/api/v1"
  );
}

export function getAccountsToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const expires = Number(localStorage.getItem(EXPIRES_KEY) || 0);
  if (!token) return null;
  if (expires && expires * 1000 < Date.now()) {
    clearAccountsSession();
    return null;
  }
  return token;
}

export function getAccountsUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}

export function clearAccountsSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getAccountsToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginAccounts(
  username: string,
  password: string
): Promise<{ username: string }> {
  const response = await fetch(`${apiBase()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    let detail = "Login failed";
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, data.username);
  localStorage.setItem(EXPIRES_KEY, String(data.expires_at));
  return { username: data.username };
}

export async function fetchAccountsMe(): Promise<string | null> {
  const token = getAccountsToken();
  if (!token) return null;
  const response = await fetch(`${apiBase()}/auth/me`, {
    headers: authHeaders()
  });
  if (!response.ok) {
    clearAccountsSession();
    return null;
  }
  const data = await response.json();
  return data.username as string;
}
