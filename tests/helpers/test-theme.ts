import { vi } from 'vitest';
import { SAYUNA_CLASSIC } from '@/lib/themes/sayuna-classic';
import type { SlideTheme } from '@/lib/themes/types';
import { createThemeRegistry } from '@/lib/themes/registry';

/** Test fixture only: no new font or metrics table. */
export const TEST_THEME = {
  ...SAYUNA_CLASSIC, id: 'test-look', name: 'Test Look',
  palette: { background: 'FFF7ED', primary: '7C2D12', secondary: '9A3412', textDark: '1C1917',
    heading: '292524', muted: '44403C', subtle: '57534E', cardBackground: 'FFEDD5', cardBorder: '9A3412' },
  typography: { exportFace: 'Arial', previewFont: 'Arial, sans-serif', metricsId: 'poppins' },
} satisfies SlideTheme;

/** Substitute the real list-built registry through Vitest's module mock. */
export async function themeModuleWithTestLook() {
  const actual = await vi.importActual<typeof import('@/lib/themes')>('@/lib/themes');
  const registry = createThemeRegistry([SAYUNA_CLASSIC, TEST_THEME] as const, actual.DEFAULT_THEME_ID);
  return { ...actual, THEMES: registry.themes, THEME_IDS: registry.ids,
    DEFAULT_THEME: registry.defaultTheme, getTheme: registry.getTheme, isThemeId: registry.isThemeId };
}
