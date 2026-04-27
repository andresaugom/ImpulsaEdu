/**
 * Users service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET   /api/v1/users          – paginated list with filters (admin only)
 *  - GET   /api/v1/users/:id      – get a single user (own id for staff, any for admin)
 *  - POST  /api/v1/users          – create user (admin only)
 *  - PUT   /api/v1/users/:id      – update full_name and/or password (own id for staff, any for admin)
 *  - PATCH /api/v1/users/:id/deactivate – soft-delete user (admin only)
 */

import { APP_BASE, apiRequest } from './apiClient';

// ── Backend response shapes ───────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
}

interface ApiUsersListResponse {
  items: ApiUser[];
  total: number;
}

// ── Exported payload / filter types ──────────────────────────────────────────

export interface UserFilters {
  role?: 'admin' | 'staff';
  is_active?: boolean;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'staff';
}

export interface UpdateUserPayload {
  full_name?: string;
  password?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetches all users with optional role/is_active filters.
 * Requires admin authentication.
 */
export async function fetchUsers(filters: UserFilters = {}): Promise<{
  items: ApiUser[];
  total: number;
}> {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));

  const query = params.toString();
  return apiRequest<ApiUsersListResponse>(
    `${APP_BASE}/users${query ? `?${query}` : ''}`
  );
}

/**
 * Fetches a single user by id.
 * Staff can only access their own profile; admins can access any.
 */
export async function getUser(id: string): Promise<ApiUser> {
  return apiRequest<ApiUser>(`${APP_BASE}/users/${id}`);
}

/**
 * Creates a new NGO user.
 * Requires admin authentication.
 */
export async function createUser(payload: CreateUserPayload): Promise<ApiUser> {
  return apiRequest<ApiUser>(`${APP_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates a user's full_name and/or password.
 * Staff can only update their own profile; admins can update any.
 */
export async function updateUser(id: string, payload: UpdateUserPayload): Promise<ApiUser> {
  return apiRequest<ApiUser>(`${APP_BASE}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Soft-deletes a user by setting deleted_at on the backend (is_active = false).
 * Requires admin authentication.
 */
export async function deactivateUser(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/users/${id}/deactivate`, {
    method: 'PATCH',
  });
}
