export interface NasaSubjectEvidence {
  subject: string;
  source: 'teacher-supplied' | 'keyword-detected' | 'model-generated' | 'unknown';
}

export interface NasaSearchEligibilityInput {
  subjectEvidence?: readonly NasaSubjectEvidence[];
  slideTopic?: string;
}

export type NasaPilotTopic =
  | 'solar-system-scale'
  | 'earth-atmosphere-observations'
  | 'plant-root-seedling-observations';

export type NasaSearchEligibilityDecision =
  | { eligible: true; reason: 'supported-pilot-topic'; pilotTopic: NasaPilotTopic }
  | { eligible: false; reason: 'subject-not-established' | 'subject-conflict' | 'non-science-subject' | 'unsupported-topic' };

const PILOT_TOPICS: readonly { topic: NasaPilotTopic; phrase: RegExp }[] = [
  { topic: 'solar-system-scale', phrase: /^\bsolar[ -]system (?:distances|scale)\b$/ },
  { topic: 'earth-atmosphere-observations', phrase: /^\bearth(?:['’]s)? atmosphere observations\b$/ },
  { topic: 'plant-root-seedling-observations', phrase: /^\bplant (?:roots?|seedlings?) observations\b$/ },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Pure may-search policy. Source tags must come from preserved caller provenance. */
export function evaluateNasaSearchEligibility(input: NasaSearchEligibilityInput): NasaSearchEligibilityDecision {
  const claims = input.subjectEvidence ?? [];
  const subjects = claims.map((claim) => normalize(claim.subject));
  if (!claims.some((claim) => claim.source === 'teacher-supplied') ||
      claims.some((claim) => claim.source === 'unknown') ||
      subjects.some((subject) => !subject || subject === 'unknown' || subject === 'general study')) {
    return { eligible: false, reason: 'subject-not-established' };
  }
  if (new Set(subjects).size !== 1) {
    return { eligible: false, reason: 'subject-conflict' };
  }
  if (subjects[0] !== 'science') {
    return { eligible: false, reason: 'non-science-subject' };
  }
  const slideTopic = normalize(input.slideTopic ?? '');
  const match = PILOT_TOPICS.find(({ phrase }) => phrase.test(slideTopic));
  return match
    ? { eligible: true, reason: 'supported-pilot-topic', pilotTopic: match.topic }
    : { eligible: false, reason: 'unsupported-topic' };
}
