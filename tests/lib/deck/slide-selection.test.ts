import { describe, expect, it } from 'vitest';
import {
  firstSlideId,
  lastSlideId,
  nextSlideId,
  previousSlideId,
  reconcileSelection,
} from '@/lib/deck/slide-selection';

describe('reconcileSelection', () => {
  it.each([
    { name: 'selects the first slide on load', previous: [], next: [10, 20, 30], selected: null, expected: 10 },
    { name: 'selects the first slide on reload', previous: [10, 20, 30], next: [40, 50], selected: 20, expected: 40 },
    { name: 'selects the only slide on reload', previous: [10, 20], next: [30], selected: 20, expected: 30 },
    { name: 'selects the next neighbour after deleting the middle slide', previous: [10, 20, 30], next: [10, 30], selected: 20, expected: 30 },
    { name: 'selects the previous neighbour after deleting the last slide', previous: [10, 20, 30], next: [10, 20], selected: 30, expected: 20 },
    { name: 'clears selection after deleting the only slide', previous: [10], next: [], selected: 10, expected: null },
    { name: 'selects the one added slide', previous: [10, 20], next: [10, 20, 30], selected: 10, expected: 30 },
    { name: 'selects an added slide after a batched deletion', previous: [10, 20, 30], next: [10, 30, 40], selected: 20, expected: 40 },
    { name: 'keeps selection on unrelated changes', previous: [10, 20, 30], next: [20, 30], selected: 20, expected: 20 },
    { name: 'keeps selection when ids are unchanged', previous: [10, 20, 30], next: [10, 20, 30], selected: 20, expected: 20 },
    { name: 'keeps selection when more than one slide is added', previous: [10, 20], next: [10, 20, 30, 40], selected: 20, expected: 20 },
  ])('$name', ({ previous, next, selected, expected }) => {
    expect(reconcileSelection(previous, next, selected)).toBe(expected);
  });
});

describe('selection navigation', () => {
  it('moves by stable id and stops at either end', () => {
    expect(nextSlideId([10, 20, 30], 20)).toBe(30);
    expect(nextSlideId([10, 20, 30], 30)).toBe(30);
    expect(previousSlideId([10, 20, 30], 20)).toBe(10);
    expect(previousSlideId([10, 20, 30], 10)).toBe(10);
    expect(firstSlideId([10, 20, 30])).toBe(10);
    expect(lastSlideId([10, 20, 30])).toBe(30);
  });

  it('returns no selection when the deck is empty', () => {
    expect(nextSlideId([], null)).toBeNull();
    expect(previousSlideId([], null)).toBeNull();
    expect(firstSlideId([])).toBeNull();
    expect(lastSlideId([])).toBeNull();
  });

  it('recovers a missing selection at the first slide', () => {
    expect(nextSlideId([10, 20], null)).toBe(10);
    expect(previousSlideId([10, 20], 99)).toBe(10);
  });
});
