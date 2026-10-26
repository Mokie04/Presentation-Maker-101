// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { EditableSlideView } from '@/components/workspace/EditableSlideView';
import { CHALKBOARD } from '@/lib/themes/chalkboard';
import type { SlideTheme } from '@/lib/themes';
import { TEST_DECORATION_THEME, decorationSlides } from '../helpers/test-decorations';
afterEach(cleanup);
function Harness({ theme = TEST_DECORATION_THEME }: { theme?: SlideTheme }) {
  const [slide, setSlide] = useState(decorationSlides[1]);
  return <EditableSlideView slide={slide} index={1} total={3} theme={theme}
    onTitleChange={title => setSlide(s => ({ ...s, title }))}
    onPointChange={(index, text) => setSlide(s => ({ ...s, contentPoints: s.contentPoints.map((p, i) => i === index ? text : p) }))}
    onPointInsert={() => {}} onPointDelete={() => {}} onPointAdd={() => {}} />;
}
it.each([TEST_DECORATION_THEME, CHALKBOARD])('keeps $name title and bullet editing interactive and both SVG layers passive', theme => {
  const { container } = render(<Harness theme={theme} />);
  expect(container.querySelectorAll('[data-decoration-layer]')).toHaveLength(2);
  for (const svg of Array.from(container.querySelectorAll<SVGElement>('svg'))) expect(svg.style.pointerEvents).toBe('none');
  fireEvent.click(screen.getByRole('button', { name: 'Edit slide title' }));
  const title = screen.getByRole('textbox', { name: 'Edit slide title' });
  expect(document.activeElement).toBe(title);
  fireEvent.change(title, { target: { value: 'Edited title' } }); fireEvent.keyDown(title, { key: 'Enter' });
  expect(screen.getByRole('heading').textContent).toBe('Edited title');
  fireEvent.click(screen.getByRole('button', { name: 'Edit bullet 1' }));
  const bullet = screen.getByRole('textbox', { name: 'Edit bullet 1' });
  expect(document.activeElement).toBe(bullet);
  fireEvent.change(bullet, { target: { value: 'Edited bullet' } }); fireEvent.blur(bullet);
  expect(screen.getByRole('button', { name: 'Edit bullet 1' }).textContent).toBe('Edited bullet');
});
