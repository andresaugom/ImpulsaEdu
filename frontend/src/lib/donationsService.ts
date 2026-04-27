/**
 * Donations service for ImpulsaEdu.
 *
 * Wraps the app_api endpoints:
 *  - GET   /api/v1/donations            – paginated list with filters (staff)
 *  - GET   /api/v1/donations/:id        – get full donation detail (staff)
 *  - POST  /api/v1/donations            – create a donation record (staff)
 *  - PUT   /api/v1/donations/:id        – update description/observations/delivery (staff)
 *  - PATCH /api/v1/donations/:id/state  – advance or cancel workflow state (staff)
 *
 * State machine transitions:
 *  registered → approved | cancelled
 *  approved   → in_delivery | cancelled
 *  in_delivery → delivered | cancelled
 *  delivered  → completed
 *  completed  → (terminal)
 *  cancelled  → (terminal)
 */

import { APP_BASE, apiRequest } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DonationState =
  | 'registered'
  | 'approved'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type DonationType = 'monetary' | 'material';

export interface ApiDonationSummary {
  id: string;
  donor: { id: string; full_name: string };
  school: { id: string; name: string };
  type: DonationType;
  amount: number | null;
  estimated_value: number | null;
  state: DonationState;
  delivery_mode: string | null;
  registered_at: string;
}

export interface ApiDonationDetail {
  id: string;
  donor: { id: string; full_name: string; type: 'individual' | 'corporate' };
  school: { id: string; name: string; region: string };
  type: DonationType;
  description: string | null;
  amount: number | null;
  estimated_value: number | null;
  state: DonationState;
  observations: string | null;
  delivery: {
    mode: string | null;
    shipping_address: string | null;
    tracking_info: string | null;
    notes: string | null;
  };
  timeline: {
    registered_at: string | null;
    approved_at: string | null;
    in_delivery_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
  };
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
  state?: DonationState;
  type?: DonationType;
  page?: number;
  per_page?: number;
}

export interface CreateDonationPayload {
  donor_id: string;
  school_id: string;
  type: DonationType;
  description?: string;
  amount?: number;
  estimated_value?: number;
  observations?: string;
  delivery?: {
    mode?: string;
    shipping_address?: string;
    tracking_info?: string;
    notes?: string;
  };
}

export interface UpdateDonationPayload {
  description?: string;
  observations?: string;
  delivery?: {
    mode?: string;
    shipping_address?: string;
    tracking_info?: string;
    notes?: string;
  };
}

export interface UpdateDonationStatePayload {
  state: DonationState;
  observations?: string;
}

export interface DonationStateUpdateResponse {
  id: string;
  state: DonationState;
  approved_at: string | null;
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
  if (filters.school_id) params.set('school_id', filters.school_id);
  if (filters.donor_id)  params.set('donor_id',  filters.donor_id);
  if (filters.state)     params.set('state',      filters.state);
  if (filters.type)      params.set('type',       filters.type);
  if (filters.page)      params.set('page',       String(filters.page));
  if (filters.per_page)  params.set('per_page',   String(filters.per_page));

  const query = params.toString();
  const data = await apiRequest<ApiDonationsListResponse>(
    `${APP_BASE}/donations${query ? `?${query}` : ''}`
  );
  return { items: data.items, total: data.total, page: data.page };
}

/**
 * Fetches the full detail of a single donation, including delivery info and timeline.
 * Requires authentication.
 */
export async function getDonation(id: string): Promise<ApiDonationDetail> {
  return apiRequest<ApiDonationDetail>(`${APP_BASE}/donations/${id}`);
}

/**
 * Creates a new donation record.
 * Requires authentication. The school must be active (not archived).
 */
export async function createDonation(payload: CreateDonationPayload): Promise<ApiDonationDetail> {
  return apiRequest<ApiDonationDetail>(`${APP_BASE}/donations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Updates editable fields (description, observations, delivery) on a donation.
 * Does NOT change the donation state — use updateDonationState for state transitions.
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
 * Advances or cancels the donation workflow state.
 * Returns a minimal object with id, state, and approved_at — NOT the full detail.
 *
 * Valid transitions:
 *  registered → approved | cancelled
 *  approved   → in_delivery | cancelled
 *  in_delivery → delivered | cancelled
 *  delivered  → completed
 */
export async function updateDonationState(
  id: string,
  payload: UpdateDonationStatePayload
): Promise<DonationStateUpdateResponse> {
  return apiRequest<DonationStateUpdateResponse>(`${APP_BASE}/donations/${id}/state`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
