// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { UploadSection } from '@/components/UploadSection';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function upload(text: string, selectedSession: string) {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ text, fileName: 'plan.docx' })));
  const onSessionChange = vi.fn();
  const view = render(<UploadSection extractedText="" fileName="" onUploadSuccess={vi.fn()} selectedSession={selectedSession}
    onSessionChange={onSessionChange} onGenerate={vi.fn()} isLoading={false} loadingStage="" />);
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => { fireEvent.change(input, { target: { files: [new File(['lesson'], 'plan.docx')] } }); });
  return onSessionChange;
}

it('picks Whole lesson for an uploaded plan with no sessions or days', async () => {
  const onSessionChange = await upload('CLASSROOM OBSERVATION LESSON PLAN\nEngage (10 minutes)\nExplore (20 minutes)', '');
  expect(onSessionChange).toHaveBeenCalledWith('Whole lesson');
});

it('leaves the choice to the teacher when the plan has sessions', async () => {
  const onSessionChange = await upload('Session 1: Review\nSession 2: Activities', '');
  expect(onSessionChange).not.toHaveBeenCalled();
});

it('keeps a session the teacher already picked', async () => {
  const onSessionChange = await upload('CLASSROOM OBSERVATION LESSON PLAN', 'Session 2');
  expect(onSessionChange).not.toHaveBeenCalled();
});
