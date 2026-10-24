import React from 'react';

export function SlideMoveButtons({ slideId, index, total, onMove }: {
  slideId: number;
  index: number;
  total: number;
  onMove: (slideId: number, toIndex: number) => void;
}) {
  return <>
    <button type="button" aria-label={`Move slide ${index + 1} earlier`} disabled={index === 0}
      onClick={() => onMove(slideId, index - 1)}
      className="min-h-11 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40">
      Move earlier
    </button>
    <button type="button" aria-label={`Move slide ${index + 1} later`} disabled={index === total - 1}
      onClick={() => onMove(slideId, index + 1)}
      className="min-h-11 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40">
      Move later
    </button>
  </>;
}
