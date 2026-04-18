/**
 * Central HTTP client for ImpulsaEdu APIs.
 *
 * Handles:
 *  - Base URL resolution for the auth service (port 3000) and app_api (port 4000)
 *  - JWT attachment via Authorization: Bearer header
 *  - Automatic token refresh on 401 responses (single retry)
 *  - Typed error responses via ApiError
 */

export const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000';
export const APP_BASE =
  `${process.env.NEXT_PUBLIC_APP_API_URL ?? 'http://localhost:4000'}/api/v1`;

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * Attempts to get a new access token using the stored refresh token.
 * Returns true on success and updates localStorage; false on failure.
 */
async function tryRefreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

/**
 * Wraps native fetch to attach the access token header and transparently
 * retry once after refreshing credentials on a 401 response.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) return apiFetch(url, options, false);
    throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again.');
  }

  return res;
}

/**
 * Performs an authenticated request and parses the JSON body.
 * Throws ApiError for non-2xx responses.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(url, options);

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      code = body.code ?? body.error ?? code;
      message = body.message ?? body.error ?? message;
    } catch {
      // Non-JSON error body — keep defaults
    }
    throw new ApiError(res.status, code, message);
  }

  return res.json() as Promise<T>;
}
