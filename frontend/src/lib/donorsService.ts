/**
 * Donors service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET   /api/v1/donors          – paginated list with filters
 *  - POST  /api/v1/donors          – create donor
 *  - PUT   /api/v1/donors/:id      – update donor fields
 *  - PATCH /api/v1/donors/:id/deactivate – deactivate donor
 *
 * Adapts the backend field names (full_name, is_active, donation_count)
 * to the frontend Donor interface (name, status, totalDonations).
 */

import { APP_BASE, apiRequest } from './apiClient';
import { Donor } from '../components/donantes/donantesInterfaces';

// ── Backend response shapes ───────────────────────────────────────────────────

interface ApiDonor {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  type: 'individual' | 'corporate';
  tax_id: string | null;
  organization_name: string | null;
  notes: string | null;
  is_active: boolean;
  donation_count: number;
}

interface ApiDonorDonation {
  id: string;
  school_name: string;
  type: 'monetary' | 'material';
  amount: number | null;
  state: string;
  registered_at: string;
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
  type?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateDonorPayload {
  full_name: string;
  email: string;
  type: 'individual' | 'corporate';
  phone?: string;
  organization_name?: string;
  tax_id?: string;
  notes?: string;
}

// ── Adapter ───────────────────────────────────────────────────────────────────

/** Maps a backend ApiDonor to the frontend Donor interface. */
function toFrontendDonor(d: ApiDonor): Donor {
  return {
    id: d.id,
    name: d.full_name,
    type: d.type,
    email: d.email,
    phone: d.phone ?? '',
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
  if (filters.type) params.set('type', filters.type);
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
 * Deactivates a donor (sets is_active = false on the backend).
 * This is a soft delete — the donor record is not removed.
 */
export async function deactivateDonor(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donors/${id}/deactivate`, {
    method: 'PATCH',
  });
}

/**
 * Fetches a single donor by id including the full donation history.
 * Requires authentication.
 */
export async function getDonor(id: string): Promise<ApiDonorDetail> {
  return apiRequest<ApiDonorDetail>(`${APP_BASE}/donors/${id}`);
}
