// Records SHA-256 and size for every file under src/app/fonts in MANIFEST.json.
// Usage: node scripts/font-manifest.mjs  (rewrite after a deliberate font change)
// tests/lib/font-manifest.test.ts fails when a file changes without this manifest.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const fontsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/app/fonts');
export const manifestName = 'MANIFEST.json';

/** @returns {Record<string, { bytes: number, sha256: string }>} keyed by path relative to src/app/fonts */
export function describeFonts(directory = fontsDirectory) {
  /** @type {Record<string, { bytes: number, sha256: string }>} */
  const files = {};
  const walk = (folder) => {
    for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const name = path.relative(directory, file).split(path.sep).join('/');
      if (name === manifestName || entry.name === '.DS_Store') continue;
      const data = readFileSync(file);
      files[name] = { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
    }
  };
  walk(directory);
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(path.join(fontsDirectory, manifestName), `${JSON.stringify(describeFonts(), null, 2)}\n`);
}
