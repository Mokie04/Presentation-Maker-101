// Lists the licence of every production npm package (direct and transitive).
// Usage: node scripts/licenses.mjs [--json]
// Reads package-lock.json for the production set and each installed package.json
// for its licence field; no network access and no dependencies.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COPYLEFT = /\b(?:A?GPL|LGPL)-/i;

/** @typedef {{ name: string, version: string, license: string, optional: boolean, installed: boolean }} ProductionPackage */

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * The licence expression a package declares, including the deprecated `licenses` array.
 * @param {any} manifest
 * @returns {string | undefined}
 */
export function declaredLicense(manifest) {
  if (typeof manifest?.license === 'string') return manifest.license;
  if (manifest?.license?.type) return manifest.license.type;
  if (Array.isArray(manifest?.licenses) && manifest.licenses.length > 0) {
    const types = manifest.licenses.map((item) => (typeof item === 'string' ? item : item.type));
    return types.length === 1 ? types[0] : `(${types.join(' OR ')})`;
  }
  return undefined;
}

/**
 * Every non-dev package in the lockfile with its version, licence and whether it is installed here.
 * @returns {ProductionPackage[]}
 */
export function productionPackages(root = defaultRoot) {
  const lock = readJson(path.join(root, 'package-lock.json'));
  const packages = [];
  for (const [location, entry] of Object.entries(lock.packages)) {
    if (!location || entry.dev || entry.devOptional) continue;
    const manifestFile = path.join(root, location, 'package.json');
    const installed = existsSync(manifestFile);
    const license = (installed ? declaredLicense(readJson(manifestFile)) : undefined) ?? entry.license ?? 'UNKNOWN';
    packages.push({
      name: location.replace(/^.*node_modules\//, ''),
      version: entry.version,
      license,
      optional: Boolean(entry.optional),
      installed,
    });
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Splits a simple SPDX expression into its OR alternatives.
 * @param {string} expression
 */
function licenseAlternatives(expression) {
  return expression.replace(/^\(|\)$/g, '').split(/\s+OR\s+/i).map((part) => part.trim());
}

/**
 * Packages whose licence names GPL, AGPL or LGPL. An allowlisted package passes only
 * while its expression still offers an alternative without a copyleft licence.
 * @param {ProductionPackage[]} packages
 * @param {Map<string, string>} [allowlist] package name to its exact licence expression
 * @returns {ProductionPackage[]}
 */
export function copyleftViolations(packages, allowlist = new Map()) {
  return packages.filter((item) => {
    if (!COPYLEFT.test(item.license)) return false;
    const permissiveChoice = licenseAlternatives(item.license).some((part) => !COPYLEFT.test(part));
    return !(allowlist.get(item.name) === item.license && permissiveChoice);
  });
}

function main() {
  const packages = productionPackages();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(packages, null, 2));
    return;
  }
  const width = Math.max(...packages.map((item) => `${item.name}@${item.version}`.length));
  for (const item of packages) {
    const note = item.installed ? '' : ' (optional, not installed here)';
    console.log(`${`${item.name}@${item.version}`.padEnd(width)}  ${item.license}${note}`);
  }
  const groups = new Map();
  for (const item of packages) groups.set(item.license, (groups.get(item.license) ?? 0) + 1);
  console.log(`\n${packages.length} production packages`);
  for (const [license, count] of Array.from(groups).sort((a, b) => b[1] - a[1])) console.log(`${String(count).padStart(4)}  ${license}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
