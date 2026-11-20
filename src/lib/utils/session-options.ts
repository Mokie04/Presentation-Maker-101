/** The choice for a lesson plan taught in one class session, such as a demonstration or classroom observation lesson. */
export const WHOLE_LESSON = 'Whole lesson';

/** Curriculum session labels, shared by the session picker and request validation. */
export const SESSION_OPTIONS = [
  WHOLE_LESSON,
  'Session 1',
  'Session 2',
  'Session 3',
  'Session 4',
  'Session 5',
] as const;

export type SessionOption = typeof SESSION_OPTIONS[number];

/** The numbered sessions of a multi-day plan, in order. */
export const NUMBERED_SESSIONS = SESSION_OPTIONS.filter(
  (session): session is Exclude<SessionOption, typeof WHOLE_LESSON> => session !== WHOLE_LESSON,
);

export function isWholeLesson(session: string): boolean {
  return session === WHOLE_LESSON;
}

// English and Filipino labels: "Session 2", "Day 1", "Araw 3", "Sesyon 1".
const NUMBERED_MARKER = /\b(?:session|day|meeting|araw|sesyon)\s*(?:#|no\.?)?\s*[1-9]\b/i;
// "Second meeting", "1st day", "Unang Araw", "Ikaapat na Sesyon".
const ORDINAL_MARKER = /\b(?:(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+(?:session|day|meeting)|(?:unang|ikalawang|ikatlong|ikaapat na|ikalimang)\s+(?:araw|sesyon))\b/i;
const WEEKDAY = /\b(?:monday|tuesday|wednesday|thursday|friday|lunes|martes|miyerkules|huwebes|biyernes)\b/gi;
// Both languages name the same school day; keyed by the weekday's first letters in either language.
const DAY_OF: Record<string, string> = { mo: 'mon', lu: 'mon', tu: 'tue', ma: 'tue', we: 'wed', mi: 'wed', th: 'thu', hu: 'thu', fr: 'fri', bi: 'fri' };

/**
 * True when the lesson text looks split into sessions or days: a numbered or ordinal session, day or meeting,
 * or the weekday columns of a Daily Lesson Log (three or more different weekday names, English or Filipino).
 */
export function hasSessionMarkers(text: string): boolean {
  if (NUMBERED_MARKER.test(text) || ORDINAL_MARKER.test(text)) return true;
  const weekdays = new Set(Array.from(text.matchAll(WEEKDAY), match => DAY_OF[match[0].slice(0, 2).toLowerCase()]));
  return weekdays.size >= 3;
}
