/**
 * Donations service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET   /api/v1/donations              – paginated list with filters (staff)
 *  - GET   /api/v1/donations/:id          – get full donation detail (staff)
 *  - POST  /api/v1/donations              – create a donation record (staff)
 *  - PUT   /api/v1/donations/:id          – update description (staff)
 *  - PATCH /api/v1/donations/:id/status   – advance or cancel workflow status (staff)
 *
 * Status machine transitions (Spanish DB enum values):
 *  Registrado → Aprobado | Cancelado
 *  Aprobado   → Entregando | Cancelado
 *  Entregando → Entregado | Cancelado
 *  Entregado  → Finalizado
 *  Finalizado → (terminal)
 *  Cancelado  → (terminal)
 */

import { APP_BASE, apiRequest } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DonationStatus =
  | 'Registrado'
  | 'Aprobado'
  | 'Entregando'
  | 'Entregado'
  | 'Finalizado'
  | 'Cancelado';

export type DonationType = 'Material' | 'Monetaria';

export interface DonationItem {
  id?: string;
  item_name: string;
  quantity: number;
  amount: number | null;
}

export interface ApiDonationSummary {
  id: string;
  donor: { id: string; name: string };
  school: { id: string; name: string };
  donation_type: DonationType;
  amount: number | null;
  status: DonationStatus;
  created_at: string;
}

export interface ApiDonationDetail {
  id: string;
  donor: { id: string; name: string; donor_type: 'Fisica' | 'Moral' };
  school: { id: string; name: string; region: string };
  donation_type: DonationType;
  description: string | null;
  amount: number | null;
  status: DonationStatus;
  items: DonationItem[];
  created_at: string;
  updated_at: string | null;
}

interface ApiDonationsListResponse {
  items: ApiDonationSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface DonationFilters {
  school_id?: string;
  donor_id?: string;
  status?: DonationStatus;
  donation_type?: DonationType;
  is_archived?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateDonationPayload {
  donor_id: string;
  school_id: string;
  donation_type: DonationType;
  description?: string;
  amount?: number;
  items?: Omit<DonationItem, 'id'>[];
}

export interface UpdateDonationPayload {
  description?: string;
  amount?: number;
  items?: Omit<DonationItem, 'id'>[];
}

export interface UpdateDonationStatusPayload {
  status: DonationStatus;
}

export interface DonationStatusUpdateResponse {
  id: string;
  status: DonationStatus;
  updated_at: string | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated, optionally filtered list of donations.
 * Requires authentication.
 */
export async function fetchDonations(filters: DonationFilters = {}): Promise<{
  items: ApiDonationSummary[];
  total: number;
  page: number;
}> {
  const params = new URLSearchParams();
  if (filters.school_id)    params.set('school_id',    filters.school_id);
  if (filters.donor_id)     params.set('donor_id',     filters.donor_id);
  if (filters.status)       params.set('status',       filters.status);
  if (filters.donation_type) params.set('donation_type', filters.donation_type);
  if (filters.is_archived !== undefined) params.set('is_archived', String(filters.is_archived));
  if (filters.page)         params.set('page',         String(filters.page));
  if (filters.per_page)     params.set('per_page',     String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiDonationsListResponse>(
    `${APP_BASE}/donations${query ? `?${query}` : ''}`
  );
  return { items: data.items, total: data.total, page: data.page };
}

/**
 * Fetches the full detail of a single donation, including items.
 * Requires authentication.
 */
export async function getDonation(id: string): Promise<ApiDonationDetail> {
  return apiRequest<ApiDonationDetail>(`${APP_BASE}/donations/${id}`);
}

/**
 * Creates a new donation record.
 * Requires authentication. The school must be active (not archived).
 */
export async function createDonation(
  payload: CreateDonationPayload
): Promise<ApiDonationDetail> {
  return apiRequest<ApiDonationDetail>(`${APP_BASE}/donations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates editable fields (description, amount, items) on a donation.
 * Does NOT change the donation status — use updateDonationStatus for transitions.
 */
export async function updateDonation(
  id: string,
  payload: UpdateDonationPayload
): Promise<ApiDonationDetail> {
  return apiRequest<ApiDonationDetail>(`${APP_BASE}/donations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Advances or cancels the donation workflow status.
 * Returns a minimal object with id, status, and updated_at.
 *
 * Valid transitions:
 *  Registrado → Aprobado | Cancelado
 *  Aprobado   → Entregando | Cancelado
 *  Entregando → Entregado | Cancelado
 *  Entregado  → Finalizado
 */
export async function updateDonationStatus(
  id: string,
  payload: UpdateDonationStatusPayload
): Promise<DonationStatusUpdateResponse> {
  return apiRequest<DonationStatusUpdateResponse>(
    `${APP_BASE}/donations/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Archives a donation (soft delete).
 * Requires authentication.
 */
export async function archiveDonation(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donations/${id}/archive`, {
    method: 'PATCH',
  });
}

/**
 * Restores an archived donation.
 * Requires authentication.
 */
export async function unarchiveDonation(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donations/${id}/unarchive`, {
    method: 'PATCH',
  });
}

/**
 * Permanently deletes a donation record from the database.
 * Requires authentication. This action is irreversible.
 */
export async function deleteDonation(id: string): Promise<void> {
  await apiRequest<{ message: string }>(`${APP_BASE}/donations/${id}`, {
    method: 'DELETE',
  });
}
