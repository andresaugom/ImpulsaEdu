/**
 * Donors service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET   /api/v1/donors                    – paginated list with filters
 *  - GET   /api/v1/donors/:id                – get donor detail with donation history
 *  - POST  /api/v1/donors                    – create donor
 *  - PUT   /api/v1/donors/:id                – update donor fields
 *  - PATCH /api/v1/donors/:id/deactivate     – soft-delete donor
 *
 * donor_type values match the DB enum: 'Fisica' | 'Moral'
 */

import { APP_BASE, apiRequest } from './apiClient';
import { Donor } from '../components/donantes/donantesInterfaces';

// ── Backend response shapes ───────────────────────────────────────────────────

interface ApiDonor {
  id: string;
  name: string;
  region: string;
  donor_type: 'Fisica' | 'Moral';
  description: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  donation_count: number;
}

interface ApiDonorDonation {
  id: string;
  school_name: string;
  donation_type: 'Material' | 'Monetaria';
  amount: number | null;
  status: string;
  created_at: string;
}

export interface ApiDonorDetail extends ApiDonor {
  donations: ApiDonorDonation[];
}

interface ApiDonorsResponse {
  items: ApiDonor[];
  total: number;
  page: number;
  per_page: number;
}

export interface DonorFilters {
  name?: string;
  donor_type?: 'Fisica' | 'Moral';
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateDonorPayload {
  name: string;
  region: string;
  donor_type: 'Fisica' | 'Moral';
  description?: string;
  email?: string;
  phone?: string;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/** Maps a backend ApiDonor to the frontend Donor interface. */
function toFrontendDonor(d: ApiDonor): Donor {
  return {
    id: d.id,
    name: d.name,
    region: d.region,
    donor_type: d.donor_type,
    email: d.email,
    phone: d.phone,
    totalDonations: d.donation_count,
    status: d.is_active ? 'active' : 'inactive',
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated, optionally filtered list of donors.
 * Requires authentication.
 */
export async function fetchDonors(filters: DonorFilters = {}): Promise<{
  donors: Donor[];
  total: number;
  page: number;
}> {
  const params = new URLSearchParams();
  if (filters.name) params.set('name', filters.name);
  if (filters.donor_type) params.set('donor_type', filters.donor_type);
  if (filters.is_active !== undefined)
    params.set('is_active', String(filters.is_active));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.per_page) params.set('per_page', String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiDonorsResponse>(
    `${APP_BASE}/donors${query ? `?${query}` : ''}`
  );

  return {
    donors: data.items.map(toFrontendDonor),
    total: data.total,
    page: data.page,
  };
}

/**
 * Creates a new donor record.
 * Returns the created donor mapped to the frontend interface.
 */
export async function createDonor(payload: CreateDonorPayload): Promise<Donor> {
  const data = await apiRequest<ApiDonor>(`${APP_BASE}/donors`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return toFrontendDonor(data);
}

/**
 * Updates editable fields on an existing donor.
 * Returns the updated donor mapped to the frontend interface.
 */
export async function updateDonor(
  id: string,
  payload: Partial<CreateDonorPayload>
): Promise<Donor> {
  const data = await apiRequest<ApiDonor>(`${APP_BASE}/donors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return toFrontendDonor(data);
}

/**
 * Soft-deletes a donor by setting deleted_at on the backend.
 * This is a soft delete — the donor record is not removed.
 */
export async function deactivateDonor(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donors/${id}/deactivate`, {
    method: 'PATCH',
  });
}

/**
 * Restores a deactivated donor (clears deleted_at on the backend).
 * Requires authentication.
 */
export async function activateDonor(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donors/${id}/activate`, {
    method: 'PATCH',
  });
}

/**
 * Permanently deletes a donor record from the database.
 * Requires authentication. This action is irreversible.
 */
export async function deleteDonor(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donors/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches a single donor by id including the full donation history.
 * Requires authentication.
 */
export async function getDonor(id: string): Promise<ApiDonorDetail> {
  return apiRequest<ApiDonorDetail>(`${APP_BASE}/donors/${id}`);
}
