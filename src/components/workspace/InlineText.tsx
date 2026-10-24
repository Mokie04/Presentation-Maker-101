'use client';

import React, { type ReactNode, useLayoutEffect, useRef } from 'react';

export interface InlineTextProps {
  value: string;
  label: string;
  children: ReactNode;
  editing: boolean;
  onStart: () => void;
  onChange: (value: string) => void;
  onFinish: () => void;
  onInsert?: () => void;
  onEmptyBackspace?: () => void;
  onEmptyBlur?: () => void;
}

export function InlineText({
  value, label, children, editing, onStart, onChange, onFinish,
  onInsert, onEmptyBackspace, onEmptyBlur,
}: InlineTextProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const original = useRef(value);
  const wasEditing = useRef(false);
  const completed = useRef(false);
  const pointerStarted = useRef(false);

  useLayoutEffect(() => {
    const field = textarea.current;
    if (!editing || !field) {
      wasEditing.current = false;
      return;
    }

    const resize = () => {
      field.style.height = '0px';
      const lineHeight = Number.parseFloat(getComputedStyle(field).lineHeight);
      // scrollHeight rounds to whole pixels; preserve fractional line heights.
      const height = lineHeight > 0
        ? Math.max(1, Math.round(field.scrollHeight / lineHeight)) * lineHeight
        : field.scrollHeight;
      field.style.height = height > 0 ? `${height}px` : '1lh';
    };
    resize();

    if (!wasEditing.current) {
      original.current = value;
      completed.current = false;
      field.focus({ preventScroll: true });
      field.setSelectionRange(value.length, value.length);
    }
    wasEditing.current = true;

    if (typeof ResizeObserver === 'undefined') return;
    let width = field.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = field.getBoundingClientRect().width;
      // Changing height also notifies the observer; only width affects wrapping.
      if (nextWidth === width) return;
      width = nextWidth;
      resize();
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [editing, value]);

  if (!editing) {
    return (
      <span role="button" tabIndex={0} aria-label={label}
        className="cursor-text rounded-sm outline-none hover:outline hover:outline-1 hover:outline-sky-400 focus-visible:ring-2 focus-visible:ring-sky-700"
        style={{ display: 'block', boxSizing: 'border-box', width: '100%', minHeight: '1lh', flexShrink: 0 }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          // Start before native blur can remove and reindex the clicked point.
          event.preventDefault();
          pointerStarted.current = true;
          onStart();
        }}
        onClick={(event) => {
          const alreadyStarted = pointerStarted.current && event.detail > 0;
          pointerStarted.current = false;
          if (!alreadyStarted) onStart();
        }} onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onStart();
          }
        }}>
        {children}
      </span>
    );
  }

  return (
    <textarea ref={textarea} aria-label={label} value={value} rows={1}
      className="rounded-sm outline-none focus:ring-2 focus:ring-sky-700"
      style={{
        display: 'block', boxSizing: 'border-box', flexShrink: 0,
        font: 'inherit', color: 'inherit', textAlign: 'inherit', lineHeight: 'inherit',
        whiteSpace: 'inherit', overflowWrap: 'inherit', background: 'transparent',
        border: 0, padding: 0, margin: 0, width: '100%', resize: 'none', overflow: 'hidden',
      }}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (completed.current) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          completed.current = true;
          onChange(original.current);
          onFinish();
        } else if (!event.nativeEvent.isComposing) {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            completed.current = true;
            if (onInsert) onInsert();
            else onFinish();
          } else if (event.key === 'Backspace' && value === '' && onEmptyBackspace) {
            event.preventDefault();
            completed.current = true;
            onEmptyBackspace();
          }
        }
      }}
      onBlur={() => {
        if (completed.current) return;
        completed.current = true;
        if (value === '' && onEmptyBlur) onEmptyBlur();
        else onFinish();
      }}
    />
  );
}
