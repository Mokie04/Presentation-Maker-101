// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  firstSlideId,
  lastSlideId,
  nextSlideId,
  previousSlideId,
  reconcileSelection,
  useSlideSelection,
} from '@/lib/deck/use-slide-selection';

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

describe('useSlideSelection', () => {
  it('selects the first slide after load and reload', () => {
    const { result, rerender } = renderHook(({ ids }) => useSlideSelection(ids), { initialProps: { ids: [] as number[] } });
    expect(result.current.selectedId).toBeNull();
    rerender({ ids: [10, 20, 30] });
    expect(result.current.selectedId).toBe(10);
    act(() => result.current.selectSlide(20));
    rerender({ ids: [40, 50] });
    expect(result.current.selectedId).toBe(40);
  });

  it('preserves selection and callback identity when edits create an equal ids array', () => {
    const { result, rerender } = renderHook(({ ids }) => useSlideSelection(ids), { initialProps: { ids: [10, 20, 30] } });
    act(() => result.current.selectSlide(20));
    const { selectSlide, next, previous, first, last } = result.current;
    rerender({ ids: [10, 20, 30] });
    rerender({ ids: [10, 20, 30] });
    expect(result.current.selectedId).toBe(20);
    expect(result.current).toMatchObject({ selectSlide, next, previous, first, last });
  });

  it('selects the deleted slide neighbour, then clears the empty deck', () => {
    const { result, rerender } = renderHook(({ ids }) => useSlideSelection(ids), { initialProps: { ids: [10, 20, 30] } });
    act(() => result.current.selectSlide(20));
    rerender({ ids: [10, 30] });
    expect(result.current.selectedId).toBe(30);
    rerender({ ids: [10] });
    expect(result.current.selectedId).toBe(10);
    rerender({ ids: [] });
    expect(result.current.selectedId).toBeNull();
  });

  it('selects the new id after batched add and delete operations', () => {
    const { result, rerender } = renderHook(({ ids }) => useSlideSelection(ids), { initialProps: { ids: [10, 20, 30] } });
    act(() => {
      result.current.selectSlide(20);
      rerender({ ids: [10, 30, 40] });
    });
    expect(result.current.selectedId).toBe(40);
  });

  it('navigates repeatedly in one batch and stops at the ends', () => {
    const { result } = renderHook(() => useSlideSelection([10, 20, 30]));
    act(() => { result.current.previous(); });
    expect(result.current.selectedId).toBe(10);
    act(() => { result.current.next(); result.current.next(); result.current.next(); });
    expect(result.current.selectedId).toBe(30);
    act(() => { result.current.previous(); });
    expect(result.current.selectedId).toBe(20);
    act(() => { result.current.first(); });
    expect(result.current.selectedId).toBe(10);
    act(() => { result.current.last(); });
    expect(result.current.selectedId).toBe(30);
  });

  it('ignores selecting an id that is absent from the deck', () => {
    const { result } = renderHook(() => useSlideSelection([10, 20]));
    act(() => result.current.selectSlide(99));
    expect(result.current.selectedId).toBe(10);
  });
});
