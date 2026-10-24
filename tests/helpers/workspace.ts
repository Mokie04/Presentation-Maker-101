import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Home from '@/app/page';

/** Renders the app, pastes a lesson and waits for the Normal view's slide rail. */
export async function openWorkspace(text = 'A lesson about plants.') {
  render(React.createElement(Home));
  await generateDeck(text);
}

/** Generates a deck from the upload screen of an already rendered app. */
export async function generateDeck(text: string, session = 'Session 1') {
  fireEvent.click(await screen.findByRole('button', { name: /paste/i }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  fireEvent.change(screen.getByLabelText('Select Session'), { target: { value: session } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate Slides' }));
  await screen.findByRole('listbox', { name: 'Slides' });
}

export function stage() { return screen.getByRole('region', { name: 'Slide stage' }); }
export function panel() { return screen.getByRole('complementary', { name: 'Slide settings' }); }

export function selectSlide(number: number) {
  fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[number - 1]);
}

/** Selects the rail option whose title is exactly `title`. */
export function selectSlideTitled(title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: new RegExp(`^Slide \\d+: ${escaped}$`) }));
}

export function railTitles() {
  return within(screen.getByRole('listbox')).getAllByRole('option').map(option => option.getAttribute('aria-label'));
}

/** The selected slide's panel preview; it is named after the slide title. */
export function panelImageSrc(title: string) {
  return within(panel()).getByRole('img', { name: title }).getAttribute('src');
}
