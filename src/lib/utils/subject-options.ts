/** Existing subject labels, shared by the teacher control and request validation. */
export const SUPPORTED_SUBJECTS = [
  'Science',
  'Mathematics',
  'Social Studies/History',
  'English/Reading',
  'General Study',
] as const;

export type SupportedSubject = typeof SUPPORTED_SUBJECTS[number];
