import { describe, expect, it } from 'vitest';
import { presentationDataSchema } from '@/lib/providers/text-provider';
import { exportPresentationDataSchema } from '@/lib/schemas/presentation-export';

const deck = (parts: string[]) => ({
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: parts.map((part, i) => ({ slideNumber: i + 1, part, title: 'T', contentPoints: ['P'], visualDescription: 'V' })),
});

const raw = ['Activity', 'lesson presentation', 'Assessment/Evaluation', 'Generalization'];
const canonical = ['Activities', 'Lesson Presentation', 'Assessment', 'Generalization'];

describe('canonical part names in parsed presentations', () => {
  it('canonicalizes model output and keeps unknown parts', () => {
    expect(presentationDataSchema.parse(deck(raw)).slides.map((s) => s.part)).toEqual(canonical);
  });

  it('canonicalizes export input the same way', () => {
    expect(exportPresentationDataSchema.parse(deck(raw)).slides.map((s) => s.part)).toEqual(canonical);
  });

  it('is idempotent', () => {
    const once = exportPresentationDataSchema.parse(deck(raw));
    expect(exportPresentationDataSchema.parse(once)).toEqual(once);
  });
});
