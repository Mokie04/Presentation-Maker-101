import type { PresentationData } from '@/types/presentation';

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
    const points = slide.contentPoints.map((pt) => `- ${pt}`).join('\n');
    const visual = slide.visualDescription
      ? `\n\n*Suggested Visual:* ${slide.visualDescription}`
      : '';

    return `## Slide ${slide.slideNumber} - ${slide.part}
### ${slide.title}
${points}${visual}

---`;
  });

  return `${header}

${slidesMarkdown.join('\n\n')}`.trim();
}
