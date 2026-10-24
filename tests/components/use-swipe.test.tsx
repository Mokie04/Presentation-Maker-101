// @vitest-environment jsdom
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useSwipe } from '@/components/workspace/use-swipe';

function SwipeSurface({ disabled = false }: { disabled?: boolean }) {
  const [index, setIndex] = useState(1);
  const swipe = useSwipe({
    onNext: () => setIndex((value) => value + 1),
    onPrevious: () => setIndex((value) => value - 1),
    disabled,
  });
  return (
    <div aria-label="Swipe surface" {...swipe}>
      <output aria-label="Selected slide">{index}</output>
      <input aria-label="Slide title" />
      <textarea aria-label="Slide notes" />
      <select aria-label="Slide part"><option>Discussion</option></select>
      <div aria-label="Editable text" contentEditable tabIndex={0} suppressContentEditableWarning>
        <span>Editable child</span>
      </div>
      <aside aria-label="Slide settings"><button type="button">Image settings</button></aside>
    </div>
  );
}

function surface() {
  return screen.getByLabelText('Swipe surface');
}

function selectedSlide() {
  return screen.getByLabelText('Selected slide').textContent;
}

function start(target: HTMLElement = surface(), x = 200, y = 100) {
  return fireEvent.touchStart(target, { touches: [{ clientX: x, clientY: y }] });
}

function end(x = 100, y = 100) {
  return fireEvent.touchEnd(surface(), { changedTouches: [{ clientX: x, clientY: y }], touches: [] });
}

describe('useSwipe', () => {
  it.each([
    ['left', 139, '2'],
    ['right', 261, '0'],
  ])('navigates on a horizontal swipe %s', (_, endX, expected) => {
    render(<SwipeSurface />);
    start();
    end(Number(endX));
    expect(selectedSlide()).toBe(expected);
  });

  it.each([140, 260, 200])('ignores a gesture ending at x=%s within the strict 60px threshold', (endX) => {
    render(<SwipeSurface />);
    start();
    end(endX);
    expect(selectedSlide()).toBe('1');
  });

  it.each([
    [100, 220],
    [100, 200],
  ])('ignores vertical or equally diagonal movement to %s,%s', (x, y) => {
    render(<SwipeSurface />);
    start();
    end(x, y);
    expect(selectedSlide()).toBe('1');
  });

  it('allows the browser to handle scrolling', () => {
    render(<SwipeSurface />);
    expect(start()).toBe(true);
    expect(end(195, 250)).toBe(true);
    expect(selectedSlide()).toBe('1');
  });

  it.each(['Slide title', 'Slide notes', 'Slide part', 'Editable text'])('ignores gestures while %s is focused', (label) => {
    render(<SwipeSurface />);
    screen.getByLabelText(label).focus();
    start();
    end();
    expect(selectedSlide()).toBe('1');
  });

  it.each(['Slide title', 'Slide notes', 'Slide part', 'Editable text'])('ignores gestures starting on %s without focus', (label) => {
    render(<SwipeSurface />);
    start(screen.getByLabelText(label));
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('ignores gestures starting in a contenteditable descendant', () => {
    render(<SwipeSurface />);
    start(screen.getByText('Editable child'));
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('ignores gestures starting inside Slide settings', () => {
    render(<SwipeSurface />);
    start(screen.getByRole('button', { name: 'Image settings' }));
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('ignores a gesture if editing starts before touch end', () => {
    render(<SwipeSurface />);
    start();
    screen.getByLabelText('Slide title').focus();
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('ignores gestures when disabled', () => {
    render(<SwipeSurface disabled />);
    start();
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('ignores a gesture disabled before touch end', () => {
    const { rerender } = render(<SwipeSurface />);
    start();
    rerender(<SwipeSurface disabled />);
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('clears a canceled gesture', () => {
    render(<SwipeSurface />);
    start();
    fireEvent.touchCancel(surface());
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('clears the start when a second touch is added', () => {
    render(<SwipeSurface />);
    start();
    fireEvent.touchStart(surface(), { touches: [{ clientX: 200, clientY: 100 }, { clientX: 300, clientY: 100 }] });
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('rejects an end with multiple changed touches and clears the start', () => {
    render(<SwipeSurface />);
    start();
    fireEvent.touchEnd(surface(), { changedTouches: [{ clientX: 100, clientY: 100 }, { clientX: 300, clientY: 100 }], touches: [] });
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('rejects an end with another touch remaining', () => {
    render(<SwipeSurface />);
    start();
    fireEvent.touchEnd(surface(), { changedTouches: [{ clientX: 100, clientY: 100 }], touches: [{ clientX: 300, clientY: 100 }] });
    end();
    expect(selectedSlide()).toBe('1');
  });

  it('consumes the start after one navigation', () => {
    render(<SwipeSurface />);
    start();
    end();
    end();
    expect(selectedSlide()).toBe('2');
  });

  it('supports touch fixtures without a clientY coordinate', () => {
    render(<SwipeSurface />);
    fireEvent.touchStart(surface(), { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(surface(), { changedTouches: [{ clientX: 100 }] });
    expect(selectedSlide()).toBe('2');
  });
});
