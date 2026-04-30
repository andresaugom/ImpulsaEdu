/**
 * Schools service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET   /api/v1/schools              – paginated list with filters (public)
 *  - GET   /api/v1/schools/:id          – get single school (public)
 *  - POST  /api/v1/schools              – create school (authenticated)
 *  - PUT   /api/v1/schools/:id          – update school (authenticated)
 *  - PATCH /api/v1/schools/:id/archive  – archive school (authenticated)
 *
 * The API model maps directly to the DB: region, school, name, employees,
 * students, level, cct, mode, shift, address, location, category, description,
 * goal, progress, progress_pct, status ('active'|'archived').
 */

import { APP_BASE, apiRequest } from './apiClient';

// ── API response shape ────────────────────────────────────────────────────────

export interface ApiSchool {
  id: string;
  region: string;
  school: string;
  name: string;
  employees: number;
  students: number;
  level: string;
  cct: string;
  mode: string;
  shift: string;
  address: string;
  location: string;
  category: string;
  description: string | null;
  goal: number;
  progress: number;
  progress_pct: number;
  status: 'active' | 'archived';
}

interface ApiSchoolsResponse {
  items: ApiSchool[];
  total: number;
  page: number;
  per_page: number;
}

export interface SchoolFilters {
  region?: string;
  category?: string;
  status?: 'active' | 'archived';
  page?: number;
  per_page?: number;
}

export interface SchoolPayload {
  region: string;
  school: string;
  name: string;
  employees?: number;
  students?: number;
  level: string;
  cct: string;
  mode: string;
  shift: string;
  address: string;
  location: string;
  category: string;
  description?: string;
  goal: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated, optionally filtered list of schools.
 * This endpoint is public and does not require authentication.
 * Default: active schools only.
 */
export async function fetchSchools(filters: SchoolFilters = {}): Promise<{
  schools: ApiSchool[];
  total: number;
  page: number;
}> {
  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiSchoolsResponse>(
    `${APP_BASE}/schools${query ? `?${query}` : ''}`
  );

  return {
    schools: data.items,
    total: data.total,
    page: data.page,
  };
}

/**
 * Creates a new school record.
 * Requires authentication. Returns the created school.
 */
export async function createSchool(payload: SchoolPayload): Promise<ApiSchool> {
  return apiRequest<ApiSchool>(`${APP_BASE}/schools`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates editable fields on an existing school.
 * Requires authentication. Returns the updated school.
 */
export async function updateSchool(
  id: string,
  payload: Partial<SchoolPayload>
): Promise<ApiSchool> {
  return apiRequest<ApiSchool>(`${APP_BASE}/schools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Archives a school (sets deleted_at on the backend).
 * Requires authentication. Archived schools no longer appear in the
 * default active listing.
 */
export async function archiveSchool(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/schools/${id}/archive`, {
    method: 'PATCH',
  });
}

/**
 * Restores an archived school (clears deleted_at on the backend).
 * Requires authentication.
 */
export async function unarchiveSchool(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/schools/${id}/unarchive`, {
    method: 'PATCH',
  });
}

/**
 * Permanently deletes a school record from the database.
 * Requires authentication. This action is irreversible.
 */
export async function deleteSchool(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/schools/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches a single school by id.
 * This endpoint is public and does not require authentication.
 */
export async function getSchool(id: string): Promise<ApiSchool> {
  return apiRequest<ApiSchool>(`${APP_BASE}/schools/${id}`);
}
