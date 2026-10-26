// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { UploadSection } from '@/components/UploadSection';
import { HomeHero } from '@/components/home/HomeHero';
import { Mokie } from '@/components/home/Mokie';
import { GeneratingPanel } from '@/components/home/GeneratingPanel';
import { Header } from '@/components/Header';
import { getPartBadgeInfo } from '@/components/part-badge';

const props = { extractedText: '', fileName: '', selectedSession: '', onSessionChange: vi.fn(), onUploadSuccess: vi.fn(), onGenerate: vi.fn(), isLoading: false, loadingStage: '' };
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });
function ControlledForm() {
  const [session, setSession] = useState('');
  return <UploadSection {...props} selectedSession={session} onSessionChange={setSession} />;
}
describe('home setup', () => {
  it('names the radiogroup and five native radios, with checked state controlled by props', () => {
    const { rerender } = render(<UploadSection {...props} selectedSession="Session 3" />);
    const group = screen.getByRole('radiogroup', { name: 'Select Session' });
    const radios = within(group).getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map(r => r.getAttribute('aria-label'))).toEqual(['Session 1', 'Session 2', 'Session 3', 'Session 4', 'Session 5']);
    expect(radios.every(r => r.type === 'radio' && r.name === radios[0].name)).toBe(true);
    expect(radios.map(r => r.checked)).toEqual([false, false, true, false, false]);
    fireEvent.click(radios[4]); expect(props.onSessionChange).toHaveBeenCalledWith('Session 5');
    rerender(<UploadSection {...props} selectedSession="Session 5" />);
    expect((screen.getByRole('radio', { name: 'Session 5' }) as HTMLInputElement).checked).toBe(true);
  });
  it('updates checked state through the native input change event', () => {
    render(<ControlledForm />);
    fireEvent.click(screen.getByRole('radio', { name: 'Session 2' }));
    expect((screen.getByRole('radio', { name: 'Session 2' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Session 4' }));
    expect((screen.getByRole('radio', { name: 'Session 2' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('radio', { name: 'Session 4' }) as HTMLInputElement).checked).toBe(true);
  });
  it.each([
    ['', '', true, "Start by dropping your lesson plan."],
    ['lesson', '', true, "Nice! Now pick the session to build."],
    ['', 'Session 2', true, "Start by dropping your lesson plan."],
    ['lesson', 'Session 2', false, "All set! I'll build Session 2."],
  ])('gates generation for text=%s session=%s', (extractedText, selectedSession, disabled, hint) => {
    render(<UploadSection {...props} extractedText={extractedText} selectedSession={selectedSession} />);
    expect((screen.getByRole('button', { name: 'Generate Slides' }) as HTMLButtonElement).disabled).toBe(disabled);
    expect(screen.getByText(hint)).toBeTruthy();
  });
  it('keeps the subject dropdown, Automatic, full request inputs and completed steps', () => {
    const subjectChange = vi.fn();
    render(<UploadSection {...props} extractedText="original text" fileName="lesson.docx" selectedSession="Session 4" selectedSubject="Science" onSubjectChange={subjectChange} />);
    const subject = screen.getByRole('combobox', { name: 'Subject' });
    expect(within(subject).getByRole('option', { name: 'Automatic' })).toBeTruthy();
    expect(screen.getByText("All set! I'll build Session 4.")).toBeTruthy();
    expect(screen.getByLabelText('Step 1 complete')).toBeTruthy();
    expect(screen.getByLabelText('Step 2 complete')).toBeTruthy();
    fireEvent.change(subject, { target: { value: 'Mathematics' } }); expect(subjectChange).toHaveBeenCalledWith('Mathematics');
    fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
    expect(props.onGenerate).toHaveBeenCalledWith('original text', 'Session 4', 'Science');
  });
  it('retains setup controls and Processing while showing the generating state', () => {
    render(<UploadSection {...props} extractedText="lesson" selectedSession="Session 1" isLoading loadingStage="Analyzing curriculum..." />);
    expect(screen.getByRole('button', { name: 'Processing...' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('radio', { name: 'Session 5' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Subject' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Analyzing curriculum...');
    expect(screen.getByRole('img', { name: 'Step 3 complete' })).toBeTruthy();
  });
});
it('renders the exact hero promise, steps, speech bubble and shared header tagline', () => {
  render(<><Header /><HomeHero /></>);
  expect(screen.getByRole('heading', { name: 'Turn your lesson plan into a classroom-ready PowerPoint.' })).toBeTruthy();
  for (const text of ['Upload your lesson', 'Pick a session', 'Edit and download', "Hi, I'm Mokie! Drop your lesson plan and I'll build the slides.", 'Making Presentation very Sayuna']) expect(screen.getByText(text)).toBeTruthy();
});
it('uses decorative, explicitly sized mascot assets with hero priority and reduced-motion support', () => {
  const { container } = render(<><Mokie size="hero" /><Mokie size="small" /></>);
  const images = container.querySelectorAll('img');
  expect(images).toHaveLength(2);
  images.forEach(img => { expect(img.alt).toBe(''); expect(img.getAttribute('width')).toBeTruthy(); expect(img.getAttribute('height')).toBeTruthy(); expect(img.getAttribute('aria-hidden')).toBe('true'); expect(img.className).toContain('motion-reduce:animate-none'); });
  expect(images[0].getAttribute('loading')).not.toBe('lazy');
  expect(images[1].getAttribute('src')).toContain('mokie-360');
});
it('announces only real stage text and cycles decorative badge chips without progress claims', () => {
  vi.useFakeTimers();
  const { container, rerender, unmount } = render(<GeneratingPanel loadingStage="Analyzing curriculum..." />);
  expect(screen.getByRole('status').textContent).toContain('Analyzing curriculum...');
  expect(container.textContent).not.toMatch(/\d+\s*%|almost|complete|finished/i);
  expect(screen.queryByRole('progressbar')).toBeNull();
  const parts = ['Review', 'Motivation', 'Lesson Presentation', 'Discussion', 'Activities', 'Assessment'];
  act(() => { vi.advanceTimersByTime(20000); });
  for (const part of parts) {
    const chip = screen.getByText(part);
    expect(chip.classList.contains(getPartBadgeInfo(part).bg)).toBe(true);
    expect(chip.classList.contains('text-white')).toBe(true);
  }
  expect(screen.getByText('Assessment').className).toContain('home-chip-pulse');
  expect(screen.getByText('Assessment').className).toContain('motion-reduce:animate-none');
  rerender(<GeneratingPanel loadingStage="Synthesizing Philippine pedagogical diagrams and questions..." />);
  expect(screen.getByRole('status').textContent).toContain('Synthesizing Philippine pedagogical diagrams and questions...');
  unmount(); expect(vi.getTimerCount()).toBe(0);
});
it.each(['setup', 'generating'])('has no axe violations in home %s (jsdom contrast excluded)', async mode => {
  render(<div className="home-screen"><Header /><main><HomeHero /><UploadSection {...props} isLoading={mode === 'generating'} loadingStage="Analyzing curriculum..." /></main></div>);
  const result = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
});
it('exposes completed step markers and a matching visible upload-control name', () => {
  render(<UploadSection {...props} extractedText="lesson" fileName="lesson.docx" selectedSession="Session 2" />);
  expect(screen.getByRole('img', { name: 'Step 1 complete' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Choose lesson plan document' }).textContent).toBe('Choose lesson plan document');
  expect(screen.getByText('Drag & Drop Lesson Plan Document')).toBeTruthy();
});
it('brings newly mounted generating feedback into view without scrolling again for stage updates', () => {
  const previous = HTMLElement.prototype.scrollIntoView;
  const scroll = vi.fn(); HTMLElement.prototype.scrollIntoView = scroll;
  try {
    const { rerender } = render(<GeneratingPanel loadingStage="Analyzing curriculum..." />);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    rerender(<GeneratingPanel loadingStage="Architecting slides..." />);
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally { HTMLElement.prototype.scrollIntoView = previous; }
});
