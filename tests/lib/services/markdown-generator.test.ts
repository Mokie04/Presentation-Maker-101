import { describe, it, expect } from 'vitest';
import { buildPresentationMarkdown } from '@/lib/services/markdown-generator';
import type { PresentationData } from '@/types/presentation';

describe('buildPresentationMarkdown', () => {
  const samplePresentation: PresentationData = {
    subject: 'Science',
    originalWriters: 'Maria Santos, Juan Dela Cruz',
    topic: 'Photosynthesis and Plant Nutrition',
    slides: [
      {
        slideNumber: 1,
        part: 'Review',
        title: 'Recap of Leaf Anatomy',
        contentPoints: [
          'Chloroplasts contain chlorophyll',
          'Stomata regulate gas exchange',
        ],
        visualDescription: 'Detailed Filipino primary school diagram of leaf cross-section',
      },
      {
        slideNumber: 2,
        part: 'Motivation',
        title: 'Why Are Plants Green?',
        contentPoints: [
          'Ask students what helps plants make food',
          'Show a pale plant versus a healthy green plant',
        ],
        visualDescription: 'Two potted plants in a sunny Philippine classroom window',
      },
    ],
  };

  it('generates a clean markdown outline matching required layout with session', () => {
    const md = buildPresentationMarkdown(samplePresentation, 'Session 1');

    expect(md).toContain('# Photosynthesis and Plant Nutrition - Session 1');
    expect(md).toContain('**Subject**: Science');
    expect(md).toContain('**Original Lesson Plan Writers**: Maria Santos, Juan Dela Cruz');
    expect(md).toContain('## Slide 1 - Review');
    expect(md).toContain('### Recap of Leaf Anatomy');
    expect(md).toContain('- Chloroplasts contain chlorophyll');
    expect(md).toContain('- Stomata regulate gas exchange');
    expect(md).toContain('*Suggested Visual:* Detailed Filipino primary school diagram of leaf cross-section');
    expect(md).toContain('## Slide 2 - Motivation');
    expect(md).toContain('---');
  });

  it('handles omitted session gracefully', () => {
    const md = buildPresentationMarkdown(samplePresentation);
    expect(md).toContain('# Photosynthesis and Plant Nutrition');
    expect(md).not.toContain('- undefined');
  });
});
