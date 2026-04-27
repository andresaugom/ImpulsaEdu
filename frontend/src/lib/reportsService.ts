/**
 * Reports service for ImpulsaEdu.
 *
 * Wraps the app_api report endpoints (admin only):
 *  - GET /api/v1/reports/donations-by-school   – aggregated stats grouped by school
 *  - GET /api/v1/reports/donations-by-donor    – aggregated stats grouped by donor
 *  - GET /api/v1/reports/pending-deliveries    – donations in approved or in_delivery state
 *  - GET /api/v1/reports/completed             – donations in completed state
 *  - GET /api/v1/reports/export?report=<type>  – download report as CSV
 *
 * Note: exportReport returns a raw CSV string. Use apiFetch + res.text() internally.
 */

import { APP_BASE, apiFetch, apiRequest } from './apiClient';
import { ApiDonationSummary } from './donationsService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DonationsBySchoolRow {
  school_id: string;
  school_name: string;
  total_monetary: number;
  total_material_value: number;
  total_donations: number;
  pending: number;
  completed: number;
}

export interface DonationsByDonorRow {
  donor_id: string;
  donor_name: string;
  total_donations: number;
  total_value: number;
  schools_supported: number;
}

export type ReportType =
  | 'donations-by-school'
  | 'donations-by-donor'
  | 'pending-deliveries'
  | 'completed';

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Returns aggregated donation stats grouped by school.
 * Optionally filter to a single school by passing school_id.
 * Requires admin authentication.
 */
export async function donationsBySchool(school_id?: string): Promise<DonationsBySchoolRow[]> {
  const params = new URLSearchParams();
  if (school_id) params.set('school_id', school_id);
  const query = params.toString();
  return apiRequest<DonationsBySchoolRow[]>(
    `${APP_BASE}/reports/donations-by-school${query ? `?${query}` : ''}`
  );
}

/**
 * Returns aggregated donation stats grouped by donor.
 * Optionally filter to a single donor by passing donor_id.
 * Requires admin authentication.
 */
export async function donationsByDonor(donor_id?: string): Promise<DonationsByDonorRow[]> {
  const params = new URLSearchParams();
  if (donor_id) params.set('donor_id', donor_id);
  const query = params.toString();
  return apiRequest<DonationsByDonorRow[]>(
    `${APP_BASE}/reports/donations-by-donor${query ? `?${query}` : ''}`
  );
}

/**
 * Returns all donations currently in state 'approved' or 'in_delivery'.
 * Requires admin authentication.
 */
export async function pendingDeliveries(): Promise<ApiDonationSummary[]> {
  return apiRequest<ApiDonationSummary[]>(`${APP_BASE}/reports/pending-deliveries`);
}

/**
 * Returns all donations with state 'completed'.
 * Requires admin authentication.
 */
export async function completedDonations(): Promise<ApiDonationSummary[]> {
  return apiRequest<ApiDonationSummary[]>(`${APP_BASE}/reports/completed`);
}

/**
 * Downloads a report as a raw CSV string.
 * Uses apiFetch + res.text() because the response is text/csv, not JSON.
 * Requires admin authentication.
 */
export async function exportReport(report: ReportType): Promise<string> {
  const res = await apiFetch(`${APP_BASE}/reports/export?report=${report}`);
  if (!res.ok) {
    let code = 'EXPORT_ERROR';
    try {
      const body = await res.json();
      code = body.code ?? body.error ?? code;
    } catch {
      // Non-JSON error body
    }
    throw new Error(`Export failed (${res.status}): ${code}`);
  }
  return res.text();
}
