import type { PresentationData } from '@/types/presentation';
import { imageSourceNotes } from '@/lib/image-metadata';
import { formatFormulaToUnicode } from '@/lib/utils/formula-parser';

export function buildPresentationMarkdown(
  presentationData: PresentationData,
  session?: string
): string {
  const headerTitle = session?.trim()
    ? `# ${presentationData.topic} - ${session.trim()}`
    : `# ${presentationData.topic}`;

  const header = `${headerTitle}

**Subject**: ${presentationData.subject}
**Original Lesson Plan Writers**: ${presentationData.originalWriters}`;

  const slidesMarkdown = presentationData.slides.map((slide) => {
    const points = slide.contentPoints.map((pt) => `- ${formatFormulaToUnicode(pt)}`).join('\n');
    const visual = slide.visualDescription
      ? `\n\n*Suggested Visual:* ${slide.visualDescription}`
      : '';

    const credits = slide.imageMetadata
      ? '\n\n**Selected NASA image**\n\n' + imageSourceNotes(slide.imageMetadata)
        .replace(/[\\`*_{}\[\]()#+.!>|<>]/g, '\\$&').replace(/\n/g, '  \n') + `\n\n[NASA source](<${slide.imageMetadata.sourceUrl ?? slide.imageMetadata.assetUrl}>)`
      : '';

    return `## Slide ${slide.slideNumber} - ${slide.part}
### ${formatFormulaToUnicode(slide.title)}
${points}${visual}${credits}

---`;
  });

  return `${header}

${slidesMarkdown.join('\n\n')}`.trim();
}
