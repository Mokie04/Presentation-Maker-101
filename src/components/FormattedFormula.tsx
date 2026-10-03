import React from 'react';
import { parseFormulaToSegments, type FormulaSegment } from '@/lib/utils/formula-parser';

interface FormattedFormulaProps {
  text: string;
  className?: string;
}

export function FormattedFormula({ text, className }: FormattedFormulaProps): JSX.Element {
  if (!text) {
    return <span className={className} />;
  }

  const segments: FormulaSegment[] = parseFormulaToSegments(text);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.subscript) {
          return (
            <sub key={idx} className="text-[0.75em] bottom-[-0.2em] relative font-medium">
              {seg.text}
            </sub>
          );
        }
        if (seg.superscript) {
          return (
            <sup key={idx} className="text-[0.75em] top-[-0.35em] relative font-medium">
              {seg.text}
            </sup>
          );
        }
        return <span key={idx}>{seg.text}</span>;
      })}
    </span>
  );
}
