/**
 * XLSX service for ImpulsaEdu.
 *
 * Wraps the app_api Excel endpoints (admin only):
 *  - POST /api/v1/xlsx/upload   – upload an .xlsx file to sync into the database
 *  - GET  /api/v1/xlsx/download – download a full database export as .xlsx
 *
 * Both endpoints use non-JSON response handling:
 *  - upload: multipart/form-data request; Content-Type must NOT be set manually
 *  - download: binary blob response; use URL.createObjectURL to trigger a download
 */

import { APP_BASE, apiFetch } from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface XlsxUploadResult {
  message: string;
  result: unknown;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Uploads an Excel (.xlsx) file to sync data into the database.
 * Requires admin authentication.
 *
 * Content-Type is intentionally omitted so the browser can set the
 * correct multipart/form-data boundary automatically.
 */
export async function uploadXlsx(file: File): Promise<XlsxUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch(`${APP_BASE}/xlsx/upload`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type here — the browser sets multipart boundary automatically.
  });

  if (!res.ok) {
    let code = 'UPLOAD_ERROR';
    try {
      const body = await res.json();
      code = body.code ?? body.error ?? code;
    } catch {
      // Non-JSON error body
    }
    throw new Error(`Upload failed (${res.status}): ${code}`);
  }

  return res.json() as Promise<XlsxUploadResult>;
}

/**
 * Downloads the full database export as an .xlsx binary blob.
 * Requires admin authentication.
 *
 * Usage example to trigger a browser download:
 *   const blob = await downloadXlsx();
 *   const url = URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = 'export.xlsx';
 *   a.click();
 *   URL.revokeObjectURL(url);
 */
export async function downloadXlsx(): Promise<Blob> {
  const res = await apiFetch(`${APP_BASE}/xlsx/download`);

  if (!res.ok) {
    let code = 'DOWNLOAD_ERROR';
    try {
      const body = await res.json();
      code = body.code ?? body.error ?? code;
    } catch {
      // Non-JSON error body
    }
    throw new Error(`Download failed (${res.status}): ${code}`);
  }

  return res.blob();
}
