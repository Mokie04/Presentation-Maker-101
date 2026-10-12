import type { ImageMetadata } from '@/lib/image-metadata';

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
  subject: string;
  originalWriters: string;
  topic: string;
  slides: SlideData[];
}
