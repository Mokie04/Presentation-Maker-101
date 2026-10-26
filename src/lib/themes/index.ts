import { SAYUNA_CLASSIC } from './sayuna-classic';
import type { SlideTheme } from './types';

export type { SlideTheme } from './types';
export const DEFAULT_THEME_ID = 'sayuna-classic';
export const THEME_IDS = ['sayuna-classic'] as const;
export type ThemeId = typeof THEME_IDS[number];
const themes: Record<ThemeId, SlideTheme> = { 'sayuna-classic': SAYUNA_CLASSIC };
export const DEFAULT_THEME = themes[DEFAULT_THEME_ID];

export function isThemeId(id: unknown): id is ThemeId {
  return typeof id === 'string' && THEME_IDS.some(themeId => themeId === id);
}

/** Rendering fallback; callers validating user input should use isThemeId. */
export function getTheme(id?: string): SlideTheme {
  return isThemeId(id) ? themes[id] : DEFAULT_THEME;
}
