import { expect, it } from 'vitest';
import type { SlideTheme } from '@/lib/themes';
import { createThemeRegistry } from '@/lib/themes/registry';
import { SAYUNA_CLASSIC } from '@/lib/themes/sayuna-classic';
import { TEST_THEME } from '../../helpers/test-theme';
it('derives ordered IDs, lookups and validation from a replaceable theme list', () => {
  const registry = createThemeRegistry([SAYUNA_CLASSIC, TEST_THEME] as const, SAYUNA_CLASSIC.id);
  expect(registry.ids).toEqual(['sayuna-classic', 'test-look']);
  expect(registry.getTheme('test-look')).toBe(TEST_THEME);
  expect(registry.isThemeId('test-look')).toBe(true);
  expect(registry.isThemeId('toString')).toBe(false);
  expect(registry.getTheme('unknown')).toBe(SAYUNA_CLASSIC);
});
it('refuses a registry whose default is missing', () => {
  const empty: readonly SlideTheme[] = [];
  expect(() => createThemeRegistry(empty, 'missing')).toThrow('Missing default slide theme: missing');
});
