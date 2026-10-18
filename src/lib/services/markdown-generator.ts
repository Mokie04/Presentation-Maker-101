import type { PresentationData } from '@/types/presentation';
import { describeImageCredit } from '@/lib/image-credit';
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

    const credit = slide.imageMetadata && describeImageCredit(slide.imageMetadata);
    const credits = credit
      ? `\n\n**Selected ${credit.sourceLabel} image**\n\n` + credit.notes
        .replace(/[\\`*_{}\[\]()#+.!>|<>]/g, '\\$&').replace(/\n/g, '  \n') + `\n\n[${credit.sourceLabel} source](<${credit.sourceLink}>)`
      : '';
    const licenseLink = credit?.license?.url
      ? `\n\n[License: ${credit.license.name}](<${credit.license.url}>)` : '';

    return `## Slide ${slide.slideNumber} - ${slide.part}
### ${formatFormulaToUnicode(slide.title)}
${points}${visual}${credits}${licenseLink}

---`;
  });

  return `${header}

${slidesMarkdown.join('\n\n')}`.trim();
}
