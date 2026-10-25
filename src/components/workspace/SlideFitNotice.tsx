import React from 'react';

export interface SlideFitNoticeProps {
  overflow: { title: boolean; body: boolean };
  onSplit?: () => void;
}

export function SlideFitNotice({ overflow, onSplit }: SlideFitNoticeProps) {
  if (!overflow.title && !overflow.body) return null;
  return <div role="note" className="space-y-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
    {overflow.body && <p>Some text does not fit on this slide. Shorten it, or split the slide.</p>}
    {overflow.title && <p>The title is too long for the slide. Shorten it.</p>}
    {overflow.body && onSplit && <button type="button" onClick={onSplit}
      className="min-h-11 rounded border border-amber-700 bg-white px-3 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700">
      Split into two slides
    </button>}
  </div>;
}
