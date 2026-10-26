import type { SlideTheme } from './types';

/** Build IDs, validation and lookup from the same ordered list. */
export function createThemeRegistry<const T extends readonly SlideTheme[]>(themes: T, defaultId: T[number]['id']) {
  const byId = new Map<string, SlideTheme>(themes.map(theme => [theme.id, theme]));
  const defaultTheme = byId.get(defaultId);
  if (!defaultTheme) throw new Error(`Missing default slide theme: ${defaultId}`);
  const ids = themes.map(theme => theme.id) as { readonly [K in keyof T]: T[K]['id'] };
  function isThemeId(id: unknown): id is T[number]['id'] {
    return typeof id === 'string' && byId.has(id);
  }
  function getTheme(id?: string): SlideTheme {
    return (id === undefined ? undefined : byId.get(id)) ?? defaultTheme!;
  }
  return { themes, ids, defaultTheme, isThemeId, getTheme };
}
