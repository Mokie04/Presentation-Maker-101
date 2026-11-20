# ADR 0033: Lesson formats (Standard, 4A's, 5E)

Date: 2026-11-20
Status: Accepted

## Context

Every deck used the six Standard parts of a Daily Lesson Log: Review, Motivation, Lesson Presentation, Discussion, Activities and Assessment. Classroom observation plans often follow the 4A's (Activity, Analysis, Abstraction, Application) or the 5E model (Engage, Explore, Explain, Elaborate, Evaluate). An observer checks that those phases are visible, but the deck relabelled them as Standard parts and the prompt asked for a Review and a Motivation the plan did not have. Part canonicalization also mapped "Activity" to "Activities", so a 4A's name could not survive generation or export.

## Decision

`src/lib/pedagogy.ts` defines three lesson formats. Each has its parts in teaching order, its numbered parts, the parts it includes only when the plan has them, and its own keyword rules:

- Standard: Review 1 to Assessment 6, unchanged.
- 4A's: Activity 1, Analysis 2, Abstraction 3, Application 4, Assessment 5; Review and Motivation are optional and unnumbered.
- 5E: Engage 1, Explore 2, Explain 3, Elaborate 4, Evaluate 5; Review is optional and unnumbered.

`detectLessonFormat` picks 4A's or 5E when the plan uses every phase name of it; failing that, when it names the approach as one token ("4As", "4A's", "5Es"), so "item 4" followed by "As" is not a match; and Standard otherwise. Phase names come first so a passing mention of another approach does not win. The setup screen has a Lesson format dropdown beside Subject; Automatic shows what it would use and sends nothing, so the generate route detects it, as it does for the subject. A teacher's choice is sent and reused for other sessions of the lesson.

The route records the format on the deck (`PresentationData.lessonFormat`). The prompt lists the format's parts and examples; the Standard prompt text is unchanged. Model parts are canonicalized by the deck's format after validation, not in the shared slide schema, so exports keep parts as the deck has them. Badges, the slide panel's part list, the sorter, the slideshow, the generating panel, automatic images and the part of a new slide all read the deck's format, defaulting to Standard for decks without one.

## Consequences

4A's and 5E decks show their own phase names and numbers, and their exported PPTX keeps them. Colours are keyed by part name and reuse the Standard palette by role. Automatic images go to Activity and Abstraction (4A's) and Engage, Explore and Explain (5E), plus Motivation where a plan has one. The legacy batch image route accepts an optional `lessonFormat` and uses the Standard rules without one. Badge colours are typed by the union of all format parts, so a part without a colour does not compile.

Detection is keyword-based, so a Standard plan that uses all five 5E verbs could read as 5E; the teacher can choose another format. The new prompt texts have not been checked against the production text model.
