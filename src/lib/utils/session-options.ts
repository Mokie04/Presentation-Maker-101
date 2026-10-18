/** Curriculum session labels, shared by the session picker and request validation. */
export const SESSION_OPTIONS = [
  'Session 1',
  'Session 2',
  'Session 3',
  'Session 4',
  'Session 5',
] as const;

export type SessionOption = typeof SESSION_OPTIONS[number];
