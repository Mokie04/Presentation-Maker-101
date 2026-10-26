# Formula export integrity evidence

Date: 2026-10-26. Before uses the parser from main; after uses the working branch. Each preview column is actual server-rendered FormattedFormula HTML with wrapper spans removed. Every PPTX column was extracted from actual generated slide XML and matched the corresponding preview column exactly, including sub/sup placement, for all 33 cases. Markdown comes from buildPresentationMarkdown. `<sub>` and `<sup>` below show native script formatting, not literal teacher text.

| Input | Before preview / PPTX | After preview / PPTX | Before Markdown | After Markdown |
|---|---|---|---|---|
| `3x^2-4x+1` | `3x<sup>2-4x+1</sup>` | `3x<sup>2</sup>-4x+1` | `3x²⁻⁴ˣ⁺¹` | `3x²-4x+1` |
| `x^n` | `x<sup>n</sup>` | `x<sup>n</sup>` | `xⁿ` | `xⁿ` |
| `a^3` | `a<sup>3</sup>` | `a<sup>3</sup>` | `a³` | `a³` |
| `10^5` | `10<sup>5</sup>` | `10<sup>5</sup>` | `10⁵` | `10⁵` |
| `(a+b)^2` | `(a+b)<sup>2</sup>` | `(a+b)<sup>2</sup>` | `(a+b)²` | `(a+b)²` |
| `x_1+x_2` | `x<sub>1+x</sub><sub>2</sub>` | `x<sub>1</sub>+x<sub>2</sub>` | `x₁₊ₓ₂` | `x₁+x₂` |
| `v_0` | `v<sub>0</sub>` | `v<sub>0</sub>` | `v₀` | `v₀` |
| `a_n` | `a<sub>n</sub>` | `a<sub>n</sub>` | `an` | `a_n` |
| `snake_case_word` | `snake<sub>case</sub><sub>word</sub>` | `snake_case_word` | `snakecₐsₑwₒrd` | `snake_case_word` |
| `teacher_name@school.edu` | `teacher<sub>name</sub>@school.edu` | `teacher_name@school.edu` | `teachernₐmₑ@school.edu` | `teacher_name@school.edu` |
| `Wi-Fi` | `WiFi` | `Wi-Fi` | `WiFi` | `Wi-Fi` |
| `X-Ray` | `XRa` | `X-Ray` | `XRa` | `X-Ray` |
| `COVID-19` | `COVID<sub>19</sub>` | `COVID-19` | `COVID₁₉` | `COVID-19` |
| `B-52` | `B<sub>52</sub>` | `B-52` | `B₅₂` | `B-52` |
| `R2-D2` | `R<sub>2</sub>D<sub>2</sub>` | `R2-D2` | `R₂D₂` | `R2-D2` |
| `MP3` | `MP<sub>3</sub>` | `MP3` | `MP₃` | `MP3` |
| `Q1` | `Q<sub>1</sub>` | `Q1` | `Q₁` | `Q1` |
| `H2O` | `H<sub>2</sub>O` | `H<sub>2</sub>O` | `H₂O` | `H₂O` |
| `CO2` | `CO<sub>2</sub>` | `CO<sub>2</sub>` | `CO₂` | `CO₂` |
| `C6H12O6` | `C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>` | `C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>` | `C₆H₁₂O₆` | `C₆H₁₂O₆` |
| `Ca2+` | `Ca<sup>2+</sup>` | `Ca<sup>2+</sup>` | `Ca²⁺` | `Ca²⁺` |
| `2H2 + O2 -> 2H2O` | `2H<sub>2</sub> + O<sub>2</sub> → 2H<sub>2</sub>O` | `2H<sub>2</sub> + O<sub>2</sub> → 2H<sub>2</sub>O` | `2H₂ + O₂ → 2H₂O` | `2H₂ + O₂ → 2H₂O` |
| `sqrt(16)` | `√(16)` | `√(16)` | `√16` | `√16` |
| `x^{10}` | `x<sup>10</sup>` | `x<sup>10</sup>` | `x¹⁰` | `x¹⁰` |
| `a_{n+1}` | `a<sub>n+1</sub>` | `a<sub>n+1</sub>` | `an₊₁` | `a_{n+1}` |
| `A pen costs $5 and a book $10.` | `A pen costs 5 and a book 10.` | `A pen costs $5 and a book $10.` | `A pen costs 5 and a book 10.` | `A pen costs $5 and a book $10.` |
| `$1,000` | `$1,000` | `$1,000` | `$1,000` | `$1,000` |
| `$5.50` | `$5.50` | `$5.50` | `$5.50` | `$5.50` |
| `x^k` | `x<sup>k</sup>` | `x<sup>k</sup>` | `xk` | `x^k` |
| `H2O@example.com` | `H<sub>2</sub>O@example.com` | `H2O@example.com` | `H₂O@example.com` | `H2O@example.com` |
| `H2O_guide` | `H<sub>2</sub>O<sub>guide</sub>` | `H2O_guide` | `H₂Oguidₑ` | `H2O_guide` |
| `H2O.example` | `H<sub>2</sub>O.example` | `H2O.example` | `H₂O.example` | `H2O.example` |
| `guide.H2O` | `guide.H<sub>2</sub>O` | `guide.H2O` | `guide.H₂O` | `guide.H2O` |

The requested strict identity invariant conflicts with the explicitly preserved `->` / `-->` arrow and `sqrt(...)` radical normalization. These remain documented syntax exceptions; existing tests still verify them. The deterministic 2,000-sample property test uses letters, digits, hyphens, @, dots and spaces, excludes only those normalization patterns by construction, and includes whitespace-only input. All concatenated segment text equals its original input.

Existing assertion corrections: `pptx-title-formulas` now expects H_2O to subscript only 2 (O stays plain) and updates that content-slide XML hash; its plain-text title hash is unchanged. `EditableSlideView` again uses its original assertion: typing CO_2 produces a subscript 2 and heading text CO2. The follow-up below restores whitelist-based chemistry without changing those original assertions. No parser unit assertions were removed or changed.

RED: 29 newly added regressions failed against the original parser (28 unit, one component). Review added four failing identifier regressions and two failing email regressions before their fixes. A narrow email-token guard preserves underscores in `a_name@school.edu` and `x_1@school.edu`; valid `x_1+x_2` and `H_2O` still format correctly. GREEN: 76 parser, preview, editing and PPTX characterization checks pass on Node 22; typecheck and scoped lint pass.

## Underscore chemistry follow-up

Before is commit 23d1493; after is this follow-up. This table adds actual preview,
PPTX title-run and Markdown captures for 22 cases. Preview and PPTX script placement
match exactly in every before/after case. Single-letter variables, digit bases,
closing brackets and email guards retain their existing rules. Chemical prefixes
also accept the same underscore payloads when their elements validate against the
existing whitelist. Existing counts in a chemical prefix remain subscripted too.
Multi-letter word suffixes such as H2O_guide stay literal.

| Input | Before preview / PPTX | After preview / PPTX | Before Markdown | After Markdown |
|---|---|---|---|---|
| `CO_2` | `CO_2` | `CO<sub>2</sub>` | `CO_2` | `CO₂` |
| `O_2` | `O<sub>2</sub>` | `O<sub>2</sub>` | `O₂` | `O₂` |
| `H_2O` | `H<sub>2</sub>O` | `H<sub>2</sub>O` | `H₂O` | `H₂O` |
| `Fe_2O_3` | `Fe_2O_3` | `Fe<sub>2</sub>O<sub>3</sub>` | `Fe_2O_3` | `Fe₂O₃` |
| `H_2SO_4` | `H<sub>2</sub>SO_4` | `H<sub>2</sub>SO<sub>4</sub>` | `H₂SO_4` | `H₂SO₄` |
| `NH_3` | `NH_3` | `NH<sub>3</sub>` | `NH_3` | `NH₃` |
| `Ca_3(PO_4)_2` | `Ca_3(PO_4)<sub>2</sub>` | `Ca<sub>3</sub>(PO<sub>4</sub>)<sub>2</sub>` | `Ca_3(PO_4)₂` | `Ca₃(PO₄)₂` |
| `H2SO_4` | `H2SO_4` | `H<sub>2</sub>SO<sub>4</sub>` | `H2SO_4` | `H₂SO₄` |
| `H2O_2` | `H2O_2` | `H<sub>2</sub>O<sub>2</sub>` | `H2O_2` | `H₂O₂` |
| `Fe_2O2_3` | `Fe_2O2<sub>3</sub>` | `Fe<sub>2</sub>O<sub>2</sub><sub>3</sub>` | `Fe_2O2₃` | `Fe₂O₂₃` |
| `NaCl_2` | `NaCl_2` | `NaCl<sub>2</sub>` | `NaCl_2` | `NaCl₂` |
| `CO_n` | `CO_n` | `CO<sub>n</sub>` | `CO_n` | `CO_n` |
| `CO_{12}` | `CO_{12}` | `CO<sub>12</sub>` | `CO_{12}` | `CO₁₂` |
| `snake_case_word` | `snake_case_word` | `snake_case_word` | `snake_case_word` | `snake_case_word` |
| `teacher_name@school.edu` | `teacher_name@school.edu` | `teacher_name@school.edu` | `teacher_name@school.edu` | `teacher_name@school.edu` |
| `a_name@school.edu` | `a_name@school.edu` | `a_name@school.edu` | `a_name@school.edu` | `a_name@school.edu` |
| `x_1@school.edu` | `x_1@school.edu` | `x_1@school.edu` | `x_1@school.edu` | `x_1@school.edu` |
| `my_variable_2` | `my_variable_2` | `my_variable_2` | `my_variable_2` | `my_variable_2` |
| `file_name_final` | `file_name_final` | `file_name_final` | `file_name_final` | `file_name_final` |
| `H2O_guide` | `H2O_guide` | `H2O_guide` | `H2O_guide` | `H2O_guide` |
| `f(x)2` | `f(x)2` | `f(x)2` | `f(x)2` | `f(x)2` |
| `(a+b)2` | `(a+b)2` | `(a+b)2` | `(a+b)2` | `(a+b)2` |

The second deterministic property test verifies 2,000 generated identifiers made
from lowercase words of at least three letters joined by underscores. Their
segment text and Markdown equal the original input. The original 2,000-sample
ordinary-text property test still passes.

The original EditableSlideView assertions are restored exactly: CO_2 produces a
subscript 2 and heading text CO2. The prior CO_2-literal assertions and extra CO2
edit are removed. All other existing tests and snapshots remain unchanged.

The pptx-title-formulas content XML SHA-256 remains
06b51c7ce4a7bd02fef556d9ebc35b407d5bcd510cdffb9ae2cdcf136b602aa2.
Its fixture uses H_2O, whose bounded subscript 2 and plain O were already correct;
this follow-up does not change that XML. The plain-title hash is also unchanged.

Optional plain-digit parenthesized groups (Al2(SO4)3, Ca(OH)2, (NH4)2SO4) are not
added in this focused fix: conservative whole-formula group parsing requires a
broader grammar change. The required explicit Ca_3(PO_4)_2 notation is supported,
and f(x)2 and (a+b)2 remain literal.

Regression evidence: ten initial new/restored checks failed before implementation;
a further H2SO_4 parser/cross-render pair caught prefix-count loss and passed after
the prefix runs were retained. Final focused parser, editing, PPTX characterization
and cross-render coverage passes 94 checks across four files.

Raw before/after captures and RED/GREEN logs are retained in the local [follow-up evidence](</Users/johnnavarro/.codex/visualizations/2026/10/26/01a1788d-44c3-74e1-aae2-ce4264fb5cee/export-integrity/underscore-chemistry/underscore-chemistry-evidence.json>).

Follow-up final gates: Node 22.23.4 and Node 26.3.0 each pass standalone
`tsc --noEmit`, lint without warnings/errors, the full suite (166 files / 1,723
tests), and `next build`. The docs-paths guard passes in both full runs. No
snapshots change. Independent review reports no remaining actionable findings.
