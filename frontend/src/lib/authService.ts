/**
 * Authentication service for ImpulsaEdu.
 *
 * Wraps the auth microservice endpoints:
 *  - POST /auth/register – create a new user account
 *  - POST /auth/login    – exchange credentials for tokens
 *  - POST /auth/logout   – revoke refresh token
 *  - GET  /auth/me       – fetch current user profile
 *
 * Tokens are persisted in localStorage via the apiClient helpers.
 */

import {
  AUTH_BASE,
  apiRequest,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from './apiClient';

export interface AuthUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
}

/**
 * Creates a new user account.
 * Role is auto-assigned by the server based on the email domain.
 * Throws ApiError (status 400) if fields are missing or email is already taken.
 */
export async function register(payload: RegisterPayload): Promise<{ message: string; user: { id: string; role: string } }> {
  return apiRequest<{ message: string; user: { id: string; role: string } }>(
    `${AUTH_BASE}/auth/register`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Authenticates the user with email/password.
 * On success the access and refresh tokens are stored in localStorage.
 * Throws ApiError (status 401) if credentials are invalid.
 */
export async function login(email: string, password: string): Promise<void> {
  const data = await apiRequest<{ accessToken: string; refreshToken: string }>(
    `${AUTH_BASE}/auth/login`,
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
  setTokens(data.accessToken, data.refreshToken);
}

/**
 * Returns the profile of the currently authenticated user.
 * The request is authenticated automatically by apiClient.
 */
export async function getMe(): Promise<AuthUser> {
  return apiRequest<AuthUser>(`${AUTH_BASE}/auth/me`);
}

/**
 * Logs out the user by revoking the refresh token on the server
 * and clearing local token storage.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiRequest(`${AUTH_BASE}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearTokens();
  }
}

/** Returns true when an access token is present in localStorage. */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
