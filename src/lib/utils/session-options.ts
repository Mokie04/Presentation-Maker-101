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

const NUMBERED_MARKER = /\b(?:session|day|meeting)\s*(?:#|no\.?)?\s*[1-9]\b/i;
const ORDINAL_MARKER = /\b(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+(?:session|day|meeting)\b/i;
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

/**
 * True when the lesson text looks split into sessions or days: "Session 2", "Day 1", "Second meeting",
 * or the Monday-to-Friday columns of a Daily Lesson Log (three or more weekday names).
 */
export function hasSessionMarkers(text: string): boolean {
  if (NUMBERED_MARKER.test(text) || ORDINAL_MARKER.test(text)) return true;
  const lower = text.toLowerCase();
  return WEEKDAYS.filter(day => new RegExp(`\\b${day}\\b`).test(lower)).length >= 3;
}
