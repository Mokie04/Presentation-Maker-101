import { DEFAULT_THEME_ID, isThemeId } from './index';

export const THEME_PREFERENCE_KEY = 'sayuna:look';

/** Browser convenience only: never overwrite an active lesson from storage events. */
export function readThemePreference(): string {
  try {
    const id = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    return isThemeId(id) ? id : DEFAULT_THEME_ID;
  } catch {
    // Includes server rendering, disabled storage and privacy-mode failures.
    return DEFAULT_THEME_ID;
  }
}

export function rememberThemePreference(id: string): void {
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, id);
  } catch {
    // Storage is optional; the active lesson's look still changes.
  }
}
