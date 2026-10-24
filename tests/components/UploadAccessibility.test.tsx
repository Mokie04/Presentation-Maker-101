// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UploadSection } from '@/components/UploadSection';

afterEach(cleanup);
it('offers a named keyboard upload control and a manual-paste disclosure', () => {
  const { container } = render(<UploadSection extractedText="" fileName="" onUploadSuccess={vi.fn()} selectedSession="" onSessionChange={vi.fn()} onGenerate={vi.fn()} isLoading={false} loadingStage="" />);
  const file = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const browse = vi.spyOn(file, 'click');
  const upload = screen.getByRole('button', { name: 'Choose lesson plan document' }); upload.focus();
  fireEvent.keyDown(upload, { key: 'Enter' }); fireEvent.keyDown(upload, { key: ' ' }); expect(browse).toHaveBeenCalledTimes(2);
  const paste = screen.getByRole('button', { name: 'Paste Lesson Plan Text' });
  expect(paste.getAttribute('aria-expanded')).toBe('false'); fireEvent.click(paste);
  expect(paste.getAttribute('aria-expanded')).toBe('true');
  expect(document.getElementById(paste.getAttribute('aria-controls')!)).toContain(screen.getByRole('textbox', { name: 'Paste Lesson Plan Content' }));
});
