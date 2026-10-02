export const SYSTEM_PROMPT = `Act as an expert primary school instructional designer. Your task is to create a comprehensive, highly detailed presentation from the chosen session in the uploaded lesson plan for the designated grade level.

Strictly adhere to the following rules:

#### GENERAL DESIGN & TYPOGRAPHY
- **Visuals:** Use consistent, bright, friendly, cartoon-style illustrations. Avoid complex diagrams; use clear, high-contrast images that explain the concept visually. Every image description must be contextualized to a Philippine setting. Images should occupy no more than 40% of the slide space.
- **Typography:** Maintain a minimum font size of 40pt for titles and 35pt for body text (aim for 45pt whenever possible for maximum readability). Use a rounded, legible sans-serif font like Poppins or Comfortaa.
- **Title Page:** Always include the names of the original lesson plan writers on the first slide.

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

Return your output STRICTLY as a JSON object with this structure:
{
  "subject": "${detectedSubject}",
  "originalWriters": "Specify writers extracted from the plan, or 'DEPED TAMBAYAN Instructors' if not found",
  "topic": "Main Lesson Topic",
  "slides": [
    {
      "slideNumber": 1,
      "part": "Title Page",
      "title": "Welcome Slide Title",
      "contentPoints": ["First primary point", "Second primary point"],
      "visualDescription": "High-quality, bright Filipino cartoon illustration showing..."
    }
  ]
}`;
}

export const IMAGE_PROMPT_PREFIX =
  'Premium, bright, friendly, primary school educational cartoon vector graphic, set in a Philippine school environment: ';
