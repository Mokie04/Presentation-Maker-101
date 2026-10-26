// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { UploadSection } from '@/components/UploadSection';
import { HomeTrustStrip } from '@/components/home/HomeTrustStrip';
import { getPartAccentClass } from '@/components/part-badge';

const props = { extractedText: '', fileName: '', selectedSession: '', onSessionChange: vi.fn(), onUploadSuccess: vi.fn(), onGenerate: vi.fn(), isLoading: false, loadingStage: '' };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('moves the current step through upload, session and generate, retaining completed checks', () => {
  const { container, rerender } = render(<UploadSection {...props} />);
  const current = () => container.querySelectorAll('[aria-current="step"]');
  expect(current()).toHaveLength(1);
  expect(current()[0].contains(screen.getByRole('img', { name: 'Step 1' }))).toBe(true);
  rerender(<UploadSection {...props} extractedText="Lesson" fileName="lesson.docx" />);
  expect(current()).toHaveLength(1);
  expect(current()[0].contains(screen.getByRole('img', { name: 'Step 2' }))).toBe(true);
  expect(screen.getByRole('img', { name: 'Step 1 complete' })).toBeTruthy();
  rerender(<UploadSection {...props} extractedText="Lesson" selectedSession="Session 4" />);
  expect(current()).toHaveLength(1);
  expect(current()[0].contains(screen.getByRole('img', { name: 'Step 3' }))).toBe(true);
  expect(screen.getByRole('img', { name: 'Step 2 complete' })).toBeTruthy();
});
it.each([
  ['', '', false, 'Start by dropping your lesson plan.'],
  ['', 'Session 2', false, 'Start by dropping your lesson plan.'],
  ['Lesson', '', false, 'Nice! Now pick the session to build.'],
  ['Lesson', 'Session 5', false, "All set! I'll build Session 5."],
  ['Lesson', 'Session 5', true, 'Building your deck, hang tight!'],
])('describes Generate without a live region: %s/%s/loading=%s', (extractedText, selectedSession, isLoading, copy) => {
  render(<UploadSection {...props} extractedText={extractedText} selectedSession={selectedSession} isLoading={isLoading} loadingStage="Analyzing curriculum..." />);
  const button = screen.getByRole('button', { name: isLoading ? 'Processing...' : 'Generate Slides' });
  const id = button.getAttribute('aria-describedby'); expect(id).toBeTruthy();
  const bubble = document.getElementById(id!); expect(bubble?.textContent).toBe(copy);
  expect(bubble?.getAttribute('aria-live')).toBeNull(); expect(bubble?.getAttribute('role')).toBeNull();
  expect(bubble?.closest('[aria-live], [role="status"], [role="alert"]')).toBeNull();
});
it('retains the native named radios, subject dropdown and exact generation inputs', () => {
  render(<UploadSection {...props} extractedText="Original text" selectedSession="Session 3" selectedSubject="Science" />);
  expect(within(screen.getByRole('radiogroup', { name: 'Select Session' })).getAllByRole('radio').map(r => r.getAttribute('aria-label'))).toEqual(['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5']);
  fireEvent.click(screen.getByRole('radio', { name: 'Session 4' })); expect(props.onSessionChange).toHaveBeenCalledWith('Session 4');
  expect(within(screen.getByRole('combobox', { name: 'Subject' })).getByRole('option', { name: 'Automatic' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' })); expect(props.onGenerate).toHaveBeenCalledWith('Original text', 'Session 3', 'Science');
});
it('keeps decorative sheet/tags hidden from accessibility and Mokie alt empty', () => {
  const { container } = render(<UploadSection {...props} />);
  expect(screen.getByRole('button', { name: 'Choose lesson plan document' }).textContent).toBe('Choose lesson plan document');
  const sheet = container.querySelector('.setup-paper'); expect(sheet?.getAttribute('aria-hidden')).toBe('true');
  for (const tag of ['DOCX', 'PDF', 'TXT', 'MD']) expect(screen.getByText(tag).closest('[aria-hidden="true"]')).toBeTruthy();
  const mascot = container.querySelector('.setup-mokie img'); expect(mascot?.getAttribute('alt')).toBe('');
  expect(mascot?.getAttribute('src')).toContain('mokie-360');
});
it('uses shared badge accents for the three trust cards', () => {
  const { container } = render(<HomeTrustStrip />);
  const parts = ['Review', 'Lesson Presentation', 'Activities'] as const;
  const edges = container.querySelectorAll('[aria-hidden="true"]'); expect(edges).toHaveLength(3);
  edges.forEach((edge, index) => expect(edge.classList.contains(getPartAccentClass(parts[index]))).toBe(true));
});
it.each(['empty', 'ready', 'loading'])('has no axe violations in %s (jsdom contrast excluded)', async state => {
  render(<main className="home-screen"><UploadSection {...props} extractedText={state === 'empty' ? '' : 'Lesson'} selectedSession={state === 'empty' ? '' : 'Session 1'} isLoading={state === 'loading'} loadingStage="Analyzing curriculum..." /><HomeTrustStrip /></main>);
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
});
