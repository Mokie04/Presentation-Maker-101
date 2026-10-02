// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlideshowModal } from '@/components/SlideshowModal';
import type { PresentationData } from '@/types/presentation';

describe('SlideshowModal component', () => {
  const samplePresentation: PresentationData = {
    subject: 'Science',
    originalWriters: 'DepEd Teachers',
    topic: 'Solar System Exploration',
    slides: [
      {
        slideNumber: 1,
        part: 'Motivation',
        title: 'Welcome to Space',
        contentPoints: ['Look up at the night sky', 'Count the stars'],
        visualDescription: 'Night sky with twinkling stars and moon',
      },
      {
        slideNumber: 2,
        part: 'Lesson Presentation',
        title: 'The Inner Planets',
        contentPoints: ['Mercury, Venus, Earth, Mars'],
        visualDescription: 'Diagram of four terrestrial planets',
      },
    ],
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SlideshowModal
        isOpen={false}
        onClose={vi.fn()}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders slide content and navigates using Next, Previous, and select jump', () => {
    const handleClose = vi.fn();

    render(
      <SlideshowModal
        isOpen={true}
        onClose={handleClose}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    expect(screen.getByText(/Solar System Exploration/i)).toBeTruthy();
    expect(screen.getByText('Welcome to Space')).toBeTruthy();
    expect(screen.getAllByText('Slide 1 of 2').length).toBeGreaterThan(0);

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /^Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('The Inner Planets')).toBeTruthy();
    expect(screen.getAllByText('Slide 2 of 2').length).toBeGreaterThan(0);

    // Click Previous
    const prevBtn = screen.getByRole('button', { name: /^Previous/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText('Welcome to Space')).toBeTruthy();

    // Select Jump
    const select = screen.getByLabelText(/Jump to slide/i) || screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } }); // 0-indexed slide 2
    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // Close button
    const closeBtn = screen.getByRole('button', { name: /Exit Slideshow/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('handles keyboard navigation (ArrowRight, ArrowLeft, Space, Escape)', () => {
    const handleClose = vi.fn();

    render(
      <SlideshowModal
        isOpen={true}
        onClose={handleClose}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    expect(screen.getByText('Welcome to Space')).toBeTruthy();

    // ArrowRight -> next slide
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // ArrowLeft -> previous slide
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('Welcome to Space')).toBeTruthy();

    // Space -> next slide
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // Escape -> close
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('handles mobile touch swipe navigation when delta > 60px', () => {
    const { container } = render(
      <SlideshowModal
        isOpen={true}
        onClose={vi.fn()}
        presentationData={samplePresentation}
        session="Session 1"
        slideImages={{}}
      />
    );

    const modal = container.firstChild as HTMLElement;

    // Swipe left (next slide)
    fireEvent.touchStart(modal, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(modal, { changedTouches: [{ clientX: 100, clientY: 100 }] }); // delta = -100

    expect(screen.getByText('The Inner Planets')).toBeTruthy();

    // Swipe right (prev slide)
    fireEvent.touchStart(modal, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(modal, { changedTouches: [{ clientX: 200, clientY: 100 }] }); // delta = +100

    expect(screen.getByText('Welcome to Space')).toBeTruthy();
  });
});
