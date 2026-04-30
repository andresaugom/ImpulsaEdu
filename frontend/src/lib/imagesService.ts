import { APP_BASE } from './apiClient';

interface ImagesResponse {
  cct: string;
  urls: string[];
}

/**
 * Fetches browser-displayable image URLs for a school identified by its CCT code.
 * Returns an empty array if no images are found or the request fails.
 * This endpoint is public and does not require authentication.
 */
export async function fetchSchoolImages(cct: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${APP_BASE}/images?cct=${encodeURIComponent(cct)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data: ImagesResponse = await res.json();
    return data.urls ?? [];
  } catch {
    return [];
  }
}
