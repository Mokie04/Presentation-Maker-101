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

Existing assertion corrections: `pptx-title-formulas` now expects H_2O to subscript only 2 (O stays plain) and updates that content-slide XML hash; its plain-text title hash is unchanged. `EditableSlideView` now preserves CO_2 literally because CO is not a single-letter variable, then verifies editing to CO2 restores chemical subscripting. No parser unit assertions were removed or changed.

RED: 29 newly added regressions failed against the original parser (28 unit, one component). Review added four failing identifier regressions and two failing email regressions before their fixes. A narrow email-token guard preserves underscores in `a_name@school.edu` and `x_1@school.edu`; valid `x_1+x_2` and `H_2O` still format correctly. GREEN: 76 parser, preview, editing and PPTX characterization checks pass on Node 22; typecheck and scoped lint pass.
