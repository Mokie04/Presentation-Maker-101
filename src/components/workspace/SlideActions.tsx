import React from 'react';
import { Trash2 } from 'lucide-react';
import { SlideMoveButtons } from './SlideMoveButtons';

export function SlideActions({ slideId, index, total, onMove, onDuplicate, onAdd, onDelete }: {
  slideId: number;
  index: number;
  total: number;
  onMove: (slideId: number, toIndex: number) => void;
  onDuplicate: (slideId: number) => void;
  onAdd: () => void;
  onDelete: (slideId: number) => void;
}) {
  return (
    <div role="toolbar" aria-label="Slide actions" className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SlideMoveButtons slideId={slideId} index={index} total={total} onMove={onMove} />
        <button type="button" onClick={() => onDuplicate(slideId)}
          className="min-h-11 rounded-lg border border-sky-200 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50">
          Duplicate slide
        </button>
        <button type="button" onClick={() => onAdd()}
          className="min-h-11 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors">
          + Add Slide
        </button>
      </div>
      <button
        type="button"
        aria-label="Delete Slide"
        title={total === 1 ? 'Keep at least one slide' : 'Delete Slide'}
        disabled={total === 1}
        onClick={() => onDelete(slideId)}
        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete Slide
      </button>
    </div>
  );
}
