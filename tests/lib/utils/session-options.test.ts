import { describe, expect, it } from 'vitest';
import { NUMBERED_SESSIONS, SESSION_OPTIONS, WHOLE_LESSON, hasSessionMarkers, isWholeLesson, replacesMostOf } from '@/lib/utils/session-options';

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
    'LUNES\tMARTES\tMIYERKULES\tHUWEBES\tBIYERNES\nLayunin',
    'Unang Araw: Balik-aral',
    'Ikaapat na Sesyon',
    'Araw 2 - Pagtataya',
    'Objectives\n  Day 1: Review the parts of a plant',
    'Grade 7\tSession 1\tSession 2',
    'Grade 7 MONDAY TUESDAY WEDNESDAY THURSDAY FRIDAY',
    'Learning Area Lunes Martes Miyerkules',
    'Objectives Session 1 Session 2 Session 3',
    'I. Day 1: Review\nII. Day 2: Activity',
    'A) Session 2 Group work',
    '• Day 3 – Assessment',
    '1. Araw 1 - Balik-aral',
    'IV. Day 4: Application',
  ])('finds sessions or days in %j', text => {
    expect(hasSessionMarkers(text)).toBe(true);
  });

  it.each([
    'CLASSROOM OBSERVATION LESSON PLAN\nTERM 2nd\nEngage (10 minutes) Explore (20 minutes)',
    'Imagine walking from your house to school every day. On Monday you take a detour.',
    'Research applications and present findings in the next class.',
    'Teaching date 11/23/2026, Grade 7 Science',
    'Monday and Lunes name the same day; with Friday that is only two days.',
    'Record the height of the plant on Day 1 and Day 3.',
    'Explore (20 minutes)\nCompare your notes from Session 2 of the club.',
    'On Monday, Tuesday and Wednesday we watered the plants.',
    'The first day of school is fun.',
    'We watered the plants on Monday and Tuesday and Wednesday.',
    'Compare Day 1 and Day 3 in your table.',
    'Results: see Day 1, then Day 2.',
    'Day 1 and the plants grew taller by Day 3.',
    'First day of the week we planted seeds.',
    'Monday Monday Monday',
    'Day 1  and the plants grew taller.',
    'We compared the height on Day 1\nDay 3 was rainy, so we waited.',
  ])('finds none in a one-session plan: %j', text => {
    expect(hasSessionMarkers(text)).toBe(false);
  });
});

describe('replacesMostOf', () => {
  const plan = 'DAILY LESSON LOG\nSession 1: Review of plant parts\nSession 2: Group activity on seeds';
  it.each([
    ['a typo fix', plan, plan.replace('seeds', 'seed'), false],
    ['an added line', plan, `${plan}\nSession 3: Assessment`, false],
    ['a different plan', plan, 'WEEKLY PLAN\nDay 1: Motion\nDay 2: Forces and friction in daily life', true],
    ['text in an empty box', '', plan, true],
    ['a whole plan added to a short leftover', 'Notes', `Notes\n${plan}`, true],
  ])('%s', (_name, before, after, expected) => {
    expect(replacesMostOf(before, after)).toBe(expected);
  });
});
