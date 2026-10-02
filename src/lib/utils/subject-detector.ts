const SCIENCE_KEYWORDS = ['science', 'experiment', 'planet', 'organism', 'biodiversity'];
const MATH_KEYWORDS = ['math', 'fraction', 'multiplication', 'number', 'addition'];
const SOCIAL_STUDIES_KEYWORDS = ['social studies', 'history', 'araling panlipunan', 'pilipinas', 'sibika'];
const ENGLISH_KEYWORDS = ['english', 'reading', 'vocabulary', 'story', 'noun', 'verb'];

function containsKeyword(lowerText: string, keywords: string[]): boolean {
  return keywords.some((kw) => lowerText.includes(kw));
}

export function detectSubject(text: string): string {
  if (!text) {
    return 'General Study';
  }

  const lower = text.toLowerCase();

  if (containsKeyword(lower, SCIENCE_KEYWORDS)) {
    return 'Science';
  }

  if (containsKeyword(lower, MATH_KEYWORDS)) {
    return 'Mathematics';
  }

  // Check Social Studies before English so that "history" is not falsely matched by "story"
  if (containsKeyword(lower, SOCIAL_STUDIES_KEYWORDS)) {
    return 'Social Studies/History';
  }

  if (containsKeyword(lower, ENGLISH_KEYWORDS)) {
    return 'English/Reading';
  }

  return 'General Study';
}
