/**
 * School Needs service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET /api/v1/schools/needs          – paginated list of all needs (public)
 *  - GET /api/v1/schools/:id/needs      – needs for a specific school (public)
 *
 * The DB table is schools_needs with fields: id, school_id, category,
 * subcategory, item_name, quantity, unit, amount, status, description.
 */

import { APP_BASE, apiRequest } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SchoolNeedStatus = 'Cubierto' | 'Aun no cubierto' | 'Cubierto parcialmente';

export interface ApiSchoolNeed {
  id: string;
  school_id: string;
  school_name: string | null;
  category: string;
  subcategory: string;
  item_name: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
  status: SchoolNeedStatus;
  description: string | null;
  created_at: string;
}

export interface SchoolNeedsFilters {
  school_id?: string;
  status?: SchoolNeedStatus;
  category?: string;
  page?: number;
  per_page?: number;
}

interface ApiSchoolNeedsResponse {
  items: ApiSchoolNeed[];
  total: number;
  page: number;
  per_page: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of all school needs with optional filters.
 */
export async function fetchSchoolNeeds(filters: SchoolNeedsFilters = {}): Promise<{
  items: ApiSchoolNeed[];
  total: number;
  page: number;
}> {
  const params = new URLSearchParams();
  if (filters.school_id) params.set('school_id', filters.school_id);
  if (filters.status)    params.set('status',    filters.status);
  if (filters.category)  params.set('category',  filters.category);
  if (filters.page)      params.set('page',      String(filters.page));
  if (filters.per_page)  params.set('per_page',  String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiSchoolNeedsResponse>(
    `${APP_BASE}/schools/needs${query ? `?${query}` : ''}`
  );
  return { items: data.items, total: data.total, page: data.page };
}

/**
 * Fetches needs for a specific school by school id.
 */
export async function fetchSchoolNeedsById(
  schoolId: string,
  filters: Omit<SchoolNeedsFilters, 'school_id'> = {}
): Promise<{ items: ApiSchoolNeed[]; total: number; page: number }> {
  const params = new URLSearchParams();
  if (filters.status)   params.set('status',   filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.page)     params.set('page',     String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiSchoolNeedsResponse>(
    `${APP_BASE}/schools/${schoolId}/needs${query ? `?${query}` : ''}`
  );
  return { items: data.items, total: data.total, page: data.page };
}
