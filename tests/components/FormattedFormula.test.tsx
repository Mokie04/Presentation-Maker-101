// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormattedFormula } from '@/components/FormattedFormula';

describe('FormattedFormula component', () => {
  it('renders plain text without tags', () => {
    const { container } = render(<FormattedFormula text="Just a regular sentence." />);
    expect(container.textContent).toBe('Just a regular sentence.');
    expect(container.querySelector('sub')).toBeNull();
    expect(container.querySelector('sup')).toBeNull();
  });

  it('renders chemical formulas with <sub> elements', () => {
    const { container } = render(<FormattedFormula text="Water is H2O and Carbon Dioxide is CO2." />);
    const subs = container.querySelectorAll('sub');
    expect(subs.length).toBe(2);
    expect(subs[0].textContent).toBe('2');
    expect(subs[1].textContent).toBe('2');
  });

  it('renders exponents and powers with <sup> elements', () => {
    const { container } = render(<FormattedFormula text="Equation: a^2 + b^2 = c^2" />);
    const sups = container.querySelectorAll('sup');
    expect(sups.length).toBe(3);
    expect(sups[0].textContent).toBe('2');
    expect(sups[1].textContent).toBe('2');
    expect(sups[2].textContent).toBe('2');
  });

  it('renders radical signs and arrows cleanly', () => {
    const { container } = render(<FormattedFormula text="sqrt(16) = 4 and 2H2 + O2 -> 2H2O" />);
    expect(container.textContent).toContain('√(16) = 4');
    expect(container.textContent).toContain('→');
    const subs = container.querySelectorAll('sub');
    expect(subs.length).toBe(3); // 2 in 2H2, 2 in O2, 2 in 2H2O
  });

  it('applies custom className to container', () => {
    const { container } = render(<FormattedFormula text="Test" className="custom-math-class" />);
    expect(container.firstElementChild?.classList.contains('custom-math-class')).toBe(true);
  });
});
