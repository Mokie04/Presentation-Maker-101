'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { SlideView, type SlideViewProps } from '@/components/SlideView';
import { CONTENT_LAYOUT, SLIDE_HEIGHT, SLIDE_WIDTH, SLIDE_WIDTH_PT, hasVisual, slideLayoutFor } from '@/lib/slide-theme';
import { InlineText } from './InlineText';

export interface SlideEditingHandlers {
  onTitleChange: (title: string) => void;
  onPointChange: (index: number, text: string) => void;
  onPointInsert: (afterIndex: number) => void;
  onPointDelete: (index: number) => void;
  onPointAdd: () => void;
}

export type EditableSlideViewProps = Omit<SlideViewProps, 'variant' | 'renderTitle' | 'renderPoint'> & SlideEditingHandlers;
type Editing = { kind: 'title' } | { kind: 'point'; index: number } | null;

export function EditableSlideView({ onTitleChange, onPointChange, onPointInsert, onPointDelete, onPointAdd, ...props }: EditableSlideViewProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [session, setSession] = useState(0);
  const titleLayout = slideLayoutFor(props.index) === 'title';
  const wrapper = useRef<HTMLDivElement>(null);
  const restoreLabel = useRef<string | null>(null);
  const finish = () => {
    const field = document.activeElement;
    if (field instanceof HTMLTextAreaElement && wrapper.current?.contains(field)) restoreLabel.current = field.getAttribute('aria-label');
    setEditing(null);
  };
  useLayoutEffect(() => {
    if (editing || !restoreLabel.current) return;
    const trigger = Array.from(wrapper.current?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])
      .find(element => element.getAttribute('aria-label') === restoreLabel.current);
    trigger?.focus({ preventScroll: true });
    restoreLabel.current = null;
  }, [editing]);
  const begin = (next: Editing) => { setSession(value => value + 1); setEditing(next); };
  const start = (next: NonNullable<Editing>) => {
    if (editing?.kind === 'point' && props.slide.contentPoints[editing.index] === '') {
      onPointDelete(editing.index);
      if (next.kind === 'point' && next.index > editing.index) next = { kind: 'point', index: next.index - 1 };
    }
    begin(next);
  };
  return (
    <div ref={wrapper} style={{ position: 'relative', containerType: 'inline-size' }}>
      <SlideView {...props} variant="full"
        renderTitle={title => <InlineText key={editing?.kind === 'title' ? session : 'rest'} label="Edit slide title" value={props.slide.title} editing={editing?.kind === 'title'}
          onStart={() => start({ kind: 'title' })} onChange={onTitleChange} onFinish={finish}>{title}</InlineText>}
        renderPoint={(point, index, editable) => editable ? (
          <span style={{ display: 'inline-block', verticalAlign: 'top', width: titleLayout ? '100%' : 'calc(100% - 2em)' }}>
            <InlineText key={editing?.kind === 'point' && editing.index === index ? session : 'rest'}
              label={`Edit bullet ${index + 1}`} value={props.slide.contentPoints[index]}
              editing={editing?.kind === 'point' && editing.index === index}
              onStart={() => start({ kind: 'point', index })} onChange={text => onPointChange(index, text)} onFinish={finish}
              onInsert={() => { onPointInsert(index); begin({ kind: 'point', index: index + 1 }); }}
              onEmptyBackspace={() => { onPointDelete(index); if (index > 0) begin({ kind: 'point', index: index - 1 }); else { wrapper.current?.closest<HTMLElement>('[aria-label="Slide stage"]')?.focus({ preventScroll: true }); begin(null); } }}
              onEmptyBlur={() => { onPointDelete(index); finish(); }}>{point}</InlineText>
          </span>
        ) : point} />
      {!titleLayout && props.slide.contentPoints.length === 0 && (
        <button type="button" onClick={() => { onPointAdd(); begin({ kind: 'point', index: 0 }); }}
          className="rounded text-left text-slate-600 outline-none hover:ring-1 hover:ring-sky-300 focus-visible:ring-2 focus-visible:ring-sky-700"
          style={{ position: 'absolute', left: `${CONTENT_LAYOUT.bullets.x / SLIDE_WIDTH * 100}%`,
            top: `${CONTENT_LAYOUT.bullets.y / SLIDE_HEIGHT * 100}%`,
            width: hasVisual(props.slide) ? CONTENT_LAYOUT.bulletsWithVisualWidth : CONTENT_LAYOUT.bullets.w,
            fontSize: `${CONTENT_LAYOUT.bullets.fontSize / SLIDE_WIDTH_PT * 100}cqw`, background: 'transparent' }}>
          Click to add a bullet
        </button>
      )}
    </div>
  );
}
