// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';
import { GeneratingPanel } from '@/components/home/GeneratingPanel';
import { SlideshowModal } from '@/components/SlideshowModal';
import { SlideSorter } from '@/components/workspace/SlideSorter';
import type { PresentationData } from '@/types/presentation';
import { panel, selectSlide } from '../helpers/workspace';

const FOUR_AS = 'CLASSROOM OBSERVATION LESSON PLAN\nACTIVITY (10 minutes)\nANALYSIS (15 minutes)\nABSTRACTION (10 minutes)\nAPPLICATION (10 minutes)';
const deck = { subject: 'Mathematics', originalWriters: 'Teacher', topic: 'Reports', lessonFormat: "4A's",
  slides: ['Title Page', 'Activity', 'Analysis', 'Assessment'].map((part, index) => ({
    slideNumber: index + 1, part, title: `${part} slide`, contentPoints: ['Point'], visualDescription: '' })) };
let requests: Record<string, unknown>[];

beforeEach(() => {
  requests = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') { requests.push(JSON.parse(String(init?.body))); return Response.json(deck); }
    if (url === '/api/generate-image') return Response.json({ base64: 'image' });
    throw new Error(`Unexpected request ${url}`);
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function pasteLesson(text = FOUR_AS) {
  render(<Home />);
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
}
async function generate() {
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox', { name: 'Slides' });
}

it('shows the detected format without asking for one, and never sends a format', async () => {
  await pasteLesson();
  expect(screen.queryByRole('combobox', { name: 'Lesson format' })).toBeNull();
  expect(screen.getByText('Lesson format').parentElement?.textContent).toBe("Lesson format 4A's · detected from your plan");
  await generate();
  expect(requests[0]).not.toHaveProperty('lessonFormat');
});

it('updates the detected format as the plan changes', async () => {
  await pasteLesson('Engage. Explore. Explain. Elaborate. Evaluate.');
  expect(screen.getByText('5E')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A lesson about plants.' } });
  expect(screen.getByText('Standard')).toBeTruthy();
});

it("labels and edits a 4A's deck with 4A's parts", async () => {
  await pasteLesson();
  await generate();
  selectSlide(2);
  expect(screen.getByText(/Slide 2 of 4 · 1\. ACTIVITY/)).toBeTruthy();
  const partSelect = within(panel()).getByRole('combobox', { name: 'Pedagogical Part' });
  expect(within(partSelect).getAllByRole('option').map(option => option.textContent))
    .toEqual(['Title Page', 'Review', 'Motivation', 'Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment']);
  fireEvent.click(screen.getByRole('button', { name: /\+ Add Slide/ }));
  expect(screen.getByText(/Slide 3 of 5 · 2\. ANALYSIS/)).toBeTruthy();
});

it("lights the 4A's while generating", () => {
  render(<GeneratingPanel loadingStage="Working" lessonFormat="4A's" />);
  expect(Array.from(document.querySelectorAll('.grid span'), chip => chip.textContent)).toEqual(['Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment']);
});

it('keeps the chips of the submitted format when the plan text changes during generation', async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/session') return Response.json({ authenticated: true });
    if (url === '/api/generate') return new Promise<Response>(done => { finish = done; });
    if (url === '/api/generate-image') return Response.json({ base64: 'image' });
    throw new Error(`Unexpected request ${url}`);
  }));
  await pasteLesson();
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Engage. Explore. Explain. Elaborate. Evaluate.' } });
  const chips = () => Array.from(screen.getByRole('region', { name: 'Generating presentation' }).querySelectorAll('.grid span'), chip => chip.textContent);
  expect(chips()).toEqual(['Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment']);
  await act(async () => { finish(Response.json(deck)); });
});

it("shows 4A's labels in the slideshow and the slide sorter", () => {
  const presentation = deck as unknown as PresentationData;
  const slideshow = render(<SlideshowModal isOpen onClose={vi.fn()} presentationData={presentation} session="Whole lesson" slideImages={{}} initialIndex={1} />);
  expect(within(screen.getByRole('dialog')).getByText('1. ACTIVITY')).toBeTruthy();
  slideshow.unmount();
  render(<SlideSorter slides={presentation.slides} slideIds={[0, 1, 2, 3]} selectedId={0} lessonFormat="4A's"
    onSelect={vi.fn()} onOpen={vi.fn()} onMove={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />);
  expect(screen.getByText('1. ACTIVITY')).toBeTruthy();
  expect(screen.getByText('2. ANALYSIS')).toBeTruthy();
});
