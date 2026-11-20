import { describe, expect, it } from 'vitest';
import { NUMBERED_SESSIONS, SESSION_OPTIONS, WHOLE_LESSON, hasSessionMarkers, isWholeLesson } from '@/lib/utils/session-options';

describe('session options', () => {
  it('offers the whole lesson first, then Sessions 1 to 5', () => {
    expect(SESSION_OPTIONS).toEqual([WHOLE_LESSON, 'Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5']);
    expect(NUMBERED_SESSIONS).toEqual(['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5']);
    expect(isWholeLesson('Whole lesson')).toBe(true);
    expect(isWholeLesson('Session 1')).toBe(false);
  });
});

describe('hasSessionMarkers', () => {
  it.each([
    'SESSION 1\nReview the parts of a plant.',
    'Day 2: Activity on seeds',
    'Session #3 Assessment',
    'Second session: group work',
    '1st day - Motivation',
    'Meeting 4',
    'MONDAY\tTUESDAY\tWEDNESDAY\tTHURSDAY\tFRIDAY\nObjectives',
  ])('finds sessions or days in %j', text => {
    expect(hasSessionMarkers(text)).toBe(true);
  });

  it.each([
    'CLASSROOM OBSERVATION LESSON PLAN\nTERM 2nd\nEngage (10 minutes) Explore (20 minutes)',
    'Imagine walking from your house to school every day. On Monday you take a detour.',
    'Research applications and present findings in the next class.',
    'Teaching date 11/23/2026, Grade 7 Science',
  ])('finds none in a one-session plan: %j', text => {
    expect(hasSessionMarkers(text)).toBe(false);
  });
});
