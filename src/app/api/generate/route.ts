import { NextResponse } from 'next/server';
import { z } from 'zod';
import { defineRoute, PublicError } from '@/lib/api';
import { autoFitDeck } from '@/lib/auto-fit-deck';
import { generateSlideContent, TextOutputTruncatedError } from '@/lib/providers/text-provider';
import { detectSubject } from '@/lib/utils/subject-detector';
import { SESSION_OPTIONS } from '@/lib/utils/session-options';
import { SUPPORTED_SUBJECTS } from '@/lib/utils/subject-options';
import type { PresentationData, SubjectEvidence } from '@/types/presentation';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Vercel's request body limit. The lesson text has no separate cap: the model prompt forbids truncating it. */
const MAX_BODY_BYTES = 4_500_000;

// Loose so the subject provenance keys below stay visible on the raw body.
const inputSchema = z.looseObject({
  text: z.string().refine((text) => text.trim().length > 0, 'must be a non-empty string'),
  session: z.enum(SESSION_OPTIONS),
});

export const POST = defineRoute({
  name: 'generate',
  failureMessage: 'Failed to generate the presentation. Please try again.',
  input: inputSchema,
  maxBodyBytes: MAX_BODY_BYTES,
  handler: async ({ input, body }) => {
    const { text, session } = input;
    const { subject, subjectSource } = body;

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
    let generated: PresentationData;
    try {
      generated = await generateSlideContent(text, session, resolvedSubject);
    } catch (err) {
      if (err instanceof TextOutputTruncatedError) {
        throw new PublicError(
          'This lesson is too long to convert in one pass. Choose a shorter session or paste a smaller part of the lesson plan.',
          422
        );
      }
      throw err;
    }
    const presentation = autoFitDeck(generated);

    // Never accept provenance from model output or replace the recorded teacher value.
    return NextResponse.json({
      ...presentation,
      subjectEvidence: [inputEvidence, { subject: presentation.subject, source: 'model-generated' }],
    }, { status: 200 });
  },
});
