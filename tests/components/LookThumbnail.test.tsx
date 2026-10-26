// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SlideThumbnail } from '@/components/workspace/SlideThumbnail';
import { DEFAULT_THEME } from '@/lib/themes';
import { TEST_THEME } from '../helpers/test-theme';
import type { SlideViewProps } from '@/components/SlideView';
const { views } = vi.hoisted(() => ({ views: vi.fn() }));
vi.mock('@/components/SlideView', () => ({ SlideView: (props: SlideViewProps) => { views(props); return <span>{props.slide.title}</span>; } }));
afterEach(() => { cleanup(); views.mockClear(); });
it('rerenders on theme reference changes while skipping unrelated parent rerenders', () => {
  const props = { slide: { slideNumber: 1, title: 'Water', part: 'Discussion', contentPoints: ['Observe'], visualDescription: '' }, index: 1, total: 2 };
  const { rerender } = render(<SlideThumbnail {...props} theme={DEFAULT_THEME} />);
  views.mockClear();
  rerender(<SlideThumbnail {...props} slide={{ ...props.slide }} theme={DEFAULT_THEME} />);
  expect(views).not.toHaveBeenCalled();
  rerender(<SlideThumbnail {...props} theme={TEST_THEME} />);
  expect(views).toHaveBeenCalledOnce();
  expect(views.mock.calls[0][0].theme).toBe(TEST_THEME);
});
