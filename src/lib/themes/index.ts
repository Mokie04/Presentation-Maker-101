import { SAYUNA_CLASSIC } from './sayuna-classic';
import { createThemeRegistry } from './registry';

export type { SlideTheme } from './types';
export const DEFAULT_THEME_ID = 'sayuna-classic';
const registry = createThemeRegistry([SAYUNA_CLASSIC] as const, DEFAULT_THEME_ID);
export const THEMES = registry.themes;
export const THEME_IDS = registry.ids;
export type ThemeId = typeof THEME_IDS[number];
export const DEFAULT_THEME = registry.defaultTheme;
export const isThemeId = registry.isThemeId;
/** Rendering fallback; callers validating user input should use isThemeId. */
export const getTheme = registry.getTheme;
