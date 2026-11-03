// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SlideRail } from '@/components/workspace/SlideRail';
import { navigateSlides } from '@/components/workspace/slide-navigation';
import { useTestSelection } from '../helpers/selection-harness';
import type { SlideViewProps } from '@/components/SlideView';
import type { SlideData } from '@/types/presentation';

const { views } = vi.hoisted(() => ({ views: vi.fn() }));
vi.mock('@/components/SlideView', () => ({ SlideView: (props: SlideViewProps) => {
  views(props);
  return <div aria-hidden="true">{props.slide.title}</div>;
} }));
const slides: SlideData[] = ['Roots', 'Leaves', 'Flowers'].map((title, i) => ({
  slideNumber: i + 1, title, part: 'Discussion', contentPoints: [title], visualDescription: '',
}));
const ids = [10, 20, 30];
const onSelect = vi.fn();
const scrollIntoView = vi.fn();

beforeEach(() => {
  views.mockClear(); onSelect.mockClear(); scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, 'scrollingElement');
});

function RailKeyboard() {
  const selection = useTestSelection(ids);
  return <div onKeyDown={(event) => navigateSlides(event, selection)}>
    <SlideRail slides={slides} slideIds={ids} selectedId={selection.selectedId} onSelect={selection.selectSlide} total={3} />
    <input aria-label="Other input" />
  </div>;
}

describe('SlideRail', () => {
  it('renders numbered thumbnail options and marks the selected slide', () => {
    render(<SlideRail slides={slides} slideIds={ids} selectedId={20} onSelect={onSelect} total={3} />);
    const list = screen.getByRole('listbox', { name: 'Slides' });
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options.map(option => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(options.map(option => within(option).getByText(/^\d$/).textContent)).toEqual(['1', '2', '3']);
    expect(views.mock.calls.every(([props]) => props.variant === 'thumbnail')).toBe(true);
    expect(list.getAttribute('aria-activedescendant')).toBe(options[1].id);
    fireEvent.click(options[2]);
    expect(onSelect).toHaveBeenCalledWith(30);
    expect(document.activeElement).toBe(list);
  });

  it('scrolls each newly selected option into view', () => {
    const props = { slides, slideIds: ids, onSelect, total: 3 };
    const { rerender } = render(<SlideRail {...props} selectedId={10} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    rerender(<SlideRail {...props} selectedId={30} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(scrollIntoView.mock.contexts[1]).toBe(screen.getAllByRole('option')[2]);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('scrolls the rail without moving the page header out of view', () => {
    Object.defineProperty(document, 'scrollingElement', { configurable: true, value: document.documentElement });
    document.documentElement.scrollTop = 180;
    scrollIntoView.mockImplementation(function (this: HTMLElement) {
      this.closest('[role="listbox"]')!.scrollTop = 300;
      document.documentElement.scrollTop = 500;
    });
    render(<SlideRail slides={slides} slideIds={ids} selectedId={30} onSelect={onSelect} total={3} />);
    expect(screen.getByRole('listbox').scrollTop).toBe(300);
    expect(document.documentElement.scrollTop).toBe(180);
    scrollIntoView.mockReset();
  });

  it.each([
    { keys: ['ArrowDown'], selected: 1 }, { keys: ['PageDown'], selected: 1 },
    { keys: ['End', 'ArrowUp'], selected: 1 }, { keys: ['End', 'PageUp'], selected: 1 },
    { keys: ['End', 'Home'], selected: 0 }, { keys: ['End'], selected: 2 },
  ])('moves through the rail with $keys using the workspace listener', ({ keys, selected }) => {
    render(<RailKeyboard />);
    const list = screen.getByRole('listbox');
    for (const key of keys) fireEvent.keyDown(list, { key });
    expect(screen.getAllByRole('option')[selected].getAttribute('aria-selected')).toBe('true');
  });

  it('does not hijack form-field navigation or browser shortcuts', () => {
    render(<RailKeyboard />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'End' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End', ctrlKey: true });
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true');
  });

  it('rerenders only the changed thumbnail, including stable metadata on another slide', () => {
    const credited = { ...slides[0], imageMetadata: {
      source: 'nasa' as const, nasaId: 'roots', assetUrl: 'https://images-assets.nasa.gov/image/roots/roots.jpg',
      rendition: 'large' as const, mimeType: 'image/jpeg' as const,
    } };
    const props = { slideIds: ids, selectedId: 10, onSelect, total: 3, originalWriters: 'Teacher' };
    const { rerender } = render(<SlideRail {...props} slides={[credited, slides[1], slides[2]]} />);
    views.mockClear();
    rerender(<SlideRail {...props} slides={[{ ...credited }, { ...slides[1], title: 'Edited leaves' }, slides[2]]} />);
    expect(views).toHaveBeenCalledTimes(1);
    expect(views.mock.calls[0][0].slide.title).toBe('Edited leaves');
  });
});

describe('workspace navigation target boundaries', () => {
  const keys = ['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'];
  it.each([
    ['button', <button key="button">Download</button>],
    ['link', <a key="link" href="#download">Download link</a>],
    ['tab', <div key="tab" role="tab" tabIndex={0}>Session tab</div>],
    ['summary', <details key="summary"><summary>Details</summary></details>],
    ['input', <input key="input" aria-label="Title" />],
    ['select', <select key="select" aria-label="Part"><option>Discussion</option></select>],
    ['textarea', <textarea key="textarea" aria-label="Bullet" />],
    ['editable', <div key="editable" contentEditable suppressContentEditableWarning>Editable text</div>],
    ['empty editable', <div key="empty" contentEditable suppressContentEditableWarning>Editable text</div>],
  ])('does not navigate from a %s target', (_name, child) => {
    const selection = { next: vi.fn(), previous: vi.fn(), first: vi.fn(), last: vi.fn() };
    const { container } = render(<div onKeyDown={event => navigateSlides(event, selection)}>{child}</div>);
    const target = container.querySelector('summary') ?? container.firstElementChild!.firstElementChild!;
    if (_name === 'empty editable') target.setAttribute('contenteditable', '');
    for (const key of keys) expect(fireEvent.keyDown(target, { key })).toBe(true);
    for (const action of Object.values(selection)) expect(action).not.toHaveBeenCalled();
  });
  it.each(['workspace', 'stage', 'rail'])('navigates from the %s container', target => {
    const selection = { next: vi.fn(), previous: vi.fn(), first: vi.fn(), last: vi.fn() };
    const { container } = render(<div onKeyDown={event => navigateSlides(event, selection)} tabIndex={0}>
      <section aria-label="Slide stage" tabIndex={0} /><div role="listbox" aria-label="Slides" tabIndex={0} />
    </div>);
    const element = target === 'workspace' ? container.firstElementChild! : target === 'stage' ? screen.getByRole('region') : screen.getByRole('listbox');
    for (const key of keys) expect(fireEvent.keyDown(element, { key })).toBe(false);
    expect(selection.first).toHaveBeenCalledTimes(1); expect(selection.last).toHaveBeenCalledTimes(1);
    expect(selection.next).toHaveBeenCalledTimes(2); expect(selection.previous).toHaveBeenCalledTimes(2);
  });
});
