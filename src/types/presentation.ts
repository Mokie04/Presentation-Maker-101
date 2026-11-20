import type { ImageMetadata } from '@/lib/image-metadata';
import type { LessonFormat } from '@/lib/pedagogy';

export interface SubjectEvidence {
  subject: string;
  source: 'teacher-supplied' | 'keyword-detected' | 'model-generated' | 'unknown';
}

export interface SlideData {
  slideNumber: number;
  part: string;
  title: string;
  contentPoints: string[];
  visualDescription: string;
  imageMetadata?: ImageMetadata;
}

export interface PresentationData {
  /** Server-recorded generation input history; separate from model content. */
  subjectEvidence?: SubjectEvidence[];
  /** The lesson structure the deck's parts follow; Standard when absent (decks from before formats). */
  lessonFormat?: LessonFormat;
  subject: string;
  originalWriters: string;
  topic: string;
  slides: SlideData[];
}
