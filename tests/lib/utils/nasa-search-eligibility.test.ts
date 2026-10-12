import { describe, expect, it } from 'vitest';
import { evaluateNasaSearchEligibility, type NasaSubjectEvidence } from '@/lib/utils/nasa-search-eligibility';

const science: NasaSubjectEvidence[] = [{ subject: 'Science', source: 'teacher-supplied' }];

describe('NASA search eligibility', () => {
  it.each([
    ['solar system distances', 'solar-system-scale'],
    ['solar system scale', 'solar-system-scale'],
    ['Solar-System Scale', 'solar-system-scale'],
    ['Earth atmosphere observations', 'earth-atmosphere-observations'],
    ["Earth's atmosphere observations", 'earth-atmosphere-observations'],
    ['Earth’s atmosphere observations', 'earth-atmosphere-observations'],
    ['plant root observations', 'plant-root-seedling-observations'],
    ['plant roots observations', 'plant-root-seedling-observations'],
    ['plant seedling observations', 'plant-root-seedling-observations'],
    ['plant seedlings observations', 'plant-root-seedling-observations'],
  ])('allows established science with %s only to search', (slideTopic, pilotTopic) => {
    expect(evaluateNasaSearchEligibility({ subjectEvidence: science, slideTopic })).toEqual({
      eligible: true, reason: 'supported-pilot-topic', pilotTopic,
    });
  });

  it('normalizes ordinary case and whitespace in claims and topic', () => {
    expect(evaluateNasaSearchEligibility({
      subjectEvidence: [{ subject: '  ScIeNcE\n', source: 'teacher-supplied' },
        { subject: 'science', source: 'model-generated' }],
      slideTopic: '\tSOLAR\n SYSTEM   DISTANCES  ',
    })).toEqual({ eligible: true, reason: 'supported-pilot-topic', pilotTopic: 'solar-system-scale' });
  });

  it.each([undefined, '', 'Science', 'biology', 'plant growth', 'solar system',
    'Earth atmosphere', 'roots', 'lunar phases', 'cells microscopy', 'bacteria',
    'human physiology', 'cartoon planets', 'cartoon of solar system distances',
    'not solar system distances', 'reading about solar system distances',
    'extrasolar system distances', 'solar system distanceship',
    'plant roots observationship', 'replant roots observations',
    'unearth atmosphere observations', 'Earth atmosphere observations_extra',
  ])('rejects generic, unsupported, prose, or boundary false-positive topic %s', (slideTopic) => {
    expect(evaluateNasaSearchEligibility({ subjectEvidence: science, slideTopic })).toEqual({
      eligible: false, reason: 'unsupported-topic',
    });
  });

  it.each([
    ['English/Reading', 'solar system distances'],
    ['Mathematics', 'solar system distances'],
    ['English', 'plant root observations'],
    ['Social Studies/History', 'Earth atmosphere observations'],
    ['Computer Science', 'solar system scale'],
  ])('rejects %s despite scientific objects in %s', (subject, slideTopic) => {
    expect(evaluateNasaSearchEligibility({
      subjectEvidence: [{ subject, source: 'teacher-supplied' }], slideTopic,
    })).toEqual({ eligible: false, reason: 'non-science-subject' });
  });

  it.each<{ label: string; claims?: NasaSubjectEvidence[] }>([
    { label: 'missing' }, { label: 'empty', claims: [] },
    { label: 'blank subject', claims: [{ subject: ' ', source: 'teacher-supplied' }] },
    { label: 'unknown subject', claims: [{ subject: 'Unknown', source: 'teacher-supplied' }] },
    { label: 'general study', claims: [{ subject: 'General Study', source: 'teacher-supplied' }] },
    { label: 'keyword inferred', claims: [{ subject: 'Science', source: 'keyword-detected' }] },
    { label: 'model inferred', claims: [{ subject: 'Science', source: 'model-generated' }] },
    { label: 'inference consensus', claims: [{ subject: 'Science', source: 'keyword-detected' },
      { subject: 'Science', source: 'model-generated' }] },
    { label: 'unknown provenance', claims: [{ subject: 'Science', source: 'unknown' }] },
    { label: 'teacher plus unknown provenance', claims: [...science, { subject: 'Science', source: 'unknown' }] },
    { label: 'teacher plus blank claim', claims: [...science, { subject: '', source: 'model-generated' }] },
  ])('fails closed with $label evidence', ({ claims }) => {
    expect(evaluateNasaSearchEligibility({ subjectEvidence: claims, slideTopic: 'solar system distances' })).toEqual({
      eligible: false, reason: 'subject-not-established',
    });
  });

  it.each<{ claims: NasaSubjectEvidence[] }>([
    { claims: [{ subject: 'English', source: 'teacher-supplied' }, { subject: 'Science', source: 'keyword-detected' }] },
    { claims: [{ subject: 'Mathematics', source: 'teacher-supplied' }, { subject: 'Science', source: 'model-generated' }] },
    { claims: [{ subject: 'Science', source: 'teacher-supplied' }, { subject: 'English', source: 'model-generated' }] },
    { claims: [{ subject: 'Science', source: 'teacher-supplied' }, { subject: 'Mathematics', source: 'teacher-supplied' }] },
  ])('rejects conflicting claims $claims', ({ claims }) => {
    expect(evaluateNasaSearchEligibility({ subjectEvidence: claims, slideTopic: 'solar system distances' })).toEqual({
      eligible: false, reason: 'subject-conflict',
    });
  });
});
