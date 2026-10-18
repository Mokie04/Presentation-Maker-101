import type { ImageMetadata } from '@/lib/image-metadata';
import type { PresentationData, SlideData } from '@/types/presentation';

export interface SlideImage {
  /** `pending` means a single regeneration is in flight; `data` keeps the previous image meanwhile. */
  status: 'none' | 'pending' | 'ready' | 'failed';
  data?: string;
  metadata?: ImageMetadata;
  /** Bumped by every Image intent; async results carrying an older version are dropped. */
  version: number;
  /** Last regeneration failure, cleared by the next Image intent. */
  error?: string;
}

export interface DeckSlide {
  /** Internal identity, never reused and never sent to the server. */
  id: number;
  content: Omit<SlideData, 'imageMetadata'>;
  image: SlideImage;
}

export interface DeckState {
  presentation: Omit<PresentationData, 'slides'> | null;
  slides: DeckSlide[];
  nextSlideId: number;
}

/** Snapshot of a Slide's image version, captured when async work is requested. */
export interface ImageToken {
  slideId: number;
  version: number;
}

export type DeckAction =
  | { type: 'presentationLoaded'; presentation: PresentationData }
  | { type: 'reset' }
  | { type: 'partUpdated'; slideId: number; part: string }
  | { type: 'titleUpdated'; slideId: number; title: string }
  | { type: 'bulletUpdated'; slideId: number; bulletIndex: number; text: string }
  | { type: 'bulletAdded'; slideId: number }
  | { type: 'bulletDeleted'; slideId: number; bulletIndex: number }
  | { type: 'slideAdded' }
  | { type: 'slideDeleted'; slideId: number }
  /** `tokens[i]` pairs with `images[i]`, the batch's request position. */
  | { type: 'batchImagesResolved'; tokens: ImageToken[]; images: Record<number, string> }
  | { type: 'regenerationStarted'; slideId: number }
  | { type: 'regenerationResolved'; token: ImageToken; base64: string }
  | { type: 'regenerationFailed'; token: ImageToken; error: string }
  | { type: 'libraryImageSelected'; slideId: number; base64: string; metadata: ImageMetadata };
