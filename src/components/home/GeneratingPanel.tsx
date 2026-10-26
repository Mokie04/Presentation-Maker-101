'use client';

import { useEffect, useRef, useState } from 'react';
import { PEDAGOGICAL_PARTS } from '@/lib/pedagogy';
import { getPartBadgeInfo } from '@/components/part-badge';
import { Mokie } from './Mokie';

const lessonParts = PEDAGOGICAL_PARTS.filter(part => part !== 'Title Page');

/** Decorative activity, not a measurement of server progress or time remaining. */
export function GeneratingPanel({ loadingStage }: { loadingStage: string }) {
  const panel = useRef<HTMLElement>(null);
  const [litParts, setLitParts] = useState(1);
  useEffect(() => {
    panel.current?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    const timer = setInterval(() => { setLitParts(count => Math.min(count + 1, lessonParts.length)); }, 1400);
    return () => clearInterval(timer);
  }, []);
  return (
    <section ref={panel} aria-label="Generating presentation" className="border-b border-sky-100 p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-4">
        <Mokie size="small" />
        <div className="min-w-0">
          <h2 className="mb-2 text-lg font-bold text-slate-900">Building your deck</h2>
          <div role="status" aria-live="polite" aria-atomic="true" className="rounded-2xl rounded-bl-sm border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-slate-700">
            {loadingStage}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {lessonParts.map((part, index) => (
          <span key={part} className={`rounded-xl border px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide ${index < litParts ? `${getPartBadgeInfo(part).bg} border-transparent text-white` : 'border-slate-200 bg-white text-slate-600'} ${index === litParts - 1 ? 'home-chip-pulse motion-reduce:animate-none' : ''}`}>
            {part}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-sky-100">
        <div className="home-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-sky-700 to-sun-500 motion-reduce:animate-none" />
      </div>
    </section>
  );
}
