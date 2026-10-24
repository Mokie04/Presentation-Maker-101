// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useSlideReorder } from '@/components/workspace/use-slide-reorder';

afterEach(cleanup);

function ReorderItems({ onMove }: { onMove?: (id: number, toIndex: number) => void }) {
  const reorder = useSlideReorder(onMove);
  return <>
    <output aria-label="Dragging">{reorder.draggedId ?? 'none'}</output>
    <output aria-label="Target">{reorder.dropTargetId ?? 'none'}</output>
    {[10, 40, 70].map((id, index) => <div key={id} {...reorder.itemProps(id, index)} data-testid={`slide-${id}`}>{id}</div>)}
  </>;
}

describe('useSlideReorder', () => {
  it('tracks drag state and moves the stable id to the target index', () => {
    const onMove = vi.fn();
    render(<ReorderItems onMove={onMove} />);
    const setData = vi.fn();
    const dataTransfer = { setData, effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByTestId('slide-10'), { dataTransfer });
    expect(screen.getByLabelText('Dragging').textContent).toBe('10');
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(fireEvent.dragOver(screen.getByTestId('slide-70'), { dataTransfer })).toBe(false);
    expect(screen.getByLabelText('Target').textContent).toBe('70');
    fireEvent.drop(screen.getByTestId('slide-70'), { dataTransfer });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(10, 2);
    expect(screen.getByLabelText('Dragging').textContent).toBe('none');
    expect(screen.getByLabelText('Target').textContent).toBe('none');
  });

  it('ignores a self drop and clears drag state', () => {
    const onMove = vi.fn();
    render(<ReorderItems onMove={onMove} />);
    fireEvent.dragStart(screen.getByTestId('slide-40'));
    fireEvent.dragOver(screen.getByTestId('slide-40'));
    expect(screen.getByLabelText('Target').textContent).toBe('none');
    fireEvent.drop(screen.getByTestId('slide-40'));
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Dragging').textContent).toBe('none');
  });

  it('ignores external drags even when the transfer claims a slide id', () => {
    const onMove = vi.fn();
    render(<ReorderItems onMove={onMove} />);
    const dataTransfer = { getData: () => '10' };
    expect(fireEvent.dragOver(screen.getByTestId('slide-70'), { dataTransfer })).toBe(true);
    fireEvent.drop(screen.getByTestId('slide-70'), { dataTransfer });
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Target').textContent).toBe('none');
  });

  it('clears the target on drag leave and the drag on drag end', () => {
    const onMove = vi.fn();
    render(<ReorderItems onMove={onMove} />);
    fireEvent.dragStart(screen.getByTestId('slide-10'));
    fireEvent.dragOver(screen.getByTestId('slide-70'));
    fireEvent.dragLeave(screen.getByTestId('slide-70'));
    expect(screen.getByLabelText('Target').textContent).toBe('none');
    fireEvent.dragOver(screen.getByTestId('slide-40'));
    fireEvent.dragEnd(screen.getByTestId('slide-10'));
    expect(screen.getByLabelText('Dragging').textContent).toBe('none');
    expect(screen.getByLabelText('Target').textContent).toBe('none');
    fireEvent.drop(screen.getByTestId('slide-40'));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('uses the latest callback when a parent rerenders during a drag', () => {
    const before = vi.fn();
    const after = vi.fn();
    const { rerender } = render(<ReorderItems onMove={before} />);
    fireEvent.dragStart(screen.getByTestId('slide-70'));
    rerender(<ReorderItems onMove={after} />);
    fireEvent.drop(screen.getByTestId('slide-10'));
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledExactlyOnceWith(70, 0);
  });

  it('disables drag interactions when no move callback is supplied', () => {
    render(<ReorderItems />);
    expect(screen.getByTestId('slide-10').draggable).toBe(false);
    fireEvent.dragStart(screen.getByTestId('slide-10'));
    fireEvent.dragOver(screen.getByTestId('slide-70'));
    expect(screen.getByLabelText('Dragging').textContent).toBe('none');
    expect(screen.getByLabelText('Target').textContent).toBe('none');
  });
});
