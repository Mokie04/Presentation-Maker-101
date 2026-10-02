// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadSection } from '@/components/UploadSection';

describe('UploadSection component', () => {
  it('renders upload area and controls', () => {
    render(
      <UploadSection
        extractedText=""
        fileName=""
        onUploadSuccess={vi.fn()}
        selectedSession=""
        onSessionChange={vi.fn()}
        onGenerate={vi.fn()}
        isLoading={false}
        loadingStage=""
      />
    );

    expect(screen.getByText(/Drag & Drop Lesson Plan Document/i)).toBeTruthy();
    expect(screen.getByText(/Paste Lesson Plan Text/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Generate Slides/i })).toBeTruthy();
  });

  it('toggles manual text entry and enables Generate button when text and session are provided', () => {
    const handleGenerate = vi.fn();
    const handleSessionChange = vi.fn();
    const handleUploadSuccess = vi.fn();

    const { rerender } = render(
      <UploadSection
        extractedText=""
        fileName=""
        onUploadSuccess={handleUploadSuccess}
        selectedSession=""
        onSessionChange={handleSessionChange}
        onGenerate={handleGenerate}
        isLoading={false}
        loadingStage=""
      />
    );

    const generateBtn = screen.getByRole('button', { name: /Generate Slides/i }) as HTMLButtonElement;
    expect(generateBtn.disabled).toBe(true);

    // Toggle paste manual text
    const pasteToggleBtn = screen.getByText(/Paste Lesson Plan Text/i);
    fireEvent.click(pasteToggleBtn);

    const textarea = screen.getByPlaceholderText(/Paste raw lesson plan content here/i);
    fireEvent.change(textarea, { target: { value: 'Sample Grade 4 Science Lesson Plan' } });
    expect(handleUploadSuccess).toHaveBeenCalledWith('Sample Grade 4 Science Lesson Plan', 'Pasted Lesson Plan');

    // Select session
    const select = screen.getByLabelText(/Select Session/i) || screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Session 1' } });
    expect(handleSessionChange).toHaveBeenCalledWith('Session 1');

    // Rerender with active text and session
    rerender(
      <UploadSection
        extractedText="Sample Grade 4 Science Lesson Plan"
        fileName="Pasted Lesson Plan"
        onUploadSuccess={handleUploadSuccess}
        selectedSession="Session 1"
        onSessionChange={handleSessionChange}
        onGenerate={handleGenerate}
        isLoading={false}
        loadingStage=""
      />
    );

    const updatedGenerateBtn = screen.getByRole('button', { name: /Generate Slides/i }) as HTMLButtonElement;
    expect(updatedGenerateBtn.disabled).toBe(false);

    fireEvent.click(updatedGenerateBtn);
    expect(handleGenerate).toHaveBeenCalledWith(
      'Sample Grade 4 Science Lesson Plan',
      'Session 1'
    );
  });

  it('displays loading indicator and stage text when isLoading is true', () => {
    render(
      <UploadSection
        extractedText="Lesson plan"
        fileName="lesson.docx"
        onUploadSuccess={vi.fn()}
        selectedSession="Session 1"
        onSessionChange={vi.fn()}
        onGenerate={vi.fn()}
        isLoading={true}
        loadingStage="AI Architecting 25+ Comprehensive Slides..."
      />
    );

    expect(screen.getByText(/AI Architecting 25\+ Comprehensive Slides\.\.\./i)).toBeTruthy();
  });
});
