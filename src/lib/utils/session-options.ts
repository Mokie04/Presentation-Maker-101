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

// A heading or table cell starts at a new line or a tab, then an optional list number, roman numeral, letter or
// bullet ("1. Day 1", "IV. Day 4", "A) Session 2", "• Day 3"). Shared with lesson format detection.
export const HEADING_START = String.raw`(?:^|\t)[ \t]*(?:(?:[0-9]{1,2}|[IVXivx]{2,4}|[A-Za-z])[.)]|[•*\-–—])?[ \t]*`;
const ENGLISH_LABELS = 'session|day|meeting';
const FILIPINO_LABELS = 'araw|sesyon';
const LABEL_WORDS = `${ENGLISH_LABELS}|${FILIPINO_LABELS}`;
const WEEKDAY_NAME = '(monday|tuesday|wednesday|thursday|friday|lunes|martes|miyerkules|huwebes|biyernes)';
// English and Filipino labels: "Session 2", "Day 1", "Araw 3", "Sesyon 1", optionally after one word such as
// "Learning Session 1" in a weekly plan.
const NUMBERED_HEADING = new RegExp(`${HEADING_START}(?:[A-Za-z]+[ \\t]+)?(?:${LABEL_WORDS})\\s*(?:#|no\\.?)?\\s*[1-9]\\b`, 'gim');
// "Second meeting", "1st day", "Unang Araw", "Ikaapat na Sesyon".
const ORDINAL_HEADING = new RegExp(`${HEADING_START}(?:(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\\s+(?:${ENGLISH_LABELS})|(?:unang|ikalawang|ikatlong|ikaapat na|ikalimang)\\s+(?:${FILIPINO_LABELS}))\\b`, 'gim');
const WEEKDAY_HEADING = new RegExp(`${HEADING_START}${WEEKDAY_NAME}\\b`, 'gim');
// A PDF keeps a table row on one line: "Session 1 Session 2" or "MONDAY TUESDAY WEDNESDAY", separated only by
// spaces. Prose joins labels with words ("Day 1 and Day 3"), so it does not match.
const LABEL_ROW = new RegExp(`\\b(${LABEL_WORDS})[ \\t]*[1-9][ \\t]+\\1[ \\t]*[1-9]\\b`, 'i');
const WEEKDAY_ROW = new RegExp(`\\b${WEEKDAY_NAME}[ \\t]+${WEEKDAY_NAME}[ \\t]+${WEEKDAY_NAME}\\b`, 'gi');
// Both languages name the same school day; keyed by the weekday's first letters in either language.
const DAY_OF: Record<string, string> = { mo: 'mon', lu: 'mon', tu: 'tue', ma: 'tue', we: 'wed', mi: 'wed', th: 'thu', hu: 'thu', fr: 'fri', bi: 'fri' };
const dayOf = (name: string) => DAY_OF[name.slice(0, 2).toLowerCase()];

/** Heading matches of `pattern`, leaving out a line that carries on as a sentence ("Day 1 and the plants…"). */
function headings(text: string, pattern: RegExp): RegExpMatchArray[] {
  return Array.from(text.matchAll(pattern)).filter(match =>
    !/^[ \t]+[a-z]/.test(text.slice(match.index! + match[0].length, match.index! + match[0].length + 40)));
}

/**
 * True when the lesson text is split into sessions or days: a numbered or ordinal session, day or meeting
 * heading, a row of them, or the weekday columns of a Daily Lesson Log (three or more different weekday names,
 * English or Filipino). A heading ends its line or is followed by punctuation or a capitalised title
 * ("Day 1: Review", "SESSION 2 Group Work"); prose such as "record the height on Day 1" does not count.
 */
export function hasSessionMarkers(text: string): boolean {
  if (headings(text, NUMBERED_HEADING).length > 0 || headings(text, ORDINAL_HEADING).length > 0 || LABEL_ROW.test(text)) return true;
  if (Array.from(text.matchAll(WEEKDAY_ROW)).some(row => new Set([row[1], row[2], row[3]].map(dayOf)).size === 3)) return true;
  return new Set(headings(text, WEEKDAY_HEADING).map(match => dayOf(match[1]))).size >= 3;
}

/**
 * True when `after` replaces most of `before` in one change (a pasted, dropped or retyped plan), as opposed to an
 * edit. Only the span between the unchanged start and end counts, measured against the longer text, so a typo fix
 * changes a few characters and a whole plan added to a short leftover still counts.
 */
export function replacesMostOf(before: string, after: string): boolean {
  if (!before) return true;
  const shorter = Math.min(before.length, after.length);
  let start = 0;
  while (start < shorter && before[start] === after[start]) start++;
  let end = 0;
  while (end < shorter - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  const longer = Math.max(before.length, after.length);
  return longer - start - end > longer / 2;
}
