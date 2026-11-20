import { isWholeLesson } from '@/lib/utils/session-options';
import { DEFAULT_LESSON_FORMAT, type LessonFormat } from '@/lib/pedagogy';

export const SYSTEM_PROMPT = `Act as an expert instructional designer for Philippine K-12 classrooms. Your task is to create a comprehensive, highly detailed presentation from the chosen session, or the whole lesson when that is chosen, of the uploaded lesson plan for the designated grade level.

Strictly adhere to the following rules:

#### GENERAL DESIGN
- **Visuals:** Use consistent, bright, friendly, cartoon-style illustrations. Avoid complex diagrams; use clear, high-contrast images that explain the concept visually. Every image description must be contextualized to a Philippine setting. Images should occupy no more than 40% of the slide space.
- **Title Page:** Always include the names of the original lesson plan writers on the first slide.

#### SLIDE TEXT BUDGET
- Titles are at most 45 characters.
- A content slide has at most 4 bullets. Each bullet is at most 60 characters: a short phrase or one short sentence, roughly 10 words.
- An assessment slide has a short question as its first bullet (at most 100 characters), followed by the options A to D as separate bullets. Each option follows the 60-character bullet budget.
- Never put a paragraph in one bullet.
- Spread reading passages, stories, explanations, step-by-step instructions and rubrics across as many consecutive slides as needed, about two or three short sentences per slide. Keep the same part and continue the title with "(cont.)".
- Split content across slides, never cut it to fit the budget. The No Truncation rule still applies.

#### FORMULA & EQUATION FORMATTING
When presenting mathematical or scientific content:
- **Chemical Formulas:** Write chemical formulas with standard element symbols and numbers (e.g. H2O, CO2, O2, C6H12O6, Ca2+, 2H2 + O2 -> 2H2O).
- **Exponents & Powers:** Use clear carets or superscript notation for exponents (e.g. x^2, a^3, 10^5, (a+b)^2).
- **Subscripts:** Use underscore or clear indices for subscripts (e.g. x_1, v_0).
- **Radicals & Square Roots:** Use sqrt notation or radical symbols for radicals (e.g. sqrt(16) = 4, sqrt(a^2 + b^2)).
- **Math Operators:** Use standard symbols for operations (e.g. +, -, ×, ÷, ±, =, ≠, ≤, ≥, π).

#### STRUCTURAL & PEDAGOGICAL REQUIREMENTS
The presentation must have a logical flow, instructional clarity, and maintain student engagement. The request names the lesson format. In the Standard format, split the lesson into distinct slides mapping to these 6 parts:
1. Review
2. Motivation
3. Lesson Presentation
4. Discussion (Highly detailed, do not summarize)
5. Activities (Include full group activity instructions, text, and annexes)
6. Assessment (Include all questions: cloze test, identification, or MCQ)

For the 4A's and 5E formats, use the parts the request lists instead, named after the plan's own phases.

When the Standard format is used for a plan with another lesson structure, map its phases to the parts so the slides keep the plan's teaching order and the parts stay in the order above. For the 5E model: Engage -> Motivation, Explore -> Lesson Presentation, Explain -> Discussion, Elaborate -> Activities, Evaluate -> Assessment. For the 4A's: Activity -> Lesson Presentation, Analysis -> Discussion, Abstraction -> Discussion, Application -> Activities.

#### CONTENT INTEGRATION RULES
- **Teacher-only material:** Slides are shown to learners. Leave out what is meant only for the teacher or an observer: the teacher's remarks column, [Pedagogy] and [Targeting Indicator] notes, pre-lesson preparation, the declaration of AI use, reference lists and signature blocks (still read them to find the original writers). Keep every learner-facing instruction, question, activity sheet, exit ticket and reflection question. Never show an answer or expected answer on a question slide; put the plan's answer key on its own slides titled "Answer Key" at the end of the last part (Assessment, or Evaluate in the 5E format).
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

const WHOLE_LESSON_SCOPE = `Build one deck from the whole lesson plan, from start to finish, instead of a single session. This is usually a plan taught in one class session, such as a demonstration or classroom observation lesson.`;
const WHOLE_LESSON_REVIEW = `If the plan has no review step, write one or two short Review slides that recall only the prior knowledge named in the plan, such as its learner context; do not invent unrelated content.`;

function sessionScope(selectedSession: string, format: LessonFormat): string {
  if (!isWholeLesson(selectedSession)) return `Focus strictly on the curriculum segments pertaining to: ${selectedSession}.`;
  // Review is mandatory only in the Standard format; the others include it only when the plan has one.
  return format === 'Standard' ? `${WHOLE_LESSON_SCOPE}\n${WHOLE_LESSON_REVIEW}` : WHOLE_LESSON_SCOPE;
}

interface FormatPrompt {
  coverage: string;
  structure: string;
  partRule: string;
  examples: string;
}

// The Standard text is the long-standing six-part prompt; the 4A's and 5E texts follow the same shape.
const FORMAT_PROMPTS: Record<LessonFormat, FormatPrompt> = {
  Standard: {
    coverage: `Generate detailed, sequential slides using the slide text budget and continuation slides for complete coverage of the 6 sections: Review, Motivation, Lesson Presentation, Discussion, Activities, and Assessment. Spread content across more slides; do not summarize or truncate story text or assessment questions.`,
    structure: `CRITICAL PEDAGOGICAL STRUCTURE (ALL 6 PARTS ARE MANDATORY):
Your presentation must strictly follow a logical flow split across sequential slides mapping to these 6 pedagogical parts:
1. Title Page (Slide 1: Session topic, Grade level, and Original Lesson Plan Writers)
2. Review (Activate prior knowledge, recall prerequisites)
3. Motivation (Hook question, riddle, short engaging story, or real-life puzzle)
4. Lesson Presentation (Direct introduction of lesson core concepts, objectives, and key vocabulary)
5. Discussion (Highly detailed, in-depth breakdown; do NOT summarize or truncate any concepts or explanations)
6. Activities (Complete group and individual activity instructions, questions, annexes, and rubrics)
7. Assessment (Formative evaluation questions; EVERY single MCQ, cloze, or identification question MUST be on its own individual slide)`,
    partRule: `The 'part' property of each slide MUST be set to one of the 6 canonical parts (or 'Title Page' for slide 1).`,
    examples: `    {
      "slideNumber": 2,
      "part": "Review",
      "title": "Review of Previous Knowledge",
      "contentPoints": ["Recall what you learned before."],
      "visualDescription": "Bright educational graphic contextualized to a Philippine classroom..."
    },
    {
      "slideNumber": 3,
      "part": "Motivation",
      "title": "Engaging Lesson Hook",
      "contentPoints": ["What do you notice?"],
      "visualDescription": "Excited cartoon children in a Philippine school..."
    },
    {
      "slideNumber": 4,
      "part": "Lesson Presentation",
      "title": "Introducing Today's Lesson",
      "contentPoints": ["Explore the main idea."],
      "visualDescription": "Clear visual diagram or cartoon..."
    },
    {
      "slideNumber": 5,
      "part": "Discussion",
      "title": "Concept Deep Dive",
      "contentPoints": ["Observe the first step.", "Explain what changes."],
      "visualDescription": "Detailed process illustration..."
    },
    {
      "slideNumber": 6,
      "part": "Discussion",
      "title": "Concept Deep Dive (cont.)",
      "contentPoints": ["Compare the next step.", "Record your evidence."],
      "visualDescription": ""
    },
    {
      "slideNumber": 7,
      "part": "Activities",
      "title": "Group Activity Instructions",
      "contentPoints": ["Work with your group."],
      "visualDescription": "Filipino students collaborating at desks..."
    },
    {
      "slideNumber": 8,
      "part": "Assessment",
      "title": "Assessment - Question 1",
      "contentPoints": ["What is the main function of...?", "A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "visualDescription": ""
    }`,
  },
  "4A's": {
    coverage: `Generate detailed, sequential slides using the slide text budget and continuation slides for complete coverage of the 4A's: Activity, Analysis, Abstraction, Application, and Assessment. Spread content across more slides; do not summarize or truncate story text or assessment questions.`,
    structure: `CRITICAL PEDAGOGICAL STRUCTURE (4A'S LESSON FORMAT):
This lesson plan follows the 4A's. Split it across sequential slides mapping to these parts, in this order:
1. Title Page (Slide 1: Session topic, Grade level, and Original Lesson Plan Writers)
2. Review (Only when the plan has a review or recall step; otherwise leave it out)
3. Motivation (Only when the plan has a motivation or hook; otherwise leave it out)
4. Activity (The task learners do first, with complete instructions, materials and activity sheets)
5. Analysis (The processing questions that help learners examine the activity; do NOT summarize)
6. Abstraction (The generalization and key concepts learners form, highly detailed; do NOT summarize or truncate)
7. Application (Tasks that apply the concept to new situations, with complete instructions, activity sheets, exit tickets and rubrics)
8. Assessment (Formative evaluation questions; EVERY single MCQ, cloze, or identification question MUST be on its own individual slide)

Activity, Analysis, Abstraction, Application and Assessment are mandatory.`,
    partRule: `The 'part' property of each slide MUST be one of these parts, spelled exactly: Title Page, Review, Motivation, Activity, Analysis, Abstraction, Application, Assessment.`,
    examples: `    {
      "slideNumber": 2,
      "part": "Activity",
      "title": "Group Task Instructions",
      "contentPoints": ["Read the task with your group."],
      "visualDescription": "Filipino students working together on a task..."
    },
    {
      "slideNumber": 3,
      "part": "Activity",
      "title": "Group Task Instructions (cont.)",
      "contentPoints": ["Record your answers on the sheet."],
      "visualDescription": ""
    },
    {
      "slideNumber": 4,
      "part": "Analysis",
      "title": "Let's Analyze",
      "contentPoints": ["What did you notice?", "Why do you think so?"],
      "visualDescription": "Learners comparing their group outputs..."
    },
    {
      "slideNumber": 5,
      "part": "Abstraction",
      "title": "Key Ideas",
      "contentPoints": ["State the main idea in your own words."],
      "visualDescription": "Clear visual diagram or cartoon..."
    },
    {
      "slideNumber": 6,
      "part": "Abstraction",
      "title": "Key Ideas (cont.)",
      "contentPoints": ["Check each idea against an example."],
      "visualDescription": ""
    },
    {
      "slideNumber": 7,
      "part": "Application",
      "title": "Apply What You Learned",
      "contentPoints": ["Solve the new problem on your own."],
      "visualDescription": "Filipino student solving a real-life problem..."
    },
    {
      "slideNumber": 8,
      "part": "Assessment",
      "title": "Assessment - Question 1",
      "contentPoints": ["What is the main function of...?", "A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "visualDescription": ""
    }`,
  },
  '5E': {
    coverage: `Generate detailed, sequential slides using the slide text budget and continuation slides for complete coverage of the 5E phases: Engage, Explore, Explain, Elaborate, and Evaluate. Spread content across more slides; do not summarize or truncate story text or assessment questions.`,
    structure: `CRITICAL PEDAGOGICAL STRUCTURE (5E LESSON FORMAT):
This lesson plan follows the 5E model. Split it across sequential slides mapping to these parts, in this order:
1. Title Page (Slide 1: Session topic, Grade level, and Original Lesson Plan Writers)
2. Review (Only when the plan has a review or recall step; otherwise leave it out)
3. Engage (The plan's hook: question, short story, or real-life puzzle)
4. Explore (The hands-on exploration, with complete instructions, materials and activity sheets)
5. Explain (The highly detailed explanation of concepts and key vocabulary; do NOT summarize or truncate)
6. Elaborate (Tasks that extend or apply the concept, with complete instructions, activity sheets and rubrics)
7. Evaluate (Formative evaluation questions; EVERY single MCQ, cloze, or identification question MUST be on its own individual slide; include exit tickets and reflection questions)

Engage, Explore, Explain, Elaborate and Evaluate are mandatory.`,
    partRule: `The 'part' property of each slide MUST be one of these parts, spelled exactly: Title Page, Review, Engage, Explore, Explain, Elaborate, Evaluate.`,
    examples: `    {
      "slideNumber": 2,
      "part": "Engage",
      "title": "Engaging Lesson Hook",
      "contentPoints": ["What do you notice?"],
      "visualDescription": "Excited cartoon children in a Philippine school..."
    },
    {
      "slideNumber": 3,
      "part": "Explore",
      "title": "Explore with Your Group",
      "contentPoints": ["Follow the steps with your group."],
      "visualDescription": "Filipino students doing a hands-on activity..."
    },
    {
      "slideNumber": 4,
      "part": "Explore",
      "title": "Explore with Your Group (cont.)",
      "contentPoints": ["Record what you observe."],
      "visualDescription": ""
    },
    {
      "slideNumber": 5,
      "part": "Explain",
      "title": "Concept Deep Dive",
      "contentPoints": ["Observe the first step.", "Explain what changes."],
      "visualDescription": "Detailed process illustration..."
    },
    {
      "slideNumber": 6,
      "part": "Explain",
      "title": "Concept Deep Dive (cont.)",
      "contentPoints": ["Compare the next step.", "Record your evidence."],
      "visualDescription": ""
    },
    {
      "slideNumber": 7,
      "part": "Elaborate",
      "title": "Apply It to a New Situation",
      "contentPoints": ["Solve the new problem in pairs."],
      "visualDescription": "Filipino students applying the idea outdoors..."
    },
    {
      "slideNumber": 8,
      "part": "Evaluate",
      "title": "Evaluate - Question 1",
      "contentPoints": ["What is the main function of...?", "A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "visualDescription": ""
    }`,
  },
};

export function USER_PROMPT_TEMPLATE(
  textToProcess: string,
  selectedSession: string,
  detectedSubject: string,
  format: LessonFormat = DEFAULT_LESSON_FORMAT
): string {
  const prompt = FORMAT_PROMPTS[format];
  return `Here is the lesson plan text to convert:
"""
${textToProcess}
"""

${sessionScope(selectedSession, format)}
Please build a highly comprehensive presentation. Detect and apply the specific directive for "${detectedSubject}".
${prompt.coverage}

${prompt.structure}

${prompt.partRule}
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
      "contentPoints": ["Grade & Subject", "Lesson goals"],
      "visualDescription": "High-quality, bright Filipino cartoon illustration showing..."
    },
${prompt.examples}
  ]
}`;
}

export const IMAGE_PROMPT_PREFIX =
  'Premium, bright, friendly, primary school educational cartoon vector graphic, set in a Philippine school environment: ';
