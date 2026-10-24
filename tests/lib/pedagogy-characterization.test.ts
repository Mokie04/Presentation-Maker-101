import { describe, expect, it } from 'vitest';
import { getPartBadgeInfo } from '@/components/part-badge';
import { shouldGenerateImageForPart } from '@/lib/services/image-batch';

// Captured from the badge and batch rules before the pedagogy module existed: [part, label, bg, auto image].
const today: [string, string, string, boolean][] = [
  ["Title Page", "TITLE PAGE", "bg-indigo-600", false],
  ["Review", "1. REVIEW", "bg-amber-700", false],
  ["Motivation", "2. MOTIVATION", "bg-emerald-700", true],
  ["Lesson Presentation", "3. LESSON PRESENTATION", "bg-sky-700", true],
  ["Discussion", "4. DISCUSSION", "bg-cyan-700", true],
  ["Activities", "5. ACTIVITIES", "bg-purple-600", false],
  ["Assessment", "6. ASSESSMENT", "bg-rose-600", false],
  ["title page", "TITLE PAGE", "bg-indigo-600", false],
  ["REVIEW", "1. REVIEW", "bg-amber-700", false],
  ["motivation", "2. MOTIVATION", "bg-emerald-700", true],
  ["lesson presentation", "3. LESSON PRESENTATION", "bg-sky-700", true],
  ["DISCUSSION", "4. DISCUSSION", "bg-cyan-700", true],
  ["activities", "5. ACTIVITIES", "bg-purple-600", false],
  ["ASSESSMENT", "6. ASSESSMENT", "bg-rose-600", false],
  ["Activity", "5. ACTIVITIES", "bg-purple-600", false],
  ["Assessment/Evaluation", "6. ASSESSMENT", "bg-rose-600", false],
  ["Presentation", "3. LESSON PRESENTATION", "bg-sky-700", true],
  // Accepted change: any "presentation" is Lesson Presentation (was the raw label PRESENTATION OF RESULTS).
  ["Presentation of Results", "3. LESSON PRESENTATION", "bg-sky-700", true],
  ["Introduction", "INTRODUCTION", "bg-sky-700", false],
  // Accepted change: one rule order for badge and image, so Review wins (auto image was true via "discussion").
  ["Review of Discussion", "1. REVIEW", "bg-amber-700", false],
  ["", "SLIDE", "bg-slate-600", false],
  ["Group Discussion", "4. DISCUSSION", "bg-cyan-700", true],
  ["Motivation Activity", "2. MOTIVATION", "bg-emerald-700", true],
  ["Generalization", "GENERALIZATION", "bg-sky-700", false],
  ["Lesson Proper", "LESSON PROPER", "bg-sky-700", false],
];

describe.each(today)('part %j', (part, label, bg, autoImage) => {
  it('keeps its badge', () => {
    expect(getPartBadgeInfo(part)).toEqual({ label, bg });
  });

  it('keeps its auto-image eligibility', () => {
    expect(shouldGenerateImageForPart(part)).toBe(autoImage);
  });
});
