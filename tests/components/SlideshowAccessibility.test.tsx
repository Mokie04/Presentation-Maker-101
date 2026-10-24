// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SlideshowModal } from '@/components/SlideshowModal';
import type { PresentationData } from '@/types/presentation';

const presentation: PresentationData = {
  subject: 'Science', originalWriters: 'Teacher', topic: 'Plants',
  slides: ['Roots', 'Leaves', 'Flowers'].map((title, index) => ({
    slideNumber: index + 1, part: 'Discussion', title, contentPoints: [title], visualDescription: '',
  })),
};

afterEach(() => { cleanup(); document.body.style.removeProperty('overflow'); vi.unstubAllGlobals(); });

function Preview() {
  const [open, setOpen] = useState(false);
  return <div data-testid="outer">
    <aside data-testid="background">Background</aside>
    <section data-testid="branch">
      <button type="button" onClick={() => setOpen(true)}>Preview</button>
      <SlideshowModal isOpen={open} onClose={() => setOpen(false)} presentationData={presentation} session="Session 1" slideImages={{}} />
    </section>
  </div>;
}

function openPreview() {
  const result = render(<Preview />);
  const preview = screen.getByRole('button', { name: 'Preview' });
  preview.focus(); fireEvent.click(preview);
  return { ...result, preview, dialog: screen.getByRole('dialog') };
}

describe('slideshow accessibility', () => {
  it('names the modal and initially focuses its root for slide navigation', () => {
    const { dialog } = openPreview();
    expect(screen.getByRole('dialog', { name: 'Slideshow: Plants' })).toBe(dialog);
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: ' ' });
    expect(within(dialog).getByRole('group', { name: 'Slide 2 of 3' })).toBeTruthy();
  });

  it('cycles Tab through enabled controls and wraps in both directions', () => {
    const { dialog } = openPreview();
    const exit = within(dialog).getByRole('button', { name: 'Exit Slideshow' });
    const jump = within(dialog).getByRole('combobox');
    const next = within(dialog).getByRole('button', { name: 'Next' });
    fireEvent.keyDown(dialog, { key: 'Tab' }); expect(document.activeElement).toBe(exit);
    fireEvent.keyDown(exit, { key: 'Tab' }); expect(document.activeElement).toBe(jump);
    fireEvent.keyDown(jump, { key: 'Tab' }); expect(document.activeElement).toBe(next);
    fireEvent.keyDown(next, { key: 'Tab' }); expect(document.activeElement).toBe(exit);
    fireEvent.keyDown(exit, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(next);
  });

  it('includes the rotate hint and attribution links while excluding hidden controls', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
    const credited: PresentationData = { ...presentation, slides: [{ ...presentation.slides[0], imageMetadata: {
      source: 'nasa', nasaId: 'plant', photographer: 'NASA', sourceUrl: 'https://images.nasa.gov/details/plant',
      assetUrl: 'https://images-assets.nasa.gov/image/plant/plant~large.jpg', rendition: 'large', mimeType: 'image/jpeg',
    } }] };
    render(<SlideshowModal isOpen onClose={vi.fn()} presentationData={credited} session="Session 1" slideImages={{ 0: 'image' }} />);
    const dialog = screen.getByRole('dialog');
    const exit = within(dialog).getByRole('button', { name: 'Exit Slideshow' });
    const hint = within(dialog).getByRole('button', { name: 'Dismiss rotate hint' });
    const source = within(dialog).getByRole('link', { name: 'NASA source' });
    const jump = within(dialog).getByRole('combobox');
    const hidden = document.createElement('button'); hidden.textContent = 'Hidden'; hidden.style.display = 'none'; dialog.append(hidden);
    fireEvent.keyDown(dialog, { key: 'Tab' }); expect(document.activeElement).toBe(exit);
    fireEvent.keyDown(exit, { key: 'Tab' }); expect(document.activeElement).toBe(hint);
    fireEvent.keyDown(hint, { key: 'Tab' }); expect(document.activeElement).toBe(source);
    fireEvent.keyDown(source, { key: 'Tab' }); expect(document.activeElement).toBe(jump);
    fireEvent.keyDown(jump, { key: 'Tab' }); expect(document.activeElement).toBe(exit);
  });

  it('contains unexpected focus outside the dialog', () => {
    const { dialog, preview } = openPreview();
    preview.focus();
    expect(document.activeElement).toBe(dialog);
  });

  it('restores exact inert attributes, scrolling and Preview focus on close', () => {
    document.body.style.overflow = 'scroll';
    render(<Preview />);
    const background = screen.getByTestId('background'); background.setAttribute('inert', 'previous');
    const preview = screen.getByRole('button', { name: 'Preview' }); preview.focus(); fireEvent.click(preview);
    expect(preview.hasAttribute('inert')).toBe(true);
    expect(background.hasAttribute('inert')).toBe(true);
    expect(screen.getByTestId('outer').hasAttribute('inert')).toBe(false);
    expect(screen.getByTestId('branch').hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(preview);
    expect(preview.hasAttribute('inert')).toBe(false);
    expect(background.getAttribute('inert')).toBe('previous');
    expect(document.body.style.overflow).toBe('scroll');
    document.body.style.removeProperty('overflow');
  });

  it('cleans up focus containment and scroll locking when unmounted', () => {
    const { unmount } = openPreview();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
    const button = document.createElement('button'); document.body.append(button); button.focus();
    expect(document.activeElement).toBe(button); button.remove();
  });

  it('leaves select arrows and Space alone while Escape still closes', () => {
    const { dialog, preview } = openPreview();
    const select = within(dialog).getByRole('combobox'); select.focus();
    expect(fireEvent.keyDown(select, { key: 'ArrowRight' })).toBe(true);
    expect(fireEvent.keyDown(select, { key: ' ' })).toBe(true);
    expect(within(dialog).getByRole('group', { name: 'Slide 1 of 3' })).toBeTruthy();
    fireEvent.keyDown(select, { key: 'Escape' });
    expect(document.activeElement).toBe(preview);
  });

  it('keeps Space native on buttons and links but navigates with their arrows', () => {
    const { dialog } = openPreview();
    const next = within(dialog).getByRole('button', { name: 'Next' }); next.focus();
    expect(fireEvent.keyDown(next, { key: ' ' })).toBe(true);
    expect(within(dialog).getByRole('group', { name: 'Slide 1 of 3' })).toBeTruthy();
    fireEvent.keyDown(next, { key: 'ArrowRight' });
    expect(within(dialog).getByRole('group', { name: 'Slide 2 of 3' })).toBeTruthy();
    const link = document.createElement('a'); link.href = '#'; link.textContent = 'Credit'; dialog.append(link); link.focus();
    expect(fireEvent.keyDown(link, { key: ' ' })).toBe(true);
    fireEvent.keyDown(link, { key: 'ArrowLeft' });
    expect(within(dialog).getByRole('group', { name: 'Slide 1 of 3' })).toBeTruthy();
  });

  it('announces only the current slide counter politely', () => {
    const { dialog } = openPreview();
    const counter = within(dialog).getByRole('status');
    expect(counter.getAttribute('aria-live')).toBe('polite');
    expect(counter.textContent).toBe('Slide 1 of 3');
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(counter.textContent).toBe('Slide 2 of 3');
  });
});
