/** Shared expected script runs across parser, preview, PowerPoint and Markdown checks. */
export const underscoreChemistryCases = [
  { input: 'CO_2', markdown: 'CO₂', subscripts: ['2'] },
  { input: 'O_2', markdown: 'O₂', subscripts: ['2'] },
  { input: 'H_2O', markdown: 'H₂O', subscripts: ['2'] },
  { input: 'Fe_2O_3', markdown: 'Fe₂O₃', subscripts: ['2', '3'] },
  { input: 'H_2SO_4', markdown: 'H₂SO₄', subscripts: ['2', '4'] },
  { input: 'NH_3', markdown: 'NH₃', subscripts: ['3'] },
  { input: 'Ca_3(PO_4)_2', markdown: 'Ca₃(PO₄)₂', subscripts: ['3', '4', '2'] },
  { input: 'H2SO_4', markdown: 'H₂SO₄', subscripts: ['2', '4'] },
  { input: 'H2O_2', markdown: 'H₂O₂', subscripts: ['2', '2'] },
  { input: 'Fe_2O2_3', markdown: 'Fe₂O₂₃', subscripts: ['2', '2', '3'] },
  { input: 'NaCl_2', markdown: 'NaCl₂', subscripts: ['2'] },
  { input: 'CO_n', markdown: 'CO_n', subscripts: ['n'] },
  { input: 'CO_{12}', markdown: 'CO₁₂', subscripts: ['12'] },
  ...['snake_case_word', 'teacher_name@school.edu', 'a_name@school.edu',
    'x_1@school.edu', 'my_variable_2', 'file_name_final', 'H2O_guide', 'f(x)2', '(a+b)2']
    .map(input => ({ input, markdown: input, subscripts: [] })),
];
