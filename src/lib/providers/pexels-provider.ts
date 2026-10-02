import { env } from '@/lib/env';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    landscape: string;
  };
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

export interface PexelsFetchOptions {
  apiKey?: string;
  title?: string;
  fetchFn?: typeof fetch;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'showing', 'depicting', 'featuring',
  'high-quality', 'bright', 'friendly', 'cartoon', 'illustration', 'vector',
  'graphic', 'filipino', 'philippine', 'primary', 'school', 'educational',
  'environment', 'classroom', 'pupils', 'students', 'teacher', 'children',
  'deped', 'detailed', 'step-by-step', 'visual', 'design', 'drawing', 'art',
  'image', 'picture', 'photo', 'clean', 'simple', 'cute'
]);

/**
 * Clean complex AI visual descriptions into concise keywords for Pexels search.
 */
export function extractSearchKeywords(description: string, fallbackTitle?: string): string {
  const cleanTitle = (fallbackTitle || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 3)
    .join(' ');

  if (!description || description.trim().length === 0) {
    return cleanTitle.length > 0 ? cleanTitle : 'classroom education';
  }

  // Normalize words
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Take the most specific 2-4 content words
  if (words.length >= 2) {
    return words.slice(0, 4).join(' ');
  }

  if (cleanTitle.length > 0) {
    return cleanTitle;
  }

  return words.length === 1 ? words[0] : 'education science classroom';
}

/**
 * Query Pexels API for a landscape photo matching the keywords.
 */
export async function searchPexelsPhoto(
  query: string,
  options?: PexelsFetchOptions
): Promise<string | null> {
  const apiKey = options?.apiKey ?? env.pexels?.apiKey;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('PEXELS_API_KEY is not configured.');
  }

  const customFetch = options?.fetchFn ?? fetch;
  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;

  const response = await customFetch(endpoint, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels API request failed (${response.status}): ${response.statusText}`);
  }

  const data = (await response.json()) as PexelsSearchResponse;
  const firstPhoto = data.photos?.[0];

  if (firstPhoto) {
    return firstPhoto.src.large2x || firstPhoto.src.large || firstPhoto.src.medium || firstPhoto.src.original;
  }

  // If initial search returned 0 results, retry with first 2 words or a broader term
  const parts = query.split(' ');
  if (parts.length > 2) {
    const broaderQuery = parts.slice(0, 2).join(' ');
    const fallbackEndpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(broaderQuery)}&per_page=1&orientation=landscape`;
    const fallbackRes = await customFetch(fallbackEndpoint, {
      headers: { Authorization: apiKey },
    });
    if (fallbackRes.ok) {
      const fallbackData = (await fallbackRes.json()) as PexelsSearchResponse;
      const fallbackPhoto = fallbackData.photos?.[0];
      if (fallbackPhoto) {
        return fallbackPhoto.src.large || fallbackPhoto.src.medium;
      }
    }
  }

  return null;
}

/**
 * Search Pexels and return a base64 encoded image string compatible with slide generation.
 */
export async function fetchPexelsImageBase64(
  description: string,
  options?: PexelsFetchOptions
): Promise<string> {
  const query = extractSearchKeywords(description, options?.title);
  const imageUrl = await searchPexelsPhoto(query, options);

  if (!imageUrl) {
    throw new Error(`No Pexels photos found for query: "${query}"`);
  }

  const customFetch = options?.fetchFn ?? fetch;
  const imageRes = await customFetch(imageUrl);

  if (!imageRes.ok) {
    throw new Error(`Failed to download image from Pexels: ${imageRes.statusText}`);
  }

  const buffer = await imageRes.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
