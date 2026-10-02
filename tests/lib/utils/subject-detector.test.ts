import { describe, it, expect } from 'vitest';
import { detectSubject } from '@/lib/utils/subject-detector';

describe('detectSubject', () => {
  it('detects Science keywords case-insensitively', () => {
    expect(detectSubject('Today we will conduct a laboratory Experiment on plants.')).toBe('Science');
    expect(detectSubject('BIODIVERSITY in tropical rainforests')).toBe('Science');
    expect(detectSubject('Discovering a new planet in our solar system')).toBe('Science');
    expect(detectSubject('Studying a unicellular organism')).toBe('Science');
    expect(detectSubject('Intro to General Science concepts')).toBe('Science');
  });

  it('detects Mathematics keywords case-insensitively', () => {
    expect(detectSubject('Lesson on equivalent fraction operations')).toBe('Mathematics');
    expect(detectSubject('Basic Math fundamentals')).toBe('Mathematics');
    expect(detectSubject('Multiplication table practice')).toBe('Mathematics');
    expect(detectSubject('Odd and even number recognition')).toBe('Mathematics');
    expect(detectSubject('Two-digit addition with regrouping')).toBe('Mathematics');
  });

  it('detects English/Reading keywords case-insensitively', () => {
    expect(detectSubject('Elementary English grammar guide')).toBe('English/Reading');
    expect(detectSubject('Guided reading comprehension lesson')).toBe('English/Reading');
    expect(detectSubject('Expanding vocabulary through context clues')).toBe('English/Reading');
    expect(detectSubject('Short story analysis and moral lesson')).toBe('English/Reading');
    expect(detectSubject('Identifying the noun in a sentence')).toBe('English/Reading');
    expect(detectSubject('Action verb identification')).toBe('English/Reading');
  });

  it('detects Social Studies/History keywords case-insensitively', () => {
    expect(detectSubject('Elementary Social Studies curriculum')).toBe('Social Studies/History');
    expect(detectSubject('Philippine history during the Spanish era')).toBe('Social Studies/History');
    expect(detectSubject('Mga bayani ng Pilipinas')).toBe('Social Studies/History');
    expect(detectSubject('Araling Panlipunan para sa ika-apat na baitang')).toBe('Social Studies/History');
    expect(detectSubject('Pangunahing aralin sa Sibika at kultura')).toBe('Social Studies/History');
  });

  it('defaults to General Study when no keywords match', () => {
    expect(detectSubject('')).toBe('General Study');
    expect(detectSubject('Physical Education and Health exercise drill')).toBe('General Study');
    expect(detectSubject('Music rhythm and art painting techniques')).toBe('General Study');
  });
});
