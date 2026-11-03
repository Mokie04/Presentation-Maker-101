// The local verification scripts use packages that are deliberately not project
// dependencies (Playwright and its browser) or only arrive through the test runner (vite).
// These loaders stop with an install hint instead of a module-resolution stack trace.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const missing = (error) => error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND';

function stop(specifier, install, error) {
  console.error(`This tool needs ${specifier}, which is not installed here.\nInstall ${install} to use this tool.\n(${error.message.split('\n')[0]})`);
  process.exit(1);
}

/** Imports an ES module or exits with an install hint. */
export async function importTool(specifier, install) {
  try {
    return await import(specifier);
  } catch (error) {
    if (missing(error)) stop(specifier, install, error);
    throw error;
  }
}

/** Requires a CommonJS package (or an absolute path to one) or exits with an install hint. */
export function requireTool(specifier, install) {
  try {
    return require(specifier);
  } catch (error) {
    if (missing(error)) stop(specifier, install, error);
    throw error;
  }
}

export const VITE_HINT = 'vite and @vitejs/plugin-react (both arrive with `npm ci`)';
export const PLAYWRIGHT_HINT = 'Playwright and a Chromium build outside the project (for example `npm install --no-save playwright && npx playwright install chromium`), or set PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE to existing installations';
