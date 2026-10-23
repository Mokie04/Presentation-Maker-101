import type { CommonsImageCandidate } from '@/lib/providers/commons-provider';
import type { NasaImageCandidate } from '@/lib/providers/nasa-provider';
import { imageSourceLabel, type ImageSource, type ImageSourceLabel } from '@/lib/image-credit';

export type { ImageSource } from '@/lib/image-credit';
export type ImageCandidate = (NasaImageCandidate & { source: 'nasa'; selectable: true }) | CommonsImageCandidate;

export const IMAGE_LIBRARIES: Record<ImageSource, { label: ImageSourceLabel; basePath: string }> = {
  nasa: { label: imageSourceLabel('nasa'), basePath: '/api/nasa-images' },
  commons: { label: imageSourceLabel('commons'), basePath: '/api/commons-images' },
};

export function candidateId(candidate: ImageCandidate): string | number {
  return candidate.source === 'commons' ? candidate.fileId : candidate.nasaId;
}

export function selectRequestBody(candidate: ImageCandidate): { nasaId: string } | { fileId: number } {
  return candidate.source === 'commons' ? { fileId: candidate.fileId } : { nasaId: candidate.nasaId };
}
