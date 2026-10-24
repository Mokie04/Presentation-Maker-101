// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { SlideStage } from '@/components/workspace/SlideStage';

afterEach(cleanup);
it('shows the selected real SlideView with its image and writers', () => {
  const { rerender } = render(<SlideStage slide={{ slideNumber: 2, part: 'Discussion', title: 'Leaves',
    contentPoints: ['Make food'], visualDescription: 'A leaf' }} index={1} total={8} image="leaf-image" originalWriters="Teacher" />);
  const stage = screen.getByRole('region', { name: 'Slide stage' });
  expect(stage.tabIndex).toBe(0);
  expect(within(stage).getByRole('group', { name: 'Slide 2 of 8' })).toBeTruthy();
  expect(within(stage).getByRole('img').getAttribute('src')).toContain('leaf-image');
  rerender(<SlideStage slide={{ slideNumber: 1, part: 'Title Page', title: 'Plants', contentPoints: [], visualDescription: '' }}
    index={0} total={8} originalWriters="Teacher" />);
  expect(screen.getByText('Original Lesson Plan Writers: Teacher')).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
});
