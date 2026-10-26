import type { PresentationData } from '@/types/presentation';
import type { SupportedSubject } from '@/lib/utils/subject-options';

interface GenerationInput {
  text: string;
  session: string;
  subject?: SupportedSubject;
}

/** Shared upload/session request policy. The caller commits only a live, successful result. */
export async function generatePresentation(
  { text, session, subject }: GenerationInput,
  signal: AbortSignal,
  onStage: (stage: string) => void = () => {},
): Promise<PresentationData> {
  signal.throwIfAborted();
  onStage('Analyzing curriculum & instructional structure...');
  const stageTimer1 = setTimeout(() => {
    if (!signal.aborted) onStage('Architecting 25+ comprehensive slides (Review, Motivation, Lesson, Discussion, Activities, Assessment)...');
  }, 1200);
  const stageTimer2 = setTimeout(() => {
    if (!signal.aborted) onStage('Synthesizing Philippine pedagogical diagrams and questions...');
  }, 3500);
  try {
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ text, session, ...(subject ? { subject, subjectSource: 'teacher-supplied' } : {}) }),
    });
    signal.throwIfAborted();
    const resText = await res.text();
    // Fetch stubs/proxies may finish their body after cancellation. Never map or commit it.
    signal.throwIfAborted();
    let data: PresentationData & { error?: string };
    try {
      data = JSON.parse(resText) as PresentationData & { error?: string };
    } catch {
      if (res.status === 504 || resText.includes('FUNCTION_INVOCATION_TIMEOUT') || resText.toLowerCase().includes('timeout')) {
        throw new Error('The presentation generation timed out. Generating 25+ comprehensive slides can take longer than the server limit. Please try again with a focused section or retry shortly.');
      }
      throw new Error(resText.slice(0, 150) || `Server error (${res.status})`);
    }
    if (!res.ok) throw new Error(data?.error || 'Failed to generate presentation slides.');
    return data;
  } finally {
    clearTimeout(stageTimer1);
    clearTimeout(stageTimer2);
  }
}
