'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SlideData } from '@/types/presentation';
import { THEMES, getTheme } from '@/lib/themes';
import { SlideThumbnail } from './SlideThumbnail';

interface LookPickerProps {
  themeId: string;
  onChange: (id: string) => void;
  slide?: SlideData;
  index: number;
  total: number;
  image?: string;
  originalWriters?: string;
}

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-sky-800 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
// Tactile like the home Generate button: lifts on hover, sits down when pressed or open.
const triggerStyle = 'inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-notebook-navy bg-sun-500 px-3 py-1.5 text-xs font-bold text-notebook-navy shadow-[0_3px_0_0_theme(colors.notebook.navy)] transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_theme(colors.notebook.navy)] active:translate-y-[3px] active:shadow-none aria-expanded:translate-y-[3px] aria-expanded:shadow-none motion-reduce:!transform-none motion-reduce:transition-none md:min-h-0';

/** A non-modal native radio chooser; a single available look adds no chrome. */
export function LookPicker({ themeId, onChange, slide, index, total, image, originalWriters }: LookPickerProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };

  useEffect(() => {
    if (!open) return;
    popover.current?.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false); trigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (THEMES.length < 2) return null;
  const current = getTheme(themeId);
  return (
    <div ref={root} className="relative" onBlur={event => {
      // A pointer press on a label can blur its radio to body before the
      // label activates it. Outside presses are handled by the document listener.
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => setOpen(value => !value)}
        className={`${triggerStyle} ${focusRing}`}>
        {/* Visual-only swatch of the current look; the text names it. */}
        <span aria-hidden="true" data-look-swatch
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-2 ring-notebook-navy"
          style={{ backgroundColor: `#${current.palette.background}` }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `#${current.palette.primary}` }} />
        </span>
        <span>Look: {current.name}</span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open && <div ref={popover} id={id} data-look-popover
        className="fixed inset-x-2 bottom-2 z-50 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border-2 border-slate-800 bg-white p-4 text-slate-900 shadow-[4px_4px_0_0_#1e293b] motion-reduce:transition-none md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:right-auto md:top-full md:mt-2 md:w-[360px] md:max-h-[min(640px,80dvh)]">
        <fieldset role="radiogroup" aria-label="Look" className="min-w-0 space-y-3">
          <legend className="mb-2 text-sm font-bold">Choose a look</legend>
          {THEMES.map(theme => <label key={theme.id}
            className="block min-h-11 cursor-pointer rounded-xl border border-slate-400 p-3 hover:bg-slate-50">
            <span className="mb-2 flex min-h-11 items-center gap-3 md:min-h-0">
              <input type="radio" name={`${id}-look`} value={theme.id} checked={themeId === theme.id}
                aria-label={theme.name} onClick={() => { if (themeId === theme.id) close(); }} onChange={() => { onChange(theme.id); close(); }}
                className={`h-5 w-5 shrink-0 accent-sky-800 ${focusRing}`} />
              <span className="font-bold">{theme.name}</span>
            </span>
            {/* Visual-only miniature: the radio name and font note describe the option. */}
            {slide && <div aria-hidden="true" ref={element => element?.setAttribute('inert', '')} className="pointer-events-none mb-2 select-none overflow-hidden rounded border border-slate-300">
              <SlideThumbnail slide={slide} index={index} total={total} image={image} originalWriters={originalWriters} theme={theme} />
            </div>}
            <span className="block text-xs text-slate-700">PowerPoint font: {theme.typography.exportFace}</span>
          </label>)}
        </fieldset>
      </div>}
    </div>
  );
}
