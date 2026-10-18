import { NextResponse } from 'next/server';
import { defineRoute, PublicError } from '@/lib/api';
import { generateSlideContent } from '@/lib/providers/text-provider';
import { detectSubject } from '@/lib/utils/subject-detector';
import { SUPPORTED_SUBJECTS } from '@/lib/utils/subject-options';
import type { SubjectEvidence } from '@/types/presentation';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const VALID_SESSIONS = ['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5'];

export const POST = defineRoute({
  name: 'generate',
  failureMessage: 'Failed to generate the presentation. Please try again.',
  handler: async ({ body }) => {
    const { text, session, subject, subjectSource } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new PublicError('Field "text" is required and must be a non-empty string.', 400);
    }

    if (!session || typeof session !== 'string' || !VALID_SESSIONS.includes(session)) {
      throw new PublicError(`Field "session" is required and must be one of: ${VALID_SESSIONS.join(', ')}.`, 400);
    }

    // The new marker distinguishes an explicit teacher choice from legacy subject input.
    const hasSubjectSource = Object.prototype.hasOwnProperty.call(body, 'subjectSource');
    if (Object.prototype.hasOwnProperty.call(body, 'subjectEvidence') ||
        (hasSubjectSource && (subjectSource !== 'teacher-supplied' ||
          !SUPPORTED_SUBJECTS.some((label) => label === subject)))) {
      throw new PublicError(
        'Invalid subject provenance: use a supported subject with subjectSource "teacher-supplied"; subjectEvidence is server-recorded.',
        400
      );
    }

    const hasSubject = typeof subject === 'string' && subject.trim().length > 0;
    const resolvedSubject = hasSubject ? subject.trim() : detectSubject(text);
    const inputEvidence: SubjectEvidence = {
      subject: resolvedSubject,
      source: hasSubjectSource ? 'teacher-supplied' : hasSubject ? 'unknown' : 'keyword-detected',
    };
    const presentation = await generateSlideContent(text, session, resolvedSubject);

    // Never accept provenance from model output or replace the recorded teacher value.
    return NextResponse.json({
      ...presentation,
      subjectEvidence: [inputEvidence, { subject: presentation.subject, source: 'model-generated' }],
    }, { status: 200 });
  },
});
