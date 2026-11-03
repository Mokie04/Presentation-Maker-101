import { describe, expect, it } from 'vitest';
import { copyleftViolations, declaredLicense, productionPackages } from '../../scripts/licenses.mjs';

// Dual-licensed production packages used under their permissive choice. Each entry pins the
// exact expression, so a release that drops the permissive option fails this test.
const allowlist = new Map([
  ['jszip', '(MIT OR GPL-3.0-or-later)'], // Used under MIT.
]);

describe('production dependency licences', () => {
  const packages = productionPackages();

  it('finds the production set from the lockfile', () => {
    expect(packages.map((item) => item.name)).toEqual(expect.arrayContaining(['next', 'react', 'pptxgenjs', 'jszip']));
    expect(packages.some((item) => item.name === 'vitest')).toBe(false);
  });

  it('has no production dependency licensed only under GPL, AGPL or LGPL', () => {
    const offenders = copyleftViolations(packages, allowlist).map((item) => `${item.name}@${item.version}: ${item.license}`);
    expect(offenders, 'Copyleft-only production dependency; replace it or record a permissive dual licence').toEqual([]);
  });

  it('declares a licence for every production dependency', () => {
    expect(packages.filter((item) => item.license === 'UNKNOWN').map((item) => item.name)).toEqual([]);
  });

  it('keeps every allowlist entry in use', () => {
    for (const [name, license] of Array.from(allowlist)) {
      expect(packages.find((item) => item.name === name)?.license, name).toBe(license);
    }
  });
});

describe('licence checker self-test', () => {
  const fake = (name: string, license: string) => ({ name, version: '1.0.0', license, optional: false, installed: true });

  it.each([
    ['GPL-3.0-only'],
    ['AGPL-3.0-or-later'],
    ['LGPL-2.1-only'],
    ['(GPL-2.0-only OR GPL-3.0-only)'],
    ['(MIT AND GPL-3.0-only)'],
  ])('reports %s', (license) => {
    expect(copyleftViolations([fake('bad', license)], allowlist)).toHaveLength(1);
  });

  it('reports a permissive dual licence that is not allowlisted', () => {
    expect(copyleftViolations([fake('other', '(MIT OR GPL-3.0-or-later)')], allowlist)).toHaveLength(1);
  });

  it('reports an allowlisted package whose expression changed', () => {
    expect(copyleftViolations([fake('jszip', 'GPL-3.0-or-later')], allowlist)).toHaveLength(1);
  });

  it('accepts permissive licences and the pinned dual licence', () => {
    expect(copyleftViolations([fake('a', 'MIT'), fake('b', 'Apache-2.0'), fake('jszip', '(MIT OR GPL-3.0-or-later)')], allowlist)).toEqual([]);
  });

  it('reads the deprecated licenses array', () => {
    expect(declaredLicense({ licenses: [{ type: 'MIT', url: 'x' }] })).toBe('MIT');
    expect(declaredLicense({ licenses: [{ type: 'MIT' }, { type: 'GPL-2.0-only' }] })).toBe('(MIT OR GPL-2.0-only)');
  });
});
