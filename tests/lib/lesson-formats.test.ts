import { describe, expect, it } from 'vitest';
import {
  detectLessonFormat, lessonFormatParts, normalizePart, numberedParts, partLabel, partOrdinal, partWantsAutoImage,
} from '@/lib/pedagogy';
import { getPartBadgeInfo } from '@/components/part-badge';

describe('detectLessonFormat', () => {
  it.each([
    ['ACTIVITY (10 minutes) ANALYSIS (15 minutes) ABSTRACTION (10 minutes) APPLICATION (10 minutes)', "4A's"],
    ['[Pedagogy: 4As Approach with Constructivist Alignment]', "4A's"],
    ["Uses the 4A's method", "4A's"],
    ['Engage (10 minutes) Explore (20 minutes) Explain (15 minutes) Elaborate (10 minutes) Evaluate (5 minutes)', '5E'],
    ['[Pedagogy: 5Es Inquiry-Based Learning]', '5E'],
    ['A. Reviewing previous lesson B. Establishing a purpose ... H. Making generalizations and abstractions about the lesson. Group activity. Analysis of results. Finding practical applications.', 'Standard'],
    ['Explain the water cycle, then evaluate your answer and explore the map.', 'Standard'],
    ['', 'Standard'],
    ['Answer item 4\nAs a group, discuss the graph.', 'Standard'],
    ['Look at Figure 4 As shown, the bars differ.', 'Standard'],
    ['Grade 5 English: explain your answer.', 'Standard'],
    ['Uses the 4A’s approach', "4A's"],
    ["Follows the 4 A's", "4A's"],
    ["A 5 E's lesson", '5E'],
    ['Engage. Explore. Explain. Elaborate. Evaluate. Remark: adapted from the 4As used last quarter.', '5E'],
    ['Engage (10 min)\nExplore (20 min) Group activity and analysis of data\nExplain the abstraction\nElaborate: application\nEvaluate', '5E'],
    ['We engage, explore, explain, elaborate and evaluate through an activity, analysis, abstraction and application.', 'Standard'],
    ['[Pedagogy: 4As] We engage, explore, explain, elaborate and evaluate through an activity, analysis, abstraction and application.', "4A's"],
  ])('reads %j as %s', (text, format) => {
    expect(detectLessonFormat(text)).toBe(format);
  });
});

describe('format parts and badges', () => {
  it('lists each format in teaching order', () => {
    expect(lessonFormatParts("4A's")).toEqual(['Title Page', 'Review', 'Motivation', 'Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment']);
    expect(lessonFormatParts('5E')).toEqual(['Title Page', 'Review', 'Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate']);
    expect(numberedParts('Standard')).toEqual(['Review', 'Motivation', 'Lesson Presentation', 'Discussion', 'Activities', 'Assessment']);
  });

  it("numbers the 4A's 1 to 4 and Assessment 5, leaving optional parts unnumbered", () => {
    expect(['Activity', 'Analysis', 'Abstraction', 'Application', 'Assessment', 'Review', 'Title Page'].map(part => partLabel(part, "4A's")))
      .toEqual(['1. ACTIVITY', '2. ANALYSIS', '3. ABSTRACTION', '4. APPLICATION', '5. ASSESSMENT', 'REVIEW', 'TITLE PAGE']);
  });

  it('numbers the 5E phases 1 to 5', () => {
    expect(['Engage', 'Explore', 'Explain', 'Elaborate', 'Evaluate'].map(part => partOrdinal(part, '5E'))).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps Standard behaviour by default', () => {
    expect(normalizePart('Activity')).toBe('Activities');
    expect(partLabel('Activities')).toBe('5. ACTIVITIES');
    expect(normalizePart('Activity', "4A's")).toBe('Activity');
  });

  it('gives every format part a coloured badge', () => {
    expect(lessonFormatParts("4A's").map(part => getPartBadgeInfo(part, "4A's").bg)).toEqual(
      ['bg-indigo-600', 'bg-amber-700', 'bg-emerald-700', 'bg-purple-600', 'bg-cyan-700', 'bg-sky-700', 'bg-teal-700', 'bg-rose-600']);
    expect(lessonFormatParts('5E').map(part => getPartBadgeInfo(part, '5E').bg)).toEqual(
      ['bg-indigo-600', 'bg-amber-700', 'bg-emerald-700', 'bg-purple-600', 'bg-cyan-700', 'bg-teal-700', 'bg-rose-600']);
    expect(getPartBadgeInfo('Application', "4A's")).toEqual({ bg: 'bg-teal-700', label: '4. APPLICATION' });
    expect(getPartBadgeInfo('Elaborate', '5E')).toEqual({ bg: 'bg-teal-700', label: '4. ELABORATE' });
  });

  it('asks for automatic images on the teaching parts of each format', () => {
    expect(lessonFormatParts("4A's").filter(part => partWantsAutoImage(part, "4A's"))).toEqual(['Motivation', 'Activity', 'Abstraction']);
    expect(lessonFormatParts('5E').filter(part => partWantsAutoImage(part, '5E'))).toEqual(['Engage', 'Explore', 'Explain']);
    expect(partWantsAutoImage('Activity')).toBe(false);
  });
});
