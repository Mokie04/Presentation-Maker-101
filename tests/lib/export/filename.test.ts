import { describe, expect, it } from 'vitest';
import { exportFilename } from '@/lib/export/filename';

describe('exportFilename', () => {
  it.each([
    ['Water Cycle', 'Session 1', 'water_cycle_session_1'],
    ['Plants: Roots & Shoots!', '  Session 2 ', 'plants__roots___shoots__session_2'],
    ['MiXeD Case', 'SESSION 3', 'mixed_case_session_3'],
    ['', 'Session 1', 'presentation_session_1'],
    ['Topic', '', 'topic_session'],
    ['Topic', undefined, 'topic_session'],
    ['Fotosíntesis 🌱', 'Session 4', 'fotos_ntesis____session_4'],
    ['   ', '   ', '____session'],
    ['日本語', 'Session 1', '____session_1'],
    ['A'.repeat(300), 'Session 1', `${'a'.repeat(300)}_session_1`],
  ])('names topic %j and session %j as %j', (topic, session, stem) => {
    expect(exportFilename({ topic, session, suffix: 'SayunaAI.pptx' })).toBe(`${stem}_SayunaAI.pptx`);
    expect(exportFilename({ topic, session, suffix: 'Outline.md' })).toBe(`${stem}_Outline.md`);
  });
});
