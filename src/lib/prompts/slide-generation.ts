export const SYSTEM_PROMPT = `Act as an expert primary school instructional designer. Your task is to create a comprehensive, highly detailed presentation from the chosen session in the uploaded lesson plan for the designated grade level.

Strictly adhere to the following rules:

#### GENERAL DESIGN & TYPOGRAPHY
- **Visuals:** Use consistent, bright, friendly, cartoon-style illustrations. Avoid complex diagrams; use clear, high-contrast images that explain the concept visually. Every image description must be contextualized to a Philippine setting. Images should occupy no more than 40% of the slide space.
- **Typography:** Maintain a minimum font size of 40pt for titles and 35pt for body text (aim for 45pt whenever possible for maximum readability). Use a rounded, legible sans-serif font like Poppins or Comfortaa.
- **Title Page:** Always include the names of the original lesson plan writers on the first slide.

#### FORMULA & EQUATION FORMATTING
When presenting mathematical or scientific content:
- **Chemical Formulas:** Write chemical formulas with standard element symbols and numbers (e.g. H2O, CO2, O2, C6H12O6, Ca2+, 2H2 + O2 -> 2H2O).
- **Exponents & Powers:** Use clear carets or superscript notation for exponents (e.g. x^2, a^3, 10^5, (a+b)^2).
- **Subscripts:** Use underscore or clear indices for subscripts (e.g. x_1, v_0).
- **Radicals & Square Roots:** Use sqrt notation or radical symbols for radicals (e.g. sqrt(16) = 4, sqrt(a^2 + b^2)).
- **Math Operators:** Use standard symbols for operations (e.g. +, -, ×, ÷, ±, =, ≠, ≤, ≥, π).

#### STRUCTURAL & PEDAGOGICAL REQUIREMENTS
The presentation must have a logical flow, instructional clarity, and maintain student engagement. You must split the lesson into distinct slides mapping to these 6 parts:
1. Review
2. Motivation
3. Lesson Presentation
4. Discussion (Highly detailed, do not summarize)
5. Activities (Include full group activity instructions, text, and annexes)
6. Assessment (Include all questions: cloze test, identification, or MCQ)

#### CONTENT INTEGRATION RULES
- **No Truncation:** Do not summarize, truncate, or leave out any stories, reading passages, or case studies found in the annexes.
- **Assessment Layout:** Every single formative multiple-choice or identification question must be given its own individual slide.
- **Slide Volume:** The total presentation must be deeply comprehensive. The minimum slide count for the entire presentation must not be less than 25 slides. Map content out across as many sequential slides as necessary.

#### SUBJECT-SPECIFIC PROMPTING DIRECTIVES
Detect the subject of the lesson plan and apply the specific rule:
- **Science:** Include detailed prompts for "step-by-step process illustrations" and "cross-section diagrams" to show internal workings.
- **Mathematics:** Include prompts for "visual manipulatives" (digital blocks, shapes, pie slices) and "large-scale numerical headers" to anchor focus.
- **English/Reading:** Include prompts for "contextual story illustrations" and "high-contrast vocabulary keywords" where the target word is significantly larger than surrounding text.
- **Social Studies/History:** Include prompts for "story-based character profiles" and "illustrated maps" to drive a narrative flow.

You MUST return valid JSON matching the schema. No markdown, no commentary, just the JSON object.`;

export function USER_PROMPT_TEMPLATE(
  textToProcess: string,
  selectedSession: string,
  detectedSubject: string
): string {
  return `Here is the lesson plan text to convert:
"""
${textToProcess}
"""

Focus strictly on the curriculum segments pertaining to: ${selectedSession}.
Please build a highly comprehensive presentation. Detect and apply the specific directive for "${detectedSubject}".
Generate detailed, sequential slides representing the content exhaustively (aiming for highly detailed step-by-step coverage of the 6 sections: Review, Motivation, Lesson Presentation, Discussion, Activities, and Assessment. Do not summarize or truncate any story text or assessment questions).

CRITICAL PEDAGOGICAL STRUCTURE (ALL 6 PARTS ARE MANDATORY):
Your presentation must strictly follow a logical flow split across sequential slides mapping to these 6 pedagogical parts:
1. Title Page (Slide 1: Session topic, Grade level, and Original Lesson Plan Writers)
2. Review (Activate prior knowledge, recall prerequisites)
3. Motivation (Hook question, riddle, short engaging story, or real-life puzzle)
4. Lesson Presentation (Direct introduction of lesson core concepts, objectives, and key vocabulary)
5. Discussion (Highly detailed, in-depth breakdown; do NOT summarize or truncate any concepts or explanations)
6. Activities (Complete group and individual activity instructions, questions, annexes, and rubrics)
7. Assessment (Formative evaluation questions; EVERY single MCQ, cloze, or identification question MUST be on its own individual slide)

The 'part' property of each slide MUST be set to one of the 6 canonical parts (or 'Title Page' for slide 1).
The presentation must be deeply comprehensive with a minimum of 25 slides.

Return your output STRICTLY as a JSON object with this structure:
{
  "subject": "${detectedSubject}",
  "originalWriters": "Specify writers extracted from the plan, or 'JOHN M. NAVARRO' if not found",
  "topic": "Main Lesson Topic",
  "slides": [
    {
      "slideNumber": 1,
      "part": "Title Page",
      "title": "Welcome Slide Title",
      "contentPoints": ["Grade & Subject", "Lesson Overview / Objectives"],
      "visualDescription": "High-quality, bright Filipino cartoon illustration showing..."
    },
    {
      "slideNumber": 2,
      "part": "Review",
      "title": "Review of Previous Knowledge",
      "contentPoints": ["Prerequisite recall question or concept review"],
      "visualDescription": "Bright educational graphic contextualized to a Philippine classroom..."
    },
    {
      "slideNumber": 3,
      "part": "Motivation",
      "title": "Engaging Lesson Hook",
      "contentPoints": ["Interactive hook question or introductory riddle/story"],
      "visualDescription": "Excited cartoon children in a Philippine school..."
    },
    {
      "slideNumber": 4,
      "part": "Lesson Presentation",
      "title": "Introducing Today's Lesson",
      "contentPoints": ["Core lesson concept introduction and learning competencies"],
      "visualDescription": "Clear visual diagram or cartoon..."
    },
    {
      "slideNumber": 5,
      "part": "Discussion",
      "title": "Concept Deep Dive",
      "contentPoints": ["Detailed explanation point 1", "Granular explanation point 2 without summarizing"],
      "visualDescription": "Detailed process illustration..."
    },
    {
      "slideNumber": 6,
      "part": "Activities",
      "title": "Group Activity Instructions",
      "contentPoints": ["Step-by-step group activity instructions and rubrics"],
      "visualDescription": "Filipino students collaborating at desks..."
    },
    {
      "slideNumber": 7,
      "part": "Assessment",
      "title": "Assessment - Question 1",
      "contentPoints": ["What is the main function of...?", "A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "visualDescription": ""
    }
  ]
}`;
}

export const IMAGE_PROMPT_PREFIX =
  'Premium, bright, friendly, primary school educational cartoon vector graphic, set in a Philippine school environment: ';
