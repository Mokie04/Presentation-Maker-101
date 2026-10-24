// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InlineText } from '@/components/workspace/InlineText';
import { FormattedFormula } from '@/components/FormattedFormula';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function resizeMeasurements() {
  let width = 400;
  let height = 20;
  const observers = new Set<ResizeObserver>();
  const callbacks = new Map<ResizeObserver, ResizeObserverCallback>();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      callbacks.set(this, callback);
    }
    observe() { observers.add(this); }
    unobserve() { observers.delete(this); }
    disconnect() { observers.delete(this); }
  });
  vi.spyOn(HTMLTextAreaElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(0, 0, width, height),
  );
  const reads = vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(() => height);
  return {
    reads,
    resize(nextWidth: number, nextHeight: number) {
      width = nextWidth;
      height = nextHeight;
      observers.forEach((observer) => callbacks.get(observer)?.([], observer));
    },
  };
}

function Harness({ initial = 'H_2O', bullet = false, initiallyEditing = false, deferTransitions = false, events = vi.fn() }: {
  initial?: string;
  bullet?: boolean;
  initiallyEditing?: boolean;
  deferTransitions?: boolean;
  events?: (event: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(initiallyEditing);
  const [deleted, setDeleted] = useState(false);
  const [inserted, setInserted] = useState(0);
  return (
    <>
      {!deleted && <InlineText value={value} label={bullet ? 'Edit bullet 2' : 'Edit slide title'}
        editing={editing} onStart={() => setEditing(true)}
        onChange={(next) => { events(`change:${next}`); setValue(next); }}
        onFinish={() => { events('finish'); if (!deferTransitions) setEditing(false); }}
        onInsert={bullet ? () => { events('insert'); setInserted((count) => count + 1); if (!deferTransitions) setEditing(false); } : undefined}
        onEmptyBackspace={bullet ? () => { events('backspace'); if (!deferTransitions) setDeleted(true); } : undefined}
        onEmptyBlur={bullet ? () => { events('empty-blur'); setDeleted(true); } : undefined}>
        <FormattedFormula text={value} />
      </InlineText>}
      <output aria-label="Stored text">{value}</output>
      <output aria-label="Inserted bullets">{inserted}</output>
      <output aria-label="Deleted">{String(deleted)}</output>
    </>
  );
}

function start(label = 'Edit slide title') {
  fireEvent.click(screen.getByRole('button', { name: label }));
  return screen.getByRole('textbox', { name: label }) as HTMLTextAreaElement;
}

describe('InlineText', () => {
  it('renders a focusable button around the formatted text', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Edit slide title' });
    expect(button.tabIndex).toBe(0);
    expect(button.querySelector('sub')).not.toBeNull();
    expect(button.textContent).toBe('H2O');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('starts with raw text, focuses the textarea and puts the caret at the end', () => {
    render(<Harness />);
    const field = start();
    expect(field.value).toBe('H_2O');
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(4);
    expect(field.selectionEnd).toBe(4);
  });

  it('resizes an open field when its width and inherited font size change', () => {
    const measurements = resizeMeasurements();
    render(<Harness initial="A long bullet that wraps as the available width changes" />);
    const field = start();
    expect(field.style.height).toBe('20px');

    measurements.resize(200, 40);
    expect(field.style.height).toBe('40px');
    field.style.lineHeight = '15.5px';
    measurements.resize(100, 62);
    expect(field.style.height).toBe('62px');
    expect(document.activeElement).toBe(field);
  });

  it('ignores height-only observer notifications after sizing a wrapped field', () => {
    const measurements = resizeMeasurements();
    render(<Harness />);
    const field = start();
    measurements.resize(200, 40);
    expect(field.style.height).toBe('40px');
    const reads = measurements.reads.mock.calls.length;
    measurements.resize(200, 40);
    expect(measurements.reads.mock.calls.length).toBe(reads);
  });

  it('disconnects the width observer when editing ends and when unmounted', () => {
    const measurements = resizeMeasurements();
    const view = render(<Harness />);
    const first = start();
    measurements.resize(200, 40);
    expect(first.style.height).toBe('40px');
    fireEvent.blur(first);
    measurements.resize(100, 60);
    expect(first.style.height).toBe('40px');

    const second = start();
    expect(second.style.height).toBe('60px');
    view.unmount();
    measurements.resize(50, 80);
    expect(second.style.height).toBe('60px');
  });

  it.each(['Enter', ' '])('starts editing with the %s key', (key) => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Edit slide title' });
    expect(fireEvent.keyDown(button, { key })).toBe(false);
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('H_2O');
  });

  it('writes raw changes through its controlled owner', () => {
    render(<Harness />);
    fireEvent.change(start(), { target: { value: 'H_2O and x^2' } });
    expect(screen.getByLabelText('Stored text').textContent).toBe('H_2O and x^2');
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('H_2O and x^2');
  });

  it('finishes a title on Enter without adding a newline', () => {
    const events = vi.fn();
    render(<Harness events={events} />);
    expect(fireEvent.keyDown(start(), { key: 'Enter' })).toBe(false);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByLabelText('Stored text').textContent).toBe('H_2O');
    expect(events.mock.calls).toEqual([['finish']]);
  });

  it('restores the original raw value before finishing on Escape', () => {
    const events = vi.fn();
    render(<Harness events={events} />);
    const field = start();
    fireEvent.change(field, { target: { value: 'Changed' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.getByLabelText('Stored text').textContent).toBe('H_2O');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(events.mock.calls).toEqual([['change:Changed'], ['change:H_2O'], ['finish']]);
  });

  it('captures a new original value for each edit session', () => {
    render(<Harness />);
    const first = start();
    fireEvent.change(first, { target: { value: 'Saved' } });
    fireEvent.blur(first);
    const second = start();
    fireEvent.change(second, { target: { value: 'Cancelled' } });
    fireEvent.keyDown(second, { key: 'Escape' });
    expect(screen.getByLabelText('Stored text').textContent).toBe('Saved');
  });

  it('captures the original value when editing starts under caller control', () => {
    render(<Harness initiallyEditing initial="" bullet />);
    const field = screen.getByRole('textbox');
    fireEvent.change(field, { target: { value: 'New bullet' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.getByLabelText('Stored text').textContent).toBe('');
    expect(screen.getByLabelText('Deleted').textContent).toBe('false');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('finishes on blur and keeps the live change', () => {
    render(<Harness />);
    const field = start();
    fireEvent.change(field, { target: { value: 'Saved on blur' } });
    fireEvent.blur(field);
    expect(screen.getByLabelText('Stored text').textContent).toBe('Saved on blur');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('inserts on bullet Enter without finishing or duplicating on blur', () => {
    const events = vi.fn();
    render(<Harness initial="" bullet events={events} />);
    const field = start('Edit bullet 2');
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(false);
    fireEvent.blur(field);
    expect(screen.getByLabelText('Inserted bullets').textContent).toBe('1');
    expect(screen.getByLabelText('Deleted').textContent).toBe('false');
    expect(events.mock.calls).toEqual([['insert']]);
  });

  it('deletes an empty bullet on Backspace', () => {
    render(<Harness initial="" bullet />);
    expect(fireEvent.keyDown(start('Edit bullet 2'), { key: 'Backspace' })).toBe(false);
    expect(screen.getByLabelText('Deleted').textContent).toBe('true');
  });

  it.each([
    { key: 'Enter', bullet: true, expected: [['insert']] },
    { key: 'Enter', bullet: false, expected: [['finish']] },
    { key: 'Escape', bullet: true, expected: [['change:'], ['finish']] },
    { key: 'Backspace', bullet: true, expected: [['backspace']] },
  ])('ignores blur after $key when the owner defers replacement (bullet: $bullet)', ({ key, bullet, expected }) => {
    const events = vi.fn();
    render(<Harness initial="" bullet={bullet} deferTransitions events={events} />);
    const field = start(bullet ? 'Edit bullet 2' : 'Edit slide title');
    fireEvent.keyDown(field, { key });
    fireEvent.blur(field);
    expect(events.mock.calls).toEqual(expected);
  });

  it('keeps a nonempty bullet on Backspace', () => {
    render(<Harness bullet />);
    expect(fireEvent.keyDown(start('Edit bullet 2'), { key: 'Backspace' })).toBe(true);
    expect(screen.getByLabelText('Deleted').textContent).toBe('false');
    expect(screen.queryByRole('textbox')).not.toBeNull();
  });

  it('deletes a bullet left empty on blur', () => {
    const events = vi.fn();
    render(<Harness bullet events={events} />);
    const field = start('Edit bullet 2');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);
    expect(screen.getByLabelText('Deleted').textContent).toBe('true');
    expect(events.mock.calls).toEqual([['change:'], ['empty-blur']]);
  });

  it('finishes an empty title on blur', () => {
    const events = vi.fn();
    render(<Harness initial="" events={events} />);
    fireEvent.blur(start());
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(events.mock.calls).toEqual([['finish']]);
  });

  it.each(['Enter', 'Backspace'])('ignores %s during IME composition', (key) => {
    const events = vi.fn();
    render(<Harness initial="" bullet events={events} />);
    const field = start('Edit bullet 2');
    expect(fireEvent.keyDown(field, { key, isComposing: true })).toBe(true);
    expect(screen.queryByRole('textbox')).not.toBeNull();
    expect(events).not.toHaveBeenCalled();
  });

  it.each([false, true])('allows Shift+Enter as a natural newline (bullet: %s)', (bullet) => {
    const events = vi.fn();
    render(<Harness bullet={bullet} events={events} />);
    const field = start(bullet ? 'Edit bullet 2' : 'Edit slide title');
    expect(fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })).toBe(true);
    fireEvent.change(field, { target: { value: 'H_2O\nNext line' } });
    expect(screen.getByLabelText('Stored text').textContent).toBe('H_2O\nNext line');
    expect(screen.queryByRole('textbox')).not.toBeNull();
    expect(events.mock.calls).toEqual([['change:H_2O\nNext line']]);
  });
});
